defmodule TranscendenceChat.ChatFixtures do
  @moduledoc """
  Test helpers for creating entities via the `TranscendenceChat.Chat` context.
  Users are inserted directly into auth.users since the chat service doesn't own that table.
  """

  alias TranscendenceChat.Repo

  @doc """
  Generate a user directly in auth.users for testing.
  """
  def user_fixture(attrs \\ %{}) do
    username = Map.get(attrs, :username, "user_#{System.unique_integer([:positive])}")

    {:ok, result} =
      Repo.query(
        "INSERT INTO auth.users (id, username, \"passwordHash\", \"createdAt\") VALUES (gen_random_uuid(), $1, 'test_hash', NOW()) RETURNING id, username",
        [username]
      )

    [id, name] = hd(result.rows)
    %TranscendenceChat.Chat.User{id: id, username: name}
  end

  @doc """
  Generate a direct conversation between two users.
  """
  def conversation_fixture(attrs \\ %{}) do
    type = Map.get(attrs, :type, "direct")

    {:ok, conversation} =
      TranscendenceChat.Chat.create_conversation(%{
        type: type,
        name: Map.get(attrs, :name),
        created_by: Map.get(attrs, :created_by)
      })

    conversation
  end

  @doc """
  Generate a group conversation with a creator and members.
  """
  def group_conversation_fixture(attrs \\ %{}) do
    creator = Map.get_lazy(attrs, :creator, fn -> user_fixture() end)
    members = Map.get(attrs, :members, [user_fixture(), user_fixture()])
    name = Map.get(attrs, :name, "Test Group")

    {:ok, conversation} =
      TranscendenceChat.Chat.create_group_conversation(
        creator.id,
        name,
        Enum.map(members, & &1.id)
      )

    %{conversation: conversation, creator: creator, members: members}
  end

  @doc """
  Generate a conversation_user.
  """
  def conversation_user_fixture(attrs \\ %{}) do
    user = Map.get_lazy(attrs, :user_id, fn -> user_fixture().id end)
    conversation = Map.get_lazy(attrs, :conversation_id, fn -> conversation_fixture().id end)

    {:ok, conversation_user} =
      attrs
      |> Enum.into(%{
        user_id: user,
        conversation_id: conversation
      })
      |> TranscendenceChat.Chat.create_conversation_user()

    conversation_user
  end

  @doc """
  Generate a message.
  """
  def message_fixture(attrs \\ %{}) do
    user = Map.get_lazy(attrs, :user_id, fn -> user_fixture().id end)
    conversation = Map.get_lazy(attrs, :conversation_id, fn -> conversation_fixture().id end)

    {:ok, message} =
      attrs
      |> Enum.into(%{
        body: "some body",
        user_id: user,
        conversation_id: conversation
      })
      |> TranscendenceChat.Chat.create_message()

    message
  end
end
