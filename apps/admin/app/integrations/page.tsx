import { AdminShell, DataTable, ErrorPanel } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function IntegrationsPage() {
  const { token } = await requireAdmin();
  const integrations = await readAdminApi("/admin/integrations", token);
  const providers = (integrations.providers ?? []).map((item: any) => ({ key: item.key, category: item.category, status: item.status }));
  return (
    <AdminShell title="Integrations">
      <ErrorPanel payload={integrations} />
      <h3>Providers</h3>
      <DataTable columns={["key", "category", "status"]} rows={providers} />
      <h3>Connections</h3>
      <DataTable columns={["id", "provider_key", "category", "status"]} rows={integrations.connections ?? []} />
      <h3>Sync Records</h3>
      <DataTable columns={["id", "status", "records_seen", "duplicates_skipped", "cursor_after"]} rows={integrations.syncs ?? []} />
    </AdminShell>
  );
}
