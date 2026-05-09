defmodule TranscendenceChat.Repo.Migrations.AddGroupFieldsToConversations do
  use Ecto.Migration

  def change do
    alter table(:conversations, prefix: "chat") do
      # "direct" para 1-to-1 (padrão, mantém compatibilidade com dados existentes)
      # "group" para grupos
      add :type, :string, null: false, default: "direct"

      # Nome do grupo (null para conversas diretas)
      add :name, :string

      # Quem criou o grupo (null para conversas diretas)
      add :created_by, :uuid
    end
  end
end
