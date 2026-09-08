/** Database requests must not inherit Next's fetch cache or wait indefinitely.
 * Abort the actual HTTP operation; a Promise.race alone would leave writes alive.
 * Deliberately do not retry SQL: a timed-out write may already have committed.
 */
export function createDatabaseFetch(timeoutMs = 10_000): typeof globalThis.fetch {
  return (input, init) => {
    const callerSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const deadline = AbortSignal.timeout(timeoutMs);
    return fetch(input, {
      ...init,
      cache: "no-store",
      signal: callerSignal ? AbortSignal.any([callerSignal, deadline]) : deadline,
    });
  };
}
