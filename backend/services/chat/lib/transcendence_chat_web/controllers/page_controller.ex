defmodule TranscendenceChatWeb.PageController do
  use TranscendenceChatWeb, :controller

  def home(conn, _params) do
    html = File.read!(Application.app_dir(:transcendence_chat, "priv/static/chat.html"))

    conn
    |> put_resp_content_type("text/html")
    |> send_resp(200, html)
  end
end
