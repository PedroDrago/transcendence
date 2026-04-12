defmodule TranscendenceChatWeb.ChatChannel do
  use TranscendenceChatWeb, :channel

  alias TranscendenceChat.Chat

  def join("chat:" <> conversation_id, _params, socket) do
    if Chat.user_in_conversation?(
         socket.assigns.user_id,
         String.to_integer(conversation_id)
       ) do
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  def handle_in("message", %{"body" => body}, socket) do
    conversation_id = conversation_id(socket)

    {:ok, msg} =
      Chat.create_message(%{
        body: body,
        user_id: socket.assigns.user_id,
        conversation_id: conversation_id
      })

    # Get the other user in the conversation and notify them
    conversation = Chat.get_conversation!(conversation_id) |> Chat.preload_conversation_users()

    other_user =
      conversation.conversation_users
      |> Enum.find(fn cu -> cu.user_id != socket.assigns.user_id end)

    # Notify the other user about new message in this conversation
    if other_user do
      sender = Chat.get_user!(socket.assigns.user_id)

      TranscendenceChatWeb.Endpoint.broadcast(
        "user:#{other_user.user_id}",
        "new_conversation_message",
        %{
          conversation_id: conversation_id,
          sender_id: socket.assigns.user_id,
          sender_name: sender.name,
          body: msg.body
        }
      )
    end

    broadcast(socket, "message", %{
      body: msg.body,
      user_id: msg.user_id
    })

    {:noreply, socket}
  end

  def handle_in("typing", %{"is_typing" => is_typing}, socket) do
    broadcast_from(socket, "typing", %{
      user_id: socket.assigns.user_id,
      is_typing: is_typing
    })

    {:noreply, socket}
  end

  def handle_in("messages_read", _params, socket) do
    broadcast_from(socket, "messages_read", %{
      user_id: socket.assigns.user_id
    })

    {:noreply, socket}
  end

  defp conversation_id(socket) do
    socket.topic
    |> String.replace("chat:", "")
    |> String.to_integer()
  end
end
