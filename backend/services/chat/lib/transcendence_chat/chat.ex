defmodule TranscendenceChat.Chat do
  @moduledoc """
  The Chat context.
  """

  import Ecto.Query, warn: false
  alias TranscendenceChat.Repo

  alias TranscendenceChat.Chat.User

  @doc """
  Returns the list of users.

  ## Examples

      iex> list_users()
      [%User{}, ...]

  """
  def list_users do
    Repo.all(User)
  end

  @doc """
  Gets a single user.

  Raises `Ecto.NoResultsError` if the User does not exist.

  ## Examples

      iex> get_user!(123)
      %User{}

      iex> get_user!(456)
      ** (Ecto.NoResultsError)

  """
  def get_user!(id), do: Repo.get!(User, id)

  @doc """
  Creates a user.

  ## Examples

      iex> create_user(%{field: value})
      {:ok, %User{}}

      iex> create_user(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_user(attrs) do
    %User{}
    |> User.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a user.

  ## Examples

      iex> update_user(user, %{field: new_value})
      {:ok, %User{}}

      iex> update_user(user, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_user(%User{} = user, attrs) do
    user
    |> User.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a user.

  ## Examples

      iex> delete_user(user)
      {:ok, %User{}}

      iex> delete_user(user)
      {:error, %Ecto.Changeset{}}

  """
  def delete_user(%User{} = user) do
    Repo.delete(user)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking user changes.

  ## Examples

      iex> change_user(user)
      %Ecto.Changeset{data: %User{}}

  """
  def change_user(%User{} = user, attrs \\ %{}) do
    User.changeset(user, attrs)
  end

  alias TranscendenceChat.Chat.Conversation

  @doc """
  Returns the list of conversations.

  ## Examples

      iex> list_conversations()
      [%Conversation{}, ...]

  """
  def list_conversations do
    Repo.all(Conversation)
  end

  @doc """
  Gets a single conversation.

  Raises `Ecto.NoResultsError` if the Conversation does not exist.

  ## Examples

      iex> get_conversation!(123)
      %Conversation{}

      iex> get_conversation!(456)
      ** (Ecto.NoResultsError)

  """
  def get_conversation!(id), do: Repo.get!(Conversation, id)

  @doc """
  Preloads conversation_users with user for a conversation.
  """
  def preload_conversation_users(conversation) do
    Repo.preload(conversation, conversation_users: :user)
  end

  @doc """
  Creates a conversation.

  ## Examples

      iex> create_conversation(%{field: value})
      {:ok, %Conversation{}}

      iex> create_conversation(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_conversation(attrs) do
    %Conversation{}
    |> Conversation.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a conversation.

  ## Examples

      iex> update_conversation(conversation, %{field: new_value})
      {:ok, %Conversation{}}

      iex> update_conversation(conversation, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_conversation(%Conversation{} = conversation, attrs) do
    conversation
    |> Conversation.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a conversation.

  ## Examples

      iex> delete_conversation(conversation)
      {:ok, %Conversation{}}

      iex> delete_conversation(conversation)
      {:error, %Ecto.Changeset{}}

  """
  def delete_conversation(%Conversation{} = conversation) do
    Repo.delete(conversation)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking conversation changes.

  ## Examples

      iex> change_conversation(conversation)
      %Ecto.Changeset{data: %Conversation{}}

  """
  def change_conversation(%Conversation{} = conversation, attrs \\ %{}) do
    Conversation.changeset(conversation, attrs)
  end

  alias TranscendenceChat.Chat.ConversationUser

  @doc """
  Returns the list of conversation_users.

  ## Examples

      iex> list_conversation_users()
      [%ConversationUser{}, ...]

  """
  def list_conversation_users do
    Repo.all(ConversationUser)
  end

  @doc """
  Gets a single conversation_user.

  Raises `Ecto.NoResultsError` if the Conversation user does not exist.

  ## Examples

      iex> get_conversation_user!(123)
      %ConversationUser{}

      iex> get_conversation_user!(456)
      ** (Ecto.NoResultsError)

  """
  def get_conversation_user!(id), do: Repo.get!(ConversationUser, id)

  @doc """
  Creates a conversation_user.

  ## Examples

      iex> create_conversation_user(%{field: value})
      {:ok, %ConversationUser{}}

      iex> create_conversation_user(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_conversation_user(attrs) do
    %ConversationUser{}
    |> ConversationUser.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a conversation_user.

  ## Examples

      iex> update_conversation_user(conversation_user, %{field: new_value})
      {:ok, %ConversationUser{}}

      iex> update_conversation_user(conversation_user, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_conversation_user(%ConversationUser{} = conversation_user, attrs) do
    conversation_user
    |> ConversationUser.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a conversation_user.

  ## Examples

      iex> delete_conversation_user(conversation_user)
      {:ok, %ConversationUser{}}

      iex> delete_conversation_user(conversation_user)
      {:error, %Ecto.Changeset{}}

  """
  def delete_conversation_user(%ConversationUser{} = conversation_user) do
    Repo.delete(conversation_user)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking conversation_user changes.

  ## Examples

      iex> change_conversation_user(conversation_user)
      %Ecto.Changeset{data: %ConversationUser{}}

  """
  def change_conversation_user(%ConversationUser{} = conversation_user, attrs \\ %{}) do
    ConversationUser.changeset(conversation_user, attrs)
  end

  alias TranscendenceChat.Chat.Message

  @doc """
  Returns the list of messages.

  ## Examples

      iex> list_messages()
      [%Message{}, ...]

  """
  def list_messages do
    Repo.all(Message)
  end

  @doc """
  Gets a single message.

  Raises `Ecto.NoResultsError` if the Message does not exist.

  ## Examples

      iex> get_message!(123)
      %Message{}

      iex> get_message!(456)
      ** (Ecto.NoResultsError)

  """
  def get_message!(id), do: Repo.get!(Message, id)

  @doc """
  Creates a message.

  ## Examples

      iex> create_message(%{field: value})
      {:ok, %Message{}}

      iex> create_message(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_message(attrs) do
    %Message{}
    |> Message.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a message.

  ## Examples

      iex> update_message(message, %{field: new_value})
      {:ok, %Message{}}

      iex> update_message(message, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_message(%Message{} = message, attrs) do
    message
    |> Message.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a message.

  ## Examples

      iex> delete_message(message)
      {:ok, %Message{}}

      iex> delete_message(message)
      {:error, %Ecto.Changeset{}}

  """
  def delete_message(%Message{} = message) do
    Repo.delete(message)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking message changes.

  ## Examples

      iex> change_message(message)
      %Ecto.Changeset{data: %Message{}}

  """
  def change_message(%Message{} = message, attrs \\ %{}) do
    Message.changeset(message, attrs)
  end

  @doc """
  Gets a single user by name.

  Returns `nil` if the User does not exist.

  ## Examples

      iex> get_user_by_name("john")
      %User{}

      iex> get_user_by_name("nonexistent")
      nil

  """
  def get_user_by_name(name) do
    Repo.get_by(User, name: name)
  end

  @doc """
  Checks if a user is part of a conversation.
  ## Examples

      iex> user_in_conversation?(1, 1)
      true

      iex> user_in_conversation?(1, 999)
      false

  """
  def user_in_conversation?(user_id, conversation_id) do
    Repo.exists?(
      from cu in ConversationUser,
        where:
          cu.user_id == ^user_id and
          cu.conversation_id == ^conversation_id
    )
  end

  @doc """
  Gets or creates a conversation between two users.
  Returns the conversation.
  """
  def get_or_create_conversation(user1_id, user2_id) do
    # Find existing conversation between these two users
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

  @doc """
  Gets messages for a conversation.
  """
  def list_messages_for_conversation(conversation_id) do
    from(m in Message,
      where: m.conversation_id == ^conversation_id,
      order_by: [asc: m.inserted_at],
      preload: [:user]
    )
    |> Repo.all()
  end

  @doc """
  Lists all conversations for a user with the other participant and last message.
  """
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
        other_user_name: other_user.name,
        last_message: %{
          body: lm.body,
          user_id: lm.user_id,
          inserted_at: lm.inserted_at
        }
      }
    )
    |> Repo.all()
  end
end
