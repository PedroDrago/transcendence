import Config

# Configure your database
config :transcendence_chat, TranscendenceChat.Repo,
  username: "transcendence",
  password: "transcendence_dev",
  hostname: "localhost",
  database: "transcendence_dev",
  stacktrace: true,
  show_sensitive_data_on_connection_error: true,
  pool_size: 5

# For development, we disable any cache and enable
# debugging and code reloading.
#
# The watchers configuration can be used to run external
# watchers to your application. For example, we can use it
# to bundle .js and .css sources.
config :transcendence_chat, TranscendenceChatWeb.Endpoint,
  # Binding to loopback ipv4 address prevents access from other machines.
  # Change to `ip: {0, 0, 0, 0}` to allow access from other machines.
  http: [ip: {127, 0, 0, 1}],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base: "xfTFh2r+G/70oGbV44I7S+LPRFKxfILx3HuLGD+AcpN1Nm8L1P/BOqIPmM93U1pj",
  watchers: [
    esbuild: {Esbuild, :install_and_run, [:transcendence_chat, ~w(--sourcemap=inline --watch)]},
    tailwind: {Tailwind, :install_and_run, [:transcendence_chat, ~w(--watch)]}
  ]

# Reload browser tabs when matching files change.
config :transcendence_chat, TranscendenceChatWeb.Endpoint,
  live_reload: [
    web_console_logger: true,
    patterns: [
      ~r"priv/static/(?!uploads/).*\.(js|css|png|jpeg|jpg|gif|svg)$",
      ~r"priv/gettext/.*\.po$",
      ~r"lib/transcendence_chat_web/router\.ex$",
      ~r"lib/transcendence_chat_web/(controllers|live|components)/.*\.(ex|heex)$"
    ]
  ]

# Enable dev routes for dashboard and mailbox
config :transcendence_chat, dev_routes: true

# Do not include metadata nor timestamps in development logs
config :logger, :default_formatter, format: "[$level] $message\n"

# Set a higher stacktrace during development. Avoid configuring such
# in production as building large stacktraces may be expensive.
config :phoenix, :stacktrace_depth, 20

# Initialize plugs at runtime for faster development compilation
config :phoenix, :plug_init_mode, :runtime

config :phoenix_live_view,
  debug_heex_annotations: true,
  debug_attributes: true,
  enable_expensive_runtime_checks: true

# Disable swoosh api client as it is only required for production adapters.
config :swoosh, :api_client, false
