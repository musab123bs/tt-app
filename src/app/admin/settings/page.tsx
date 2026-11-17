import { AdminShell } from "@/components/admin/admin-shell";
import { SettingsForm } from "@/components/admin/settings-form";
import { AdminHeader } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getPlatformSettings, PLAYER_LEVELS, PROFILE_FIELDS, TIE_BREAK_RULES } from "@/lib/services/platform-settings";

export const instant = false;

export default async function AdminSettingsPage() {
  const admin = await requireSuperAdmin();
  const settings = await getPlatformSettings();
  return <AdminShell adminName={admin.name}>
    <AdminHeader title="Platform settings" description="Stored in the database and validated before saving. Changes never rewrite existing match or tournament records." />
    <div className="max-w-4xl"><SettingsForm settings={settings} profileFields={PROFILE_FIELDS} levels={PLAYER_LEVELS} tieBreaks={TIE_BREAK_RULES} /></div>
  </AdminShell>;
}
