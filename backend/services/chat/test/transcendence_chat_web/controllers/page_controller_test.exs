defmodule TranscendenceChatWeb.PageControllerTest do
  use TranscendenceChatWeb.ConnCase

  test "GET / serves the chat HTML", %{conn: conn} do
    conn = get(conn, ~p"/")
    assert html_response(conn, 200) =~ "Transcendence Chat"
  end
end
