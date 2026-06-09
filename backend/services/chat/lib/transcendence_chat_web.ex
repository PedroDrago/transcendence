defmodule TranscendenceChatWeb do
  @moduledoc """
  The entrypoint for defining the web interface (controllers and channels).

  This is a JSON API + WebSocket service: identity is provided by the API
  gateway via the internal `x-user-id` header, so there is no HTML/LiveView
  surface here. It can be used in your application as:

      use TranscendenceChatWeb, :controller
      use TranscendenceChatWeb, :channel

  The definitions below will be executed for every controller, channel,
  etc, so keep them short and clean, focused on imports, uses and aliases.
  """

  def static_paths, do: ~w()

  def router do
    quote do
      use Phoenix.Router, helpers: false

      # Import common connection and controller functions to use in pipelines
      import Plug.Conn
      import Phoenix.Controller
    end
  end

  def channel do
    quote do
      use Phoenix.Channel
    end
  end

  def controller do
    quote do
      use Phoenix.Controller, formats: [:json]

      import Plug.Conn

      unquote(verified_routes())
    end
  end

  def verified_routes do
    quote do
      use Phoenix.VerifiedRoutes,
        endpoint: TranscendenceChatWeb.Endpoint,
        router: TranscendenceChatWeb.Router,
        statics: TranscendenceChatWeb.static_paths()
    end
  end

  @doc """
  When used, dispatch to the appropriate controller/channel/etc.
  """
  defmacro __using__(which) when is_atom(which) do
    apply(__MODULE__, which, [])
  end
end
