defmodule TranscendenceChat.Chat do
  @moduledoc """
  The Chat context.
  """

  import Ecto.Query, warn: false
  alias TranscendenceChat.Repo

  alias TranscendenceChat.Chat.User
  alias TranscendenceChat.Chat.Conversation
  alias TranscendenceChat.Chat.ConversationUser
  alias TranscendenceChat.Chat.Message
  alias TranscendenceChat.Chat.MessageRead
  alias TranscendenceChat.Chat.UserStatus

  # --- Users (read-only, owned by auth service) ---

  def get_user!(id), do: Repo.get!(User, id)

  def get_user_by_username(username) do
    Repo.get_by(User, username: username)
  end

  # --- Conversations ---

  def get_conversation!(id), do: Repo.get!(Conversation, id)

  def preload_conversation_users(conversation) do
    Repo.preload(conversation, conversation_users: :user)
  end

  def create_conversation(attrs) do
    %Conversation{}
    |> Conversation.changeset(attrs)
    |> Repo.insert()
  end

  def user_in_conversation?(user_id, conversation_id) do
    Repo.exists?(
      from cu in ConversationUser,
        where:
          cu.user_id == ^user_id and
          cu.conversation_id == ^conversation_id
    )
  end

  # Busca ou cria uma conversa direta 1-to-1 entre dois users.
  # Filtra por type == "direct" pra não confundir com grupos que
  # por acaso tenham os mesmos dois membros.
  def get_or_create_conversation(user1_id, user2_id) do
    [first_user_id, second_user_id] = Enum.sort([user1_id, user2_id])

    query =
      from c in Conversation,
        join: cu1 in ConversationUser, on: cu1.conversation_id == c.id,
        join: cu2 in ConversationUser, on: cu2.conversation_id == c.id,
        where:
          c.type == "direct" and
          cu1.user_id == ^first_user_id and
          cu2.user_id == ^second_user_id,
        limit: 1

    case Repo.one(query) do
      nil -> create_conversation_between(first_user_id, second_user_id)
      conversation -> {:ok, conversation}
    end
  end

  defp create_conversation_between(user1_id, user2_id) do
    Repo.transaction(fn ->
      {:ok, conversation} = create_conversation(%{type: "direct"})

      {:ok, _} = create_conversation_user(%{conversation_id: conversation.id, user_id: user1_id})
      {:ok, _} = create_conversation_user(%{conversation_id: conversation.id, user_id: user2_id})

      conversation
    end)
  end

  # --- Group Conversations ---

  # Cria uma conversa de grupo. O criador vira admin, os demais viram member.
  # member_ids é a lista de UUIDs dos outros participantes (sem o criador).
  def create_group_conversation(creator_id, name, member_ids) do
    Repo.transaction(fn ->
      {:ok, conversation} =
        create_conversation(%{type: "group", name: name, created_by: creator_id})

      # Criador entra como admin
      {:ok, _} =
        create_conversation_user(%{
          conversation_id: conversation.id,
          user_id: creator_id,
          role: "admin"
        })

      # Demais membros entram como member
      for member_id <- member_ids do
        {:ok, _} =
          create_conversation_user(%{
            conversation_id: conversation.id,
            user_id: member_id,
            role: "member"
          })
      end

      conversation
    end)
  end

  # Verifica se o user tem role "admin" na conversa
  def user_is_admin?(user_id, conversation_id) do
    Repo.exists?(
      from cu in ConversationUser,
        where:
          cu.user_id == ^user_id and
          cu.conversation_id == ^conversation_id and
          cu.role == "admin"
    )
  end

  def add_group_member(conversation_id, user_id) do
    create_conversation_user(%{
      conversation_id: conversation_id,
      user_id: user_id,
      role: "member"
    })
  end

  def remove_group_member(conversation_id, user_id) do
    from(cu in ConversationUser,
      where: cu.conversation_id == ^conversation_id and cu.user_id == ^user_id
    )
    |> Repo.delete_all()
  end

  def update_group_name(conversation_id, name) do
    get_conversation!(conversation_id)
    |> Conversation.changeset(%{name: name})
    |> Repo.update()
  end

  # Retorna a lista de user_ids numa conversa (útil pra broadcast em grupo)
  def list_conversation_member_ids(conversation_id) do
    from(cu in ConversationUser,
      where: cu.conversation_id == ^conversation_id,
      select: cu.user_id
    )
    |> Repo.all()
  end

  # Lista conversas do user, suportando tanto diretas quanto grupos.
  # Pra diretas: retorna other_user_id/other_user_name como antes.
  # Pra grupos: retorna name do grupo e lista de membros.
  def list_user_conversations(user_id) do
    last_messages_query =
      from(m in Message,
        where:
          m.id in subquery(
            from(m2 in Message,
              group_by: m2.conversation_id,
              select: max(m2.id)
            )
          )
      )

    conversations =
      from(c in Conversation,
        join: cu in ConversationUser,
        on: cu.conversation_id == c.id,
        where: cu.user_id == ^user_id,
        left_join: lm in subquery(last_messages_query),
        on: lm.conversation_id == c.id,
        select: %{
          conversation_id: c.id,
          type: c.type,
          name: c.name,
          last_message: %{
            body: lm.body,
            user_id: lm.user_id,
            inserted_at: lm.inserted_at
          }
        }
      )
      |> Repo.all()

    # Enriquece cada conversa com info de membros
    Enum.map(conversations, fn conv ->
      members =
        from(cu in ConversationUser,
          join: u in User, on: u.id == cu.user_id,
          where: cu.conversation_id == ^conv.conversation_id,
          select: %{user_id: u.id, username: u.username, role: cu.role}
        )
        |> Repo.all()

      case conv.type do
        "direct" ->
          other = Enum.find(members, fn m -> m.user_id != user_id end)

          Map.merge(conv, %{
            other_user_id: other && other.user_id,
            other_user_name: other && other.username,
            members: members
          })

        "group" ->
          Map.put(conv, :members, members)
      end
    end)
  end

  # --- Conversation Users ---

  def create_conversation_user(attrs) do
    %ConversationUser{}
    |> ConversationUser.changeset(attrs)
    |> Repo.insert()
  end

  # --- Messages ---

  def get_message!(id), do: Repo.get!(Message, id)

  def create_message(attrs) do
    %Message{}
    |> Message.changeset(attrs)
    |> Repo.insert()
  end

  def list_messages_for_conversation(conversation_id) do
    from(m in Message,
      where: m.conversation_id == ^conversation_id,
      order_by: [asc: m.inserted_at],
      preload: [:user]
    )
    |> Repo.all()
  end

  # --- Read Receipts ---

  # Marca todas as mensagens não lidas de uma conversa como lidas por um user.
  # Usa INSERT ... ON CONFLICT DO NOTHING pra ser idempotente (se já leu, ignora).
  def mark_messages_read(conversation_id, user_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    # Pega IDs de mensagens que esse user ainda não leu (exclui mensagens do próprio user)
    unread_ids =
      from(m in Message,
        left_join: mr in MessageRead,
        on: mr.message_id == m.id and mr.user_id == ^user_id,
        where:
          m.conversation_id == ^conversation_id and
          m.user_id != ^user_id and
          is_nil(mr.id),
        select: m.id
      )
      |> Repo.all()

    if unread_ids != [] do
      entries =
        Enum.map(unread_ids, fn message_id ->
          %{message_id: message_id, user_id: user_id, read_at: now}
        end)

      Repo.insert_all(MessageRead, entries, on_conflict: :nothing)
    end

    {:ok, length(unread_ids)}
  end

  # Retorna um mapa de message_id => [user_ids que leram]
  def get_read_status(conversation_id) do
    from(mr in MessageRead,
      join: m in Message, on: m.id == mr.message_id,
      where: m.conversation_id == ^conversation_id,
      select: {mr.message_id, mr.user_id}
    )
    |> Repo.all()
    |> Enum.group_by(fn {msg_id, _} -> msg_id end, fn {_, uid} -> uid end)
  end

  # --- User Status (last seen) ---

  # Upsert: se o user já tem registro, atualiza; senão, insere.
  def update_last_seen(user_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    %UserStatus{user_id: user_id, last_seen_at: now}
    |> Repo.insert(
      on_conflict: [set: [last_seen_at: now]],
      conflict_target: :user_id
    )
  end

  def get_last_seen(user_id) do
    case Repo.get(UserStatus, user_id) do
      nil -> nil
      status -> status.last_seen_at
    end
  end
end
