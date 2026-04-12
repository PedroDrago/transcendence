defmodule TranscendenceChatWeb.UserChannel do
  use TranscendenceChatWeb, :channel

  def join("user:" <> user_id, _params, socket) do
    if String.to_integer(user_id) == socket.assigns.user_id do
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end
end
