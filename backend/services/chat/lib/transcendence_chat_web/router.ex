defmodule TranscendenceChatWeb.Router do
  use TranscendenceChatWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :authenticated_api do
    plug TranscendenceChatWeb.Plugs.Authenticate
  end

  # Todas as rotas de conversa/mensagem/grupo/status exigem identidade
  # validada pelo API gateway no header `x-user-id`.
  scope "/api", TranscendenceChatWeb do
    pipe_through [:api, :authenticated_api]

    post "/conversation", LoginController, :create_conversation
    get "/conversations", LoginController, :list_conversations
    get "/messages", LoginController, :list_messages

    # Group management
    post "/group", GroupController, :create
    post "/group/:id/members", GroupController, :add_member
    delete "/group/:id/members/:user_id", GroupController, :remove_member
    patch "/group/:id", GroupController, :update

    # Online status
    get "/users/online", StatusController, :online
    get "/users/:user_id/last_seen", StatusController, :last_seen
  end
end
