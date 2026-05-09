defmodule TranscendenceChatWeb.Presence do
  @moduledoc """
  Rastreia quais users estão online via Phoenix.Presence.

  O Presence usa o PubSub (CRDT) pra sincronizar estado entre processos/nós.
  Quando um user conecta, fazemos `track/3` no UserChannel.
  Quando desconecta, o Presence remove automaticamente e faz broadcast de "presence_diff".
  """
  use Phoenix.Presence,
    otp_app: :transcendence_chat,
    pubsub_server: TranscendenceChat.PubSub
end
