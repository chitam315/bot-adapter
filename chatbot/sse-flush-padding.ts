/**
 * Pushes SSE chunks through the size-triggered proxy buffer in front of the
 * app.
 *
 * Production traffic goes through F5 Distributed Cloud, and a layer behind it
 * holds `text/event-stream` responses (headers included) until about 16 KiB
 * has piled up, then does the same for every following block. It ignores the
 * `X-Accel-Buffering: no` and `Cache-Control: no-transform` headers tRPC
 * already sends. HAR captures showed the first chat chunk arriving after
 * 14-18 s and the rest of the answer in one or two bursts.
 *
 * While real data is waiting, this appends an SSE comment larger than that
 * buffer at most once per window. That releases everything before it whether
 * the buffer forwards whole blocks or flushes once full. EventSource ignores
 * comments, so clients never see the padding. Set `SSE_FLUSH_PADDING_BYTES=0`
 * once the infrastructure stops buffering SSE.
 */

export interface SseFlushPaddingOptions {
  /** Size of each padding comment in bytes; 0 disables padding. */
  paddingBytes: number;
  /** Longest a chunk waits before padding pushes it through. */
  windowMs: number;
}

/**
 * Returns `response` with padding added to its SSE body, or `response` itself
 * when it is not an SSE response or padding is disabled.
 */
export function withSseFlushPadding(
  response: Response,
  { paddingBytes, windowMs }: SseFlushPaddingOptions,
): Response {
  const contentType = response.headers.get('content-type') ?? '';
  if (
    paddingBytes <= 0 ||
    !response.body ||
    !contentType.startsWith('text/event-stream')
  ) {
    return response;
  }

  // ':' opens an SSE comment and the blank line closes it.
  const padding = new TextEncoder().encode(
    `:${' '.repeat(Math.max(0, paddingBytes - 3))}\n\n`,
  );
  const reader = response.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const stop = () => {
    closed = true;
    clearTimeout(timer);
  };

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (closed) return;
        if (done) {
          stop();
          controller.close();
          return;
        }
        controller.enqueue(value);
        if (!timer) {
          timer = setTimeout(() => {
            timer = undefined;
            if (!closed) controller.enqueue(padding);
          }, windowMs);
        }
      } catch (error) {
        stop();
        throw error;
      }
    },
    cancel(reason) {
      // Keeps client disconnects aborting the tRPC subscription.
      stop();
      return reader.cancel(reason);
    },
  });

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
