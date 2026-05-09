defmodule TranscendenceChat.Chat.MessageRead do
  use Ecto.Schema
  import Ecto.Changeset

  @schema_prefix "chat"
  schema "message_reads" do
    belongs_to :message, TranscendenceChat.Chat.Message
    belongs_to :user, TranscendenceChat.Chat.User, type: :binary_id

    field :read_at, :utc_datetime
  end

  @doc false
  def changeset(message_read, attrs) do
    message_read
    |> cast(attrs, [:message_id, :user_id, :read_at])
    |> validate_required([:message_id, :user_id, :read_at])
    |> unique_constraint([:message_id, :user_id])
  end
end
