defmodule TranscendenceChat.Chat.ConversationUser do
  use Ecto.Schema
  import Ecto.Changeset

  schema "conversation_users" do
    belongs_to :conversation, TranscendenceChat.Chat.Conversation
    belongs_to :user, TranscendenceChat.Chat.User

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(conversation_user, attrs) do
    conversation_user
    |> cast(attrs, [:conversation_id, :user_id])
    |> validate_required([:conversation_id, :user_id])
  end
end
