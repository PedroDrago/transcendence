defmodule TranscendenceChat.Chat.Message do
  use Ecto.Schema
  import Ecto.Changeset

  schema "messages" do
    field :body, :string
    belongs_to :conversation, TranscendenceChat.Chat.Conversation
    belongs_to :user, TranscendenceChat.Chat.User

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(message, attrs) do
    message
    |> cast(attrs, [:body, :user_id, :conversation_id])
    |> validate_required([:body, :user_id, :conversation_id])
  end
end
