import Config

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.

if System.get_env("PHX_SERVER") do
  config :transcendence_chat, TranscendenceChatWeb.Endpoint, server: true
end

http_opts = [port: String.to_integer(System.get_env("PORT", "4000"))]

http_opts =
  case System.get_env("PHX_IP") do
    nil -> http_opts
    ip_str ->
      parts = ip_str |> String.split(".") |> Enum.map(&String.to_integer/1) |> List.to_tuple()
      [{:ip, parts} | http_opts]
  end

config :transcendence_chat, TranscendenceChatWeb.Endpoint, http: http_opts

# Database configuration from environment variables (used in Docker and production)
if System.get_env("DB_HOST") do
  config :transcendence_chat, TranscendenceChat.Repo,
    username: System.get_env("DB_USER", "transcendence"),
    password: System.get_env("DB_PASSWORD", "transcendence_dev"),
    hostname: System.get_env("DB_HOST", "localhost"),
    database: System.get_env("DB_NAME", "transcendence_dev"),
    port: String.to_integer(System.get_env("DB_PORT", "5432")),
    pool_size: String.to_integer(System.get_env("POOL_SIZE", "5"))
end

if config_env() == :prod do
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host = System.get_env("PHX_HOST") || "example.com"

  config :transcendence_chat, :dns_cluster_query, System.get_env("DNS_CLUSTER_QUERY")

  config :transcendence_chat, TranscendenceChatWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    secret_key_base: secret_key_base
end
