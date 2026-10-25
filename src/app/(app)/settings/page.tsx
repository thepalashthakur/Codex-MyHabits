import { appData } from "@/lib/data";
import { SettingsForm } from "@/components/settings-form";
import { SignOut } from "@/components/sign-out";
import { DataTransfer } from "@/components/data-transfer";
import { getUseAuthOrigin, isUseAuthConfigured } from "@/lib/useauth";
export default async function Settings() { const data = await appData(); return <><header className="page-head"><div><p className="eyebrow">PREFERENCES</p><h1>Settings</h1><p className="subtle">Make tracking fit your day.</p></div></header><h2 className="section-title">Appearance and timezone</h2><SettingsForm timezone={data.timezone} theme={data.profile?.theme ?? "system"}/><h2 className="section-title">Your data</h2><div className="card"><DataTransfer/></div><h2 className="section-title">Account</h2><div className="card row"><div><b>{data.user.email}</b><p className="subtle">Your habits are private to your account.</p>{isUseAuthConfigured() && <p className="subtle"><a href={`${getUseAuthOrigin()}/account`}>Change password in UseAuth</a>. Sign in there with this shared account if asked, then return to MyHabits.</p>}</div><SignOut/></div><p className="subtle">MyHabits 0.1.0 · V2 in progress</p></>; }
