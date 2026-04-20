defmodule TranscendenceChatWeb.Router do
  use TranscendenceChatWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {TranscendenceChatWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", TranscendenceChatWeb do
    pipe_through :browser

    get "/", PageController, :home
  end

  scope "/api", TranscendenceChatWeb do
    pipe_through :api

    post "/login", LoginController, :login
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

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:transcendence_chat, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: TranscendenceChatWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
