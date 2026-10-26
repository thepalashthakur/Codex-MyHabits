import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/supabase";
import { getUseAuthOrigin, isUseAuthConfigured } from "@/lib/useauth";
import { ssoConfig } from "@/lib/sso";
export const dynamic = "force-dynamic";
export default async function SignIn({ searchParams }: { searchParams: Promise<{ sso?: string }> }) { return <AuthForm mode="sign-in" configured={isConfigured() && isUseAuthConfigured()} ssoEnabled={Boolean(ssoConfig())} ssoFailed={(await searchParams).sso === "failed"} recoveryUrl={isUseAuthConfigured() ? `${getUseAuthOrigin()}/forgot-password` : undefined}/>; }
