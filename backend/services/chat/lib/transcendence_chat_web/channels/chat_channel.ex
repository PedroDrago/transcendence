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

  # Quando um user manda uma mensagem:
  # 1. Salva no banco
  # 2. Notifica cada membro da conversa (exceto o sender) via user channel
  #    — isso faz o badge de "nova mensagem" aparecer na lista de conversas
  # 3. Broadcast pra todos no chat channel — atualiza a tela de chat em tempo real
  def handle_in("message", %{"body" => body}, socket) do
    conversation_id = conversation_id(socket)
    sender_id = socket.assigns.user_id

    {:ok, msg} =
      Chat.create_message(%{
        body: body,
        user_id: sender_id,
        conversation_id: conversation_id
      })

    sender = Chat.get_user!(sender_id)

    # Notifica todos os outros membros via user channel individual
    conversation_id
    |> Chat.list_conversation_member_ids()
    |> Enum.reject(fn uid -> uid == sender_id end)
    |> Enum.each(fn uid ->
      TranscendenceChatWeb.Endpoint.broadcast(
        "user:#{uid}",
        "new_conversation_message",
        %{
          conversation_id: conversation_id,
          sender_id: sender_id,
          sender_name: sender.username,
          body: msg.body
        }
      )
    end)

    broadcast(socket, "message", %{
      body: msg.body,
      user_id: msg.user_id
    })

    {:noreply, socket}
  end

  # Typing indicator — broadcast_from já exclui o sender automaticamente
  def handle_in("typing", %{"is_typing" => is_typing}, socket) do
    broadcast_from(socket, "typing", %{
      user_id: socket.assigns.user_id,
      is_typing: is_typing
    })

    {:noreply, socket}
  end

  # Read receipts com persistência — marca no banco e avisa os outros
  def handle_in("messages_read", _params, socket) do
    conversation_id = conversation_id(socket)
    user_id = socket.assigns.user_id

    Chat.mark_messages_read(conversation_id, user_id)

    broadcast_from(socket, "messages_read", %{
      user_id: user_id
    })

    {:noreply, socket}
  end

  # --- Eventos de gerenciamento de grupo ---

  def handle_in("add_member", %{"user_id" => new_member_id}, socket) do
    conversation_id = conversation_id(socket)
    requester_id = socket.assigns.user_id

    if Chat.user_is_admin?(requester_id, conversation_id) do
      case Chat.add_group_member(conversation_id, new_member_id) do
        {:ok, _} ->
          user = Chat.get_user!(new_member_id)

          broadcast(socket, "member_added", %{
            user_id: new_member_id,
            username: user.username
          })

          {:reply, :ok, socket}

        {:error, _} ->
          {:reply, {:error, %{reason: "could not add member"}}, socket}
      end
    else
      {:reply, {:error, %{reason: "only admins can add members"}}, socket}
    end
  end

  def handle_in("remove_member", %{"user_id" => member_id}, socket) do
    conversation_id = conversation_id(socket)
    requester_id = socket.assigns.user_id

    if Chat.user_is_admin?(requester_id, conversation_id) do
      Chat.remove_group_member(conversation_id, member_id)

      broadcast(socket, "member_removed", %{user_id: member_id})
      {:reply, :ok, socket}
    else
      {:reply, {:error, %{reason: "only admins can remove members"}}, socket}
    end
  end

  def handle_in("update_group", %{"name" => name}, socket) do
    conversation_id = conversation_id(socket)
    requester_id = socket.assigns.user_id

    if Chat.user_is_admin?(requester_id, conversation_id) do
      {:ok, _} = Chat.update_group_name(conversation_id, name)

      broadcast(socket, "group_updated", %{name: name})
      {:reply, :ok, socket}
    else
      {:reply, {:error, %{reason: "only admins can update group"}}, socket}
    end
  end

  defp conversation_id(socket) do
    socket.topic
    |> String.replace("chat:", "")
    |> String.to_integer()
  end
end
