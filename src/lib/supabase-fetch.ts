const SUPABASE_TIMEOUT_MS = 15000;

export const boundedSupabaseFetch: typeof fetch = (input, init) => {
  const signals = [AbortSignal.timeout(SUPABASE_TIMEOUT_MS)];
  if (input instanceof Request) signals.push(input.signal);
  if (init?.signal) signals.push(init.signal);
  return fetch(input, { ...init, signal: AbortSignal.any(signals) });
};
