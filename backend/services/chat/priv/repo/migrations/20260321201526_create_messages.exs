defmodule TranscendenceChat.Repo.Migrations.CreateMessages do
  use Ecto.Migration

  def change do
    create table(:messages, prefix: "chat") do
      add :body, :text
      add :conversation_id, references(:conversations, on_delete: :delete_all, prefix: "chat")
      add :user_id, :uuid, null: false

      timestamps(type: :utc_datetime)
    end

    create index(:messages, [:conversation_id], prefix: "chat")
    create index(:messages, [:user_id], prefix: "chat")
  end
end
