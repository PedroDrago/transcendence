defmodule TranscendenceChatWeb.LoginController do
  use TranscendenceChatWeb, :controller

  alias TranscendenceChat.Chat

  # A action `/login` foi removida: a identidade do usuário agora vem
  # exclusivamente do JWT validado pelo plug `Authenticate`. Este módulo
  # cuida apenas de conversas e mensagens.

  def create_conversation(conn, %{"recipient_name" => recipient_name}) do
    user_id = conn.assigns.current_user.id

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

  def list_conversations(conn, _params) do
    user_id = conn.assigns.current_user.id
    conversations = Chat.list_user_conversations(user_id)

    json(conn, %{conversations: conversations})
  end

  def list_messages(conn, %{"conversation_id" => conversation_id}) do
    user_id = conn.assigns.current_user.id
    conversation_id = String.to_integer(conversation_id)

    # Confirma que o user autenticado faz parte da conversa — sem isso
    # qualquer usuário logado leria mensagens de qualquer conversa.
    if Chat.user_in_conversation?(user_id, conversation_id) do
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
    else
      conn
      |> put_status(:forbidden)
      |> json(%{error: "forbidden"})
    end
  end
end
