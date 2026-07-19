import { AdminShell, DataTable, ErrorPanel, MetricGrid } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function NotificationsPage() {
  const { token } = await requireAdmin();
  const notifications = await readAdminApi("/admin/notifications", token);
  return (
    <AdminShell title="Notifications">
      <ErrorPanel payload={notifications} />
      <MetricGrid items={[{ label: "Provider", value: notifications.provider }, { label: "Jobs", value: notifications.items?.length ?? 0 }]} />
      <DataTable columns={["id", "category", "provider", "scheduled_for", "status", "retry_count"]} rows={notifications.items ?? []} />
    </AdminShell>
  );
}
