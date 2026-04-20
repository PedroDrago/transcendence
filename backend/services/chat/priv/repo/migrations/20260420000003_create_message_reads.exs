defmodule TranscendenceChat.Repo.Migrations.CreateMessageReads do
  use Ecto.Migration

  def change do
    create table(:message_reads, prefix: "chat") do
      add :message_id, references(:messages, on_delete: :delete_all, prefix: "chat"), null: false
      add :user_id, :uuid, null: false
      add :read_at, :utc_datetime, null: false
    end

    # Cada user só pode marcar uma mensagem como lida uma vez
    create unique_index(:message_reads, [:message_id, :user_id], prefix: "chat")
    create index(:message_reads, [:user_id], prefix: "chat")
  end
end
