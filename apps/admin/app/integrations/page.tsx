import { AdminShell, DataTable, ErrorPanel, StatusBanner } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { token, csrf } = await requireAdmin();
  const integrations = await readAdminApi("/admin/integrations", token);
  const providers = (integrations.providers ?? []).map((item: any) => ({ key: item.key, category: item.category, status: item.status }));
  const firstConnection = integrations.connections?.[0];
  return (
    <AdminShell title="Integrations">
      <StatusBanner searchParams={params} />
      <ErrorPanel payload={integrations} />
      <h3>Providers</h3>
      <DataTable columns={["key", "category", "status"]} rows={providers} />
      <h3>Connections</h3>
      {firstConnection ? <form className="form-grid" action="/api/admin-session/mutate" method="post">
        <h3>Integration action</h3>
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="method" value="POST" />
        <input type="hidden" name="path" value={`/admin/integrations/${firstConnection.id}/disable`} />
        <input type="hidden" name="redirectTo" value="/integrations" />
        <button type="submit" className="danger-button">Disable connection</button>
      </form> : null}
      <DataTable columns={["id", "provider_key", "category", "status"]} rows={integrations.connections ?? []} />
      <h3>Sync Records</h3>
      <DataTable columns={["id", "status", "records_seen", "duplicates_skipped", "cursor_after"]} rows={integrations.syncs ?? []} />
    </AdminShell>
  );
}
