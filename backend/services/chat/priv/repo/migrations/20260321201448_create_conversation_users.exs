defmodule TranscendenceChat.Repo.Migrations.CreateConversationUsers do
  use Ecto.Migration

  def change do
    create table(:conversation_users) do
      add :conversation_id, references(:conversations, on_delete: :nothing)
      add :user_id, references(:users, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:conversation_users, [:conversation_id])
    create index(:conversation_users, [:user_id])
  end
end
