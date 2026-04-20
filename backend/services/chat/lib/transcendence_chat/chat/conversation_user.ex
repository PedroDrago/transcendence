defmodule TranscendenceChat.Chat.ConversationUser do
  use Ecto.Schema
  import Ecto.Changeset

  @schema_prefix "chat"
  schema "conversation_users" do
    field :role, :string, default: "member"

    belongs_to :conversation, TranscendenceChat.Chat.Conversation
    belongs_to :user, TranscendenceChat.Chat.User, type: :binary_id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(conversation_user, attrs) do
    conversation_user
    |> cast(attrs, [:conversation_id, :user_id, :role])
    |> validate_required([:conversation_id, :user_id])
    |> validate_inclusion(:role, ["member", "admin"])
  end
end
