import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: { setSession: vi.fn(), signOut: vi.fn() },
  requestUseAuth: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  cookieClient: vi.fn(async () => ({ auth: mocks.auth })),
  isConfigured: vi.fn(() => true),
}));
vi.mock("@/lib/useauth", () => ({
  isUseAuthConfigured: vi.fn(() => true),
  requestUseAuth: mocks.requestUseAuth,
}));

import { POST } from "../app/api/auth/[action]/route";

function request(action: string, origin = "https://myhabits.example.com") {
  return POST(new Request(`https://myhabits.example.com/api/auth/${action}`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@example.com", password: "long-password" }),
  }), { params: Promise.resolve({ action }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.signOut.mockResolvedValue({ error: null });
});

describe("MyHabits UseAuth integration", () => {
  it("establishes a local cookie session only for the same Supabase user", async () => {
    mocks.requestUseAuth.mockResolvedValue({ status: 200, data: { user: { id: "user-1" }, session: { access_token: "access", refresh_token: "refresh" } } });
    mocks.auth.setSession.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const response = await request("sign-in");
    expect(response.status).toBe(200);
    expect(mocks.requestUseAuth).toHaveBeenCalledWith("sign-in", { email: "test@example.com", password: "long-password" });
    expect(mocks.auth.setSession).toHaveBeenCalledWith({ access_token: "access", refresh_token: "refresh" });
    expect(await response.json()).toEqual({ ok: true, confirmationRequired: false });
  });

  it("refuses a session from a different project", async () => {
    mocks.requestUseAuth.mockResolvedValue({ status: 200, data: { user: { id: "user-1" }, session: { access_token: "access", refresh_token: "refresh" } } });
    mocks.auth.setSession.mockResolvedValue({ data: { user: { id: "user-2" } }, error: null });
    const response = await request("sign-in");
    expect(response.status).toBe(503);
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("keeps unconfirmed sign-up separate from a local session", async () => {
    mocks.requestUseAuth.mockResolvedValue({ status: 201, data: { confirmation_required: true, session: null } });
    const response = await request("sign-up");
    expect(response.status).toBe(201);
    expect((await response.json()).confirmationRequired).toBe(true);
    expect(mocks.auth.setSession).not.toHaveBeenCalled();
  });

  it("resends confirmation without creating a MyHabits session", async () => {
    mocks.requestUseAuth.mockResolvedValue({ status: 200, data: { message: "If this address needs confirmation, a new link will arrive shortly." } });
    const response = await request("resend-confirmation");
    expect(response.status).toBe(200);
    expect(mocks.requestUseAuth).toHaveBeenCalledWith("resend-confirmation", { email: "test@example.com" });
    expect(mocks.auth.setSession).not.toHaveBeenCalled();
  });

  it("rejects cross-origin mutations before forwarding credentials", async () => {
    const response = await request("sign-in", "https://evil.example.com");
    expect(response.status).toBe(403);
    expect(mocks.requestUseAuth).not.toHaveBeenCalled();
  });
});
