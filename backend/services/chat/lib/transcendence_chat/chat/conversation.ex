defmodule TranscendenceChat.Chat.Conversation do
  use Ecto.Schema
  import Ecto.Changeset

  @schema_prefix "chat"
  schema "conversations" do
    field :type, :string, default: "direct"
    field :name, :string
    field :created_by, Ecto.UUID

    has_many :conversation_users, TranscendenceChat.Chat.ConversationUser

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(conversation, attrs) do
    conversation
    |> cast(attrs, [:type, :name, :created_by])
    |> validate_required([:type])
    |> validate_inclusion(:type, ["direct", "group"])
    |> validate_group_name()
  end

  # Grupos precisam de nome; conversas diretas não
  defp validate_group_name(changeset) do
    if get_field(changeset, :type) == "group" do
      validate_required(changeset, [:name])
    else
      changeset
    end
  end
end
