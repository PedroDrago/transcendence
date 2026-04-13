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

  def get_or_create_conversation(user1_id, user2_id) do
    query =
      from c in Conversation,
        join: cu1 in ConversationUser, on: cu1.conversation_id == c.id,
        join: cu2 in ConversationUser, on: cu2.conversation_id == c.id,
        where: cu1.user_id == ^user1_id and cu2.user_id == ^user2_id,
        limit: 1

    case Repo.one(query) do
      nil -> create_conversation_between(user1_id, user2_id)
      conversation -> {:ok, conversation}
    end
  end

  defp create_conversation_between(user1_id, user2_id) do
    Repo.transaction(fn ->
      {:ok, conversation} = create_conversation(%{})

      {:ok, _} = create_conversation_user(%{conversation_id: conversation.id, user_id: user1_id})
      {:ok, _} = create_conversation_user(%{conversation_id: conversation.id, user_id: user2_id})

      conversation
    end)
  end

  def list_user_conversations(user_id) do
    last_messages_query =
      from(m in Message,
        where: m.id in subquery(
          from(m2 in Message,
            group_by: m2.conversation_id,
            select: max(m2.id)
          )
        )
      )

    from(c in Conversation,
      join: cu in ConversationUser,
      on: cu.conversation_id == c.id,
      where: cu.user_id == ^user_id,
      join: other_cu in ConversationUser,
      on: other_cu.conversation_id == c.id and other_cu.user_id != ^user_id,
      join: other_user in assoc(other_cu, :user),
      left_join: lm in subquery(last_messages_query),
      on: lm.conversation_id == c.id,
      select: %{
        conversation_id: c.id,
        other_user_id: other_user.id,
        other_user_name: other_user.username,
        last_message: %{
          body: lm.body,
          user_id: lm.user_id,
          inserted_at: lm.inserted_at
        }
      }
    )
    |> Repo.all()
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
end
