defmodule TranscendenceChatWeb.Plugs.AuthenticateTest do
  use TranscendenceChatWeb.ConnCase

  alias TranscendenceChatWeb.Plugs.Authenticate

  test "assigns current_user from gateway header", %{conn: conn} do
    conn =
      conn
      |> put_req_header("x-user-id", "user-123")
      |> Authenticate.call([])

    assert conn.assigns.current_user == %{id: "user-123"}
  end

  test "rejects requests without gateway user header", %{conn: conn} do
    conn = Authenticate.call(conn, [])

    assert conn.halted
    assert conn.status == 401
  end
end
