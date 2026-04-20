defmodule TranscendenceChat.Repo.Migrations.AddRoleToConversationUsers do
  use Ecto.Migration

  def change do
    alter table(:conversation_users, prefix: "chat") do
      # "member" para participantes comuns, "admin" para quem pode gerenciar o grupo
      # Conversas diretas não usam role, mas fica "member" por padrão
      add :role, :string, null: false, default: "member"
    end
  end
end
