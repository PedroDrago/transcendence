import Config

# TLS is terminated at the nginx edge / API gateway, and this service only
# receives internal cleartext traffic, so we do NOT force SSL here (doing so
# would 301-redirect internal requests, including the container healthcheck).

# Configure Swoosh API Client
config :swoosh, api_client: Swoosh.ApiClient.Req

# Disable Swoosh Local Memory Storage
config :swoosh, local: false

# Do not print debug messages in production
config :logger, level: :info

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
