export function mockFriendIds(ids: string[]) {
  const original = globalThis.fetch
  globalThis.fetch = (async (
    _url: string | URL | Request,
    _init?: RequestInit
  ) =>
    new Response(JSON.stringify(ids), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch
  return () => {
    globalThis.fetch = original
  }
}
