defmodule TranscendenceChat.Repo.Migrations.CreateConversations do
  use Ecto.Migration

  def change do
    execute "CREATE SCHEMA IF NOT EXISTS chat", "DROP SCHEMA IF EXISTS chat"

    create table(:conversations, prefix: "chat") do
      timestamps(type: :utc_datetime)
    end
  end
end
