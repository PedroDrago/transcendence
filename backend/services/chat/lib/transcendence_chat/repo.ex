defmodule TranscendenceChat.Repo do
  use Ecto.Repo,
    otp_app: :transcendence_chat,
    adapter: Ecto.Adapters.Postgres
end
