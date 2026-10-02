import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export default function SignIn() { return <AuthForm mode="sign-in" configured={isConfigured()}/>; }
