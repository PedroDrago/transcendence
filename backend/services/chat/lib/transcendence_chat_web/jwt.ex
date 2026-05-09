defmodule TranscendenceChatWeb.JWT do
  @moduledoc """
  Decodifica (sem validar) JWTs emitidos pelo auth-service.

  A validação de assinatura/expiração é responsabilidade do API gateway,
  que só encaminha requests já autenticadas para o chat. Aqui apenas
  lemos os claims (`sub`, `username`, etc.) para identificar o usuário.

  **Importante:** este módulo NÃO valida assinatura nem `exp`. Nunca expor
  rotas do chat diretamente para a internet sem o gateway à frente.
  """

  @doc """
  Lê os claims do payload do JWT e retorna `{:ok, claims}` ou `{:error, reason}`.
  Não verifica assinatura nem expiração.
  """
  def peek(token) when is_binary(token) do
    with [_header, payload, _sig] <- String.split(token, "."),
         {:ok, json} <- Base.url_decode64(payload, padding: false),
         {:ok, claims} <- Jason.decode(json) do
      {:ok, claims}
    else
      _ -> {:error, :invalid_token}
    end
  end

  def peek(_), do: {:error, :invalid_token}
end
