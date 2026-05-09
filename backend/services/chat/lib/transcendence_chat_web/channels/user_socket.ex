defmodule TranscendenceChatWeb.UserSocket do
  use Phoenix.Socket

  alias TranscendenceChatWeb.JWT

  channel "chat:*", TranscendenceChatWeb.ChatChannel
  channel "user:*", TranscendenceChatWeb.UserChannel

  # O cliente passa `token=<jwt>` como query-param ao conectar no socket.
  # A validação de assinatura/exp é feita pelo gateway; aqui apenas lemos
  # os claims para extrair `user_id` e `username`.
  @impl true
  def connect(%{"token" => token}, socket, _connect_info) when is_binary(token) do
    case JWT.peek(token) do
      {:ok, %{"sub" => user_id} = claims} when is_binary(user_id) and user_id != "" ->
        socket =
          socket
          |> assign(:user_id, user_id)
          |> assign(:username, Map.get(claims, "username"))

        {:ok, socket}

      _ ->
        :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "users_socket:#{socket.assigns.user_id}"
end
