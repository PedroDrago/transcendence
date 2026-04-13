defmodule TranscendenceChatWeb.LoginController do
  use TranscendenceChatWeb, :controller

  alias TranscendenceChat.Chat

  def login(conn, %{"username" => username}) do
    case Chat.get_user_by_username(username) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "User not found"})

      user ->
        json(conn, %{user_id: user.id})
    end
  end

  def create_conversation(conn, %{"user_id" => user_id, "recipient_name" => recipient_name}) do
    case Chat.get_user_by_username(recipient_name) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "User not found"})

      recipient ->
        {:ok, conversation} = Chat.get_or_create_conversation(user_id, recipient.id)

        json(conn, %{
          conversation_id: conversation.id,
          recipient_id: recipient.id,
          recipient_name: recipient.username
        })
    end
  end

  def list_conversations(conn, %{"user_id" => user_id}) do
    conversations = Chat.list_user_conversations(user_id)

    json(conn, %{conversations: conversations})
  end

  def list_messages(conn, %{"conversation_id" => conversation_id}) do
    conversation_id = String.to_integer(conversation_id)
    messages = Chat.list_messages_for_conversation(conversation_id)

    json(conn, %{
      messages:
        Enum.map(messages, fn msg ->
          %{
            body: msg.body,
            user_id: msg.user_id,
            inserted_at: msg.inserted_at
          }
        end)
    })
  end
end
