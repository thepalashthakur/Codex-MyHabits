import { appData } from "@/lib/data";
import { SettingsForm } from "@/components/settings-form";
import { SignOut } from "@/components/sign-out";
export default async function Settings() { const data = await appData(); return <><header className="page-head"><div><p className="eyebrow">PREFERENCES</p><h1>Settings</h1><p className="subtle">Make tracking fit your day.</p></div></header><SettingsForm timezone={data.timezone} theme={data.profile?.theme ?? "system"}/><h2 className="section-title">Account</h2><div className="card row"><div><b>{data.user.email}</b><p className="subtle">Your habits are private to your account.</p></div><SignOut/></div></>; }
