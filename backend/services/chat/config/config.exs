# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :transcendence_chat,
  ecto_repos: [TranscendenceChat.Repo],
  generators: [timestamp_type: :utc_datetime]

# Configure the endpoint
config :transcendence_chat, TranscendenceChatWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: TranscendenceChatWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: TranscendenceChat.PubSub

# Configure the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. For production it's recommended to configure a different
# adapter at the `config/runtime.exs`.
config :transcendence_chat, TranscendenceChat.Mailer, adapter: Swoosh.Adapters.Local

# Configure Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
