defmodule TranscendenceChat.ChatFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `TranscendenceChat.Chat` context.
  """

  @doc """
  Generate a user.
  """
  def user_fixture(attrs \\ %{}) do
    {:ok, user} =
      attrs
      |> Enum.into(%{
        name: "user_#{System.unique_integer([:positive])}"
      })
      |> TranscendenceChat.Chat.create_user()

    user
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
