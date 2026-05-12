defmodule TranscendenceChat.Chat.UserStatus do
  use Ecto.Schema
  import Ecto.Changeset

  @schema_prefix "chat"

  # PK é o próprio user_id, não gera ID auto-incrementado
  @primary_key {:user_id, :binary_id, autogenerate: false}
  schema "user_status" do
    field :last_seen_at, :utc_datetime
  end

  @doc false
  def changeset(user_status, attrs) do
    user_status
    |> cast(attrs, [:user_id, :last_seen_at])
    |> validate_required([:user_id, :last_seen_at])
  end
end
