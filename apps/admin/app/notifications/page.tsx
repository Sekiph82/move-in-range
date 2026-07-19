import { AdminShell, DataTable, ErrorPanel, MetricGrid, StatusBanner } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { token, csrf } = await requireAdmin();
  const notifications = await readAdminApi("/admin/notifications", token);
  const firstJob = notifications.items?.[0];
  return (
    <AdminShell title="Notifications">
      <StatusBanner searchParams={params} />
      <ErrorPanel payload={notifications} />
      <MetricGrid items={[{ label: "Provider", value: notifications.provider }, { label: "Jobs", value: notifications.items?.length ?? 0 }]} />
      {firstJob ? <form className="form-grid" action="/api/admin-session/mutate" method="post">
        <h3>Notification action</h3>
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="method" value="POST" />
        <input type="hidden" name="path" value={`/admin/notifications/${firstJob.id}/retry`} />
        <input type="hidden" name="redirectTo" value="/notifications" />
        <button type="submit">Retry notification</button>
      </form> : null}
      <DataTable columns={["id", "category", "provider", "scheduled_for", "status", "retry_count"]} rows={notifications.items ?? []} />
    </AdminShell>
  );
}
