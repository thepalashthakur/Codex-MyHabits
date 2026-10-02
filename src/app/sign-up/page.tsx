import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export default function SignUp() { return <AuthForm mode="sign-up" configured={isConfigured()}/>; }
