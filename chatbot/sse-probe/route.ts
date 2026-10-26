/**
 * TEMP (delete after the F5 buffering investigation).
 *
 * Raw SSE probe: no tRPC, no auth, no LLM. Emits one small event per `gapMs`.
 * If events arrive at the browser in a single burst through F5 but arrive
 * one-by-one on www3 (which bypasses F5), the buffering is in the network
 * layer and nothing in the app can be responsible.
 *
 *   /chatbot/api/sse-probe?count=15&gapMs=1000&connected=1&pad=0
 */
export const dynamic = 'force-dynamic';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const count = clamp(Number(params.get('count') ?? 15), 1, 60);
  const gapMs = clamp(Number(params.get('gapMs') ?? 1000), 100, 10_000);
  const pad = clamp(Number(params.get('pad') ?? 0), 0, 65_536);
  const connected = params.get('connected') === '1';
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      if (connected) send('event: connected\ndata: {}\n\n');
      if (pad > 0) send(`: ${'x'.repeat(pad)}\n\n`);
      for (let i = 0; i < count && !req.signal.aborted; i++) {
        send(`data: ${JSON.stringify({ i, serverTime: Date.now() })}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, gapMs));
      }
      send('event: return\ndata: \n\n');
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
