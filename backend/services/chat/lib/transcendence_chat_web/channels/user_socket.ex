defmodule TranscendenceChatWeb.UserSocket do
  use Phoenix.Socket

  channel "chat:*", TranscendenceChatWeb.ChatChannel
  channel "user:*", TranscendenceChatWeb.UserChannel

  @impl true
  def connect(%{"user_id" => user_id}, socket, _connect_info) when is_binary(user_id) do
    {:ok, assign(socket, :user_id, user_id)}
  end

  def connect(_params, socket, _connect_info) do
    {:ok, socket}
  end

  @impl true
  def id(_socket), do: nil
end
