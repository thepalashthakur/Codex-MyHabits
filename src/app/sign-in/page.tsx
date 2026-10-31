import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/supabase";
import { getUseAuthOrigin, isUseAuthConfigured } from "@/lib/useauth";
import { ssoConfig } from "@/lib/sso";
export const dynamic = "force-dynamic";
export default async function SignIn({ searchParams }: { searchParams: Promise<{ sso?: string }> }) { const appId = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === "feat/sso-pilot" ? "myhabits_sso_preview" : "myhabits"; return <AuthForm mode="sign-in" configured={isConfigured() && isUseAuthConfigured()} ssoEnabled={Boolean(ssoConfig())} ssoFailed={(await searchParams).sso === "failed"} recoveryUrl={isUseAuthConfigured() ? `${getUseAuthOrigin()}/forgot-password?app_id=${appId}` : undefined}/>; }
