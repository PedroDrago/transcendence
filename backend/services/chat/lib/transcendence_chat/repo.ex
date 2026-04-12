defmodule TranscendenceChat.Repo do
  use Ecto.Repo,
    otp_app: :transcendence_chat,
    adapter: Ecto.Adapters.SQLite3
end
