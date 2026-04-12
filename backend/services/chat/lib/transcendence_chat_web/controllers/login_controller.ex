defmodule TranscendenceChatWeb.LoginController do
  use TranscendenceChatWeb, :controller

  alias TranscendenceChat.Chat

  def login(conn, %{"username" => username}) do
    user =
      Chat.get_user_by_name(username) ||
        elem(Chat.create_user(%{name: username}), 1)

    json(conn, %{
      user_id: user.id
    })
  end

  def create_conversation(conn, %{"user_id" => user_id, "recipient_name" => recipient_name}) do
    user_id = to_integer(user_id)

    case Chat.get_user_by_name(recipient_name) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "User not found"})

      recipient ->
        {:ok, conversation} = Chat.get_or_create_conversation(user_id, recipient.id)

        json(conn, %{
          conversation_id: conversation.id,
          recipient_id: recipient.id,
          recipient_name: recipient.name
        })
    end
  end

  def list_conversations(conn, %{"user_id" => user_id}) do
    user_id = to_integer(user_id)
    conversations = Chat.list_user_conversations(user_id)

    json(conn, %{conversations: conversations})
  end

  def list_messages(conn, %{"conversation_id" => conversation_id}) do
    conversation_id = to_integer(conversation_id)
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

  defp to_integer(val) when is_integer(val), do: val
  defp to_integer(val) when is_binary(val), do: String.to_integer(val)
end
