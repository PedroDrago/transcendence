defmodule TranscendenceChatWeb.HealthController do
  use TranscendenceChatWeb, :controller

  # GET /health
  # Liveness probe simples para o healthcheck do container/orquestrador.
  def index(conn, _params) do
    json(conn, %{status: "ok"})
  end
end
