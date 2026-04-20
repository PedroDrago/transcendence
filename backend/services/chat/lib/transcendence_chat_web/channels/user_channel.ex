defmodule TranscendenceChatWeb.UserChannel do
  use TranscendenceChatWeb, :channel

  alias TranscendenceChatWeb.Presence
  alias TranscendenceChat.Chat

  # Usamos um tópico fixo pra presença — todos os users conectados ficam
  # rastreados no mesmo tópico, assim qualquer um pode consultar quem está online.
  @presence_topic "presence:lobby"

  def join("user:" <> user_id, _params, socket) do
    if user_id == socket.assigns.user_id do
      # send/2 agenda a mensagem pra ser processada logo após o join completar.
      # Não podemos fazer push dentro do join porque o channel ainda não está pronto.
      send(self(), :after_join)
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  # Chamado logo após o join. Faz duas coisas:
  # 1. Envia pro user que acabou de conectar a lista completa de quem está online
  # 2. Faz track do user no Presence (isso automaticamente faz broadcast de
  #    "presence_diff" pra todos que estão escutando o tópico)
  def handle_info(:after_join, socket) do
    # Push da lista atual de presença pro user que entrou
    push(socket, "presence_state", Presence.list(@presence_topic))

    # Registra este user como online. O Presence vai fazer broadcast automático
    # de "presence_diff" pra todos os subscribers do @presence_topic.
    {:ok, _ref} =
      Presence.track(self(), @presence_topic, socket.assigns.user_id, %{
        online_at: System.system_time(:second)
      })

    # Também se inscreve no tópico de presença pra receber diffs de outros users
    TranscendenceChatWeb.Endpoint.subscribe(@presence_topic)

    {:noreply, socket}
  end

  # Quando outro user conecta/desconecta, o PubSub entrega o diff aqui.
  # Repassamos pro frontend via push.
  def handle_info(%{event: "presence_diff", payload: diff}, socket) do
    push(socket, "presence_diff", diff)
    {:noreply, socket}
  end

  # Quando este channel é encerrado (user fechou o browser, perdeu conexão),
  # salvamos o last_seen_at no banco. O Presence automaticamente faz untrack.
  def terminate(_reason, socket) do
    Chat.update_last_seen(socket.assigns.user_id)
    :ok
  end
end
