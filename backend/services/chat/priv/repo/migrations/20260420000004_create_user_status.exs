defmodule TranscendenceChat.Repo.Migrations.CreateUserStatus do
  use Ecto.Migration

  def change do
    create table(:user_status, primary_key: false, prefix: "chat") do
      # Usa o mesmo UUID do auth.users como PK (não gera um novo)
      add :user_id, :uuid, primary_key: true
      add :last_seen_at, :utc_datetime, null: false
    end
  end
end
