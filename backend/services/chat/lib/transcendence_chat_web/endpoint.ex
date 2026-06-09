defmodule TranscendenceChatWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :transcendence_chat

  # WebSocket para chat/presença. A identidade chega via header `x-user-id`
  # encaminhado pelo API gateway (vide UserSocket.connect/3).
  socket "/socket", TranscendenceChatWeb.UserSocket,
    websocket: [connect_info: [:x_headers]],
    longpoll: false

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    plug Phoenix.CodeReloader
    plug Phoenix.Ecto.CheckRepoStatus, otp_app: :transcendence_chat
  end

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  plug TranscendenceChatWeb.Router
end
