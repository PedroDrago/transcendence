defmodule TranscendenceChatWeb.JWT do
  @moduledoc """
  Verifica JWTs HS256 emitidos pelo auth-service (NestJS).

  O token é assinado com o secret compartilhado via env var `JWT_SECRET`
  (mesma variável usada pelo auth-service). O payload esperado segue o
  formato produzido por `AuthService.login/1` no NestJS:

      %{
        "typ" => "access",
        "sub" => "<user-uuid>",
        "username" => "<username>",
        "email" => "<email>",
        "createdAt" => "<iso-8601>",
        "updatedAt" => "<iso-8601>",
        "usernamePending" => <boolean>,
        "exp" => <unix-ts>,
        "iat" => <unix-ts>
      }
  """

  @doc """
  Valida um token de acesso e retorna `{:ok, claims}` ou `{:error, reason}`.
  """
  def verify(token) when is_binary(token) do
    with {:ok, secret} <- fetch_secret(),
         signer = Joken.Signer.create("HS256", secret),
         {:ok, claims} <- Joken.verify(token, signer),
         :ok <- validate_claims(claims) do
      {:ok, claims}
    end
  end

  def verify(_), do: {:error, :invalid_token}

  defp fetch_secret do
    case System.get_env("JWT_SECRET") do
      nil -> {:error, :missing_jwt_secret}
      "" -> {:error, :missing_jwt_secret}
      secret -> {:ok, secret}
    end
  end

  defp validate_claims(%{"typ" => "access", "sub" => sub, "username" => uname} = claims)
       when is_binary(sub) and is_binary(uname) and sub != "" and uname != "" do
    case Map.get(claims, "exp") do
      nil ->
        # token sem exp — tolerado, mas auth-service sempre envia exp
        :ok

      exp when is_integer(exp) ->
        if exp > System.system_time(:second), do: :ok, else: {:error, :token_expired}

      _ ->
        {:error, :invalid_exp}
    end
  end

  defp validate_claims(_), do: {:error, :invalid_claims}
end
