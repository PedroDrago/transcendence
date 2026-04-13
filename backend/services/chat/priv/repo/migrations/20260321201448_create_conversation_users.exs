defmodule TranscendenceChat.Repo.Migrations.CreateConversationUsers do
  use Ecto.Migration

  def change do
    create table(:conversation_users, prefix: "chat") do
      add :conversation_id, references(:conversations, on_delete: :delete_all, prefix: "chat")
      add :user_id, :uuid, null: false

      timestamps(type: :utc_datetime)
    end

    create index(:conversation_users, [:conversation_id], prefix: "chat")
    create index(:conversation_users, [:user_id], prefix: "chat")
    create unique_index(:conversation_users, [:conversation_id, :user_id], prefix: "chat")
  end
end
