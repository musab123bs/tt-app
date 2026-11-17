import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { NotificationList } from "@/components/notifications/notification-list";
import { PageHeader } from "@/components/shared/page-header";
import { getUserNotifications } from "@/lib/services/notifications";
import { requireUser } from "@/lib/session";

export const instant = false;

export default async function NotificationsPage() {
  const session = await requireUser();
  const { items, unread } = await getUserNotifications(session.user.id);
  return <DashboardShell playerName={session.user.name ?? "Player"} playerImage={session.user.image ?? null}><main className="p-4 sm:p-6 lg:p-8">
    <PageHeader title="Notifications" description="Tournament updates, match schedules, and account messages." />
    <div className="max-w-3xl"><NotificationList items={items} unread={unread} /></div>
  </main></DashboardShell>;
}
