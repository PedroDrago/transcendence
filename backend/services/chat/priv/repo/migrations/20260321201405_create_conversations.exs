defmodule TranscendenceChat.Repo.Migrations.CreateConversations do
  use Ecto.Migration

  def change do
    create table(:conversations) do

      timestamps(type: :utc_datetime)
    end
  end
end
