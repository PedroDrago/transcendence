defmodule TranscendenceChatWeb.Plugs.Authenticate do
  @moduledoc """
  Plug que lê o JWT do header `Authorization: Bearer <token>` e popula
  `conn.assigns.current_user` com `%{id: ..., username: ...}`.

  **Não valida** assinatura nem expiração do token — isso é feito pelo
  API gateway antes da request chegar aqui. Este plug só rejeita se o
  token estiver ausente/malformado ou sem o claim `sub`.
  """

  import Plug.Conn

  alias TranscendenceChatWeb.JWT

  def init(opts), do: opts

  def call(conn, _opts) do
    with {:ok, token} <- fetch_token(conn),
         {:ok, claims} <- JWT.peek(token),
         %{"sub" => sub} when is_binary(sub) and sub != "" <- claims do
      user = %{
        id: sub,
        username: Map.get(claims, "username"),
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
