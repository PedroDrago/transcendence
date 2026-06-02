defmodule TranscendenceChatWeb.UserSocketTest do
  use TranscendenceChatWeb.ChannelCase

  alias TranscendenceChatWeb.UserSocket

  test "connects with gateway user header" do
    socket = socket(UserSocket, "socket-id", %{})

    assert {:ok, socket} =
             UserSocket.connect(%{}, socket, %{x_headers: [{"x-user-id", "user-123"}]})

    assert socket.assigns.user_id == "user-123"
  end

  test "rejects connection without gateway user header" do
    socket = socket(UserSocket, "socket-id", %{})

    assert :error = UserSocket.connect(%{}, socket, %{x_headers: []})
  end
end
