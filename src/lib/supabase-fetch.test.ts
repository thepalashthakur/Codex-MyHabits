import { afterEach, expect, test, vi } from "vitest";
import { boundedSupabaseFetch } from "./supabase-fetch";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

test("bounds stalled Supabase requests", async () => {
  const timeout = new AbortController();
  const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
  vi.stubGlobal("fetch", vi.fn((_input, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
  })));
  const result = boundedSupabaseFetch("https://example.supabase.co/rest/v1/table");
  expect(timeoutSpy).toHaveBeenCalledWith(15000);
  timeout.abort(new DOMException("Request timed out", "TimeoutError"));
  await expect(result).rejects.toMatchObject({ name: "TimeoutError" });
});

test("preserves caller cancellation", async () => {
  const controller = new AbortController();
  vi.stubGlobal("fetch", vi.fn((_input, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
  })));
  const result = boundedSupabaseFetch("https://example.supabase.co/rest/v1/table", { signal: controller.signal });
  controller.abort(new Error("caller cancelled"));
  await expect(result).rejects.toThrow("caller cancelled");
});
