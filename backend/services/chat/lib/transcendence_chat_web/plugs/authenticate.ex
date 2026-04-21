defmodule TranscendenceChatWeb.Plugs.Authenticate do
  @moduledoc """
  Plug que exige um header `Authorization: Bearer <token>` válido.

  Valida o JWT via `TranscendenceChatWeb.JWT` e, em caso de sucesso,
  popula `conn.assigns.current_user` com `%{id: ..., username: ...}`.
  Em qualquer falha responde `401` e faz `halt`.
  """

  import Plug.Conn

  alias TranscendenceChatWeb.JWT

  def init(opts), do: opts

  def call(conn, _opts) do
    with {:ok, token} <- fetch_token(conn),
         {:ok, claims} <- JWT.verify(token) do
      user = %{
        id: claims["sub"],
        username: claims["username"],
        email: Map.get(claims, "email")
      }

      assign(conn, :current_user, user)
    else
      _ -> unauthorized(conn)
    end
  end

  defp fetch_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] when byte_size(token) > 0 -> {:ok, token}
      ["bearer " <> token] when byte_size(token) > 0 -> {:ok, token}
      _ -> {:error, :missing_token}
    end
  end

  defp unauthorized(conn) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(401, Jason.encode!(%{error: "unauthorized"}))
    |> halt()
  end
end
