// Minimal Phoenix socket client (protocol v2 — array format)
// Message shape: [join_ref, ref, topic, event, payload]
type PhxFrame = [string | null, string | null, string, string, unknown];
type EventCallback = (event: string, payload: unknown) => void;

export class PhoenixSocket {
  private ws: WebSocket | null = null;
  private ref = 0;
  private joinRefs = new Map<string, string>(); // topic → joinRef
  private subs = new Map<string, Set<EventCallback>>(); // topic → callbacks
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private connectCallbacks: Array<() => void> = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(private readonly url: string) {}

  connect() {
    this.closed = false;
    this._open();
  }

  private _open() {
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => {
      this.heartbeatTimer = setInterval(() => this._heartbeat(), 30_000);
      this.connectCallbacks.forEach((cb) => cb());
      this.connectCallbacks = [];
    };

    ws.onmessage = ({ data }) => {
      try {
        const frame: PhxFrame = JSON.parse(data as string);
        const [, , topic, event, payload] = frame;
        this.subs.get(topic)?.forEach((cb) => cb(event, payload));
      } catch {}
    };

    ws.onclose = () => {
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      if (!this.closed) {
        this.reconnectTimer = setTimeout(() => this._open(), 5_000);
      }
    };
  }

  onConnect(cb: () => void) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      cb();
    } else {
      this.connectCallbacks.push(cb);
    }
  }

  private nextRef(): string {
    return String(++this.ref);
  }

  private _heartbeat() {
    const ref = this.nextRef();
    this._send([null, ref, 'phoenix', 'heartbeat', {}]);
  }

  private _send(frame: PhxFrame) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame));
    }
  }

  join(topic: string, params: Record<string, unknown> = {}) {
    const joinRef = this.nextRef();
    this.joinRefs.set(topic, joinRef);
    this._send([joinRef, joinRef, topic, 'phx_join', params]);
    return joinRef;
  }

  push(topic: string, event: string, payload: unknown = {}) {
    const joinRef = this.joinRefs.get(topic) ?? null;
    const ref = this.nextRef();
    this._send([joinRef, ref, topic, event, payload]);
  }

  subscribe(topic: string, cb: EventCallback): () => void {
    if (!this.subs.has(topic)) this.subs.set(topic, new Set());
    this.subs.get(topic)!.add(cb);
    return () => this.subs.get(topic)?.delete(cb);
  }

  disconnect() {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.ws?.close();
  }
}
