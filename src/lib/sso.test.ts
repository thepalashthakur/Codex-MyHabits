import { randomBytes } from "node:crypto";
import { afterEach, expect, test, vi } from "vitest";
import { challenge, parseSession, sameSecret, seal, ssoConfig, type SsoSession } from "./sso";

afterEach(() => vi.unstubAllEnvs());

function configured() {
  vi.stubEnv("SSO_CLIENT_ID", "preview-client");
  vi.stubEnv("SSO_CLIENT_SECRET", "preview-secret");
  vi.stubEnv("SSO_REDIRECT_URI", "https://habits.example.com/auth/sso/callback");
  vi.stubEnv("APP_URL", "https://habits.example.com");
  vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("SSO_SESSION_KEY", randomBytes(32).toString("hex"));
  return ssoConfig()!;
}

test("encrypted session cookie rejects tampering and expiry", () => {
  const config = configured();
  const session: SsoSession = { accessToken: "access", refreshToken: "refresh", expiresAt: Date.now() + 60000, subject: "user-id" };
  const value = seal(session, config.key);
  expect(parseSession(value)).toEqual(session);
  const bytes = Buffer.from(value, "base64url");
  bytes[bytes.length - 1] ^= 1;
  expect(parseSession(bytes.toString("base64url"))).toBeNull();
  expect(parseSession(seal({ ...session, expiresAt: Date.now() - 1 }, config.key))).toBeNull();
});

test("OAuth state uses exact comparison and PKCE S256", () => {
  expect(sameSecret("state", "state")).toBe(true);
  expect(sameSecret("state", "state2")).toBe(false);
  expect(challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
});
