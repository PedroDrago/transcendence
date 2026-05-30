defmodule TranscendenceChatWeb.Plugs.Authenticate do
  @moduledoc """
  Plug que lê a identidade validada pelo API gateway no header `x-user-id`
  e popula `conn.assigns.current_user` com `%{id: ...}`.
  """

  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    case get_req_header(conn, "x-user-id") do
      [user_id | _] when is_binary(user_id) and user_id != "" ->
        assign(conn, :current_user, %{id: user_id})

      _ ->
        unauthorized(conn)
    end
  end

  defp unauthorized(conn) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(401, Jason.encode!(%{error: "unauthorized"}))
    |> halt()
  end
end
