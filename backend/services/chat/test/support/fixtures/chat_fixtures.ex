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
  Generate a conversation.
  """
  def conversation_fixture(attrs \\ %{}) do
    {:ok, conversation} =
      attrs
      |> Enum.into(%{})
      |> TranscendenceChat.Chat.create_conversation()

    conversation
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
