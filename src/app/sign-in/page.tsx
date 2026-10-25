import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/supabase";
import { getUseAuthOrigin, isUseAuthConfigured } from "@/lib/useauth";
export const dynamic = "force-dynamic";
export default function SignIn() { return <AuthForm mode="sign-in" configured={isConfigured() && isUseAuthConfigured()} recoveryUrl={isUseAuthConfigured() ? `${getUseAuthOrigin()}/forgot-password` : undefined}/>; }
