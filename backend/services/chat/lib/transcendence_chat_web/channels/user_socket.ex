defmodule TranscendenceChatWeb.UserSocket do
  use Phoenix.Socket

  channel "chat:*", TranscendenceChatWeb.ChatChannel
  channel "user:*", TranscendenceChatWeb.UserChannel

  @impl true
  def connect(_params, socket, %{x_headers: headers}) do
    case List.keyfind(headers, "x-user-id", 0) do
      {"x-user-id", user_id} when is_binary(user_id) and user_id != "" ->
        {:ok, assign(socket, :user_id, user_id)}

      _ ->
        :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "users_socket:#{socket.assigns.user_id}"
end
