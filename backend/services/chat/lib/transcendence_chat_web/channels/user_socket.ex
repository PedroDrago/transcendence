defmodule TranscendenceChatWeb.UserSocket do
  use Phoenix.Socket

  alias TranscendenceChatWeb.JWT

  channel "chat:*", TranscendenceChatWeb.ChatChannel
  channel "user:*", TranscendenceChatWeb.UserChannel

  # O cliente precisa passar `token=<jwt>` como query-param ao conectar
  # no socket (ex.: new Phoenix.Socket("/socket", { params: { token } }).
  # Validamos o JWT e colocamos o user_id em socket.assigns — o valor
  # enviado antes pelo cliente não é mais confiável.
  @impl true
  def connect(%{"token" => token}, socket, _connect_info) when is_binary(token) do
    case JWT.verify(token) do
      {:ok, %{"sub" => user_id} = claims} when is_binary(user_id) ->
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
