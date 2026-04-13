defmodule TranscendenceChat.Chat.User do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: false}
  @schema_prefix "auth"
  schema "users" do
    field :username, :string
  end
end
