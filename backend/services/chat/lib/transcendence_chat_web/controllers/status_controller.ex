defmodule TranscendenceChatWeb.StatusController do
  use TranscendenceChatWeb, :controller

  alias TranscendenceChatWeb.Presence
  alias TranscendenceChat.Chat

  # GET /api/users/online
  # Retorna a lista de user_ids online neste momento.
  # O Presence.list/1 retorna um mapa %{"user_id" => %{metas: [...]}}
  # — pegamos só as chaves (os user_ids).
  def online(conn, _params) do
    online_ids =
      Presence.list("presence:lobby")
      |> Map.keys()

    json(conn, %{online: online_ids})
  end

  # GET /api/users/:user_id/last_seen
  # Retorna o timestamp de quando o user foi visto pela última vez.
  # Útil pra mostrar "visto por último às X" quando o user está offline.
  def last_seen(conn, %{"user_id" => user_id}) do
    case Chat.get_last_seen(user_id) do
      nil -> json(conn, %{last_seen_at: nil})
      dt -> json(conn, %{last_seen_at: DateTime.to_iso8601(dt)})
    end
  end
end
