import { AdminShell, DataTable, DetailList, ErrorPanel } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function SystemPage() {
  const { token } = await requireAdmin();
  const system = await readAdminApi("/admin/system", token);
  return (
    <AdminShell title="System">
      <ErrorPanel payload={system} />
      <DetailList items={[
        { label: "API", value: system.api?.status },
        { label: "Ready", value: system.ready?.status },
        { label: "PostgreSQL", value: system.postgresql },
        { label: "Redis", value: system.redis },
        { label: "Secrets exposed", value: system.secrets_exposed }
      ]} />
      <h3>Provider Status</h3>
      <DataTable columns={["key", "status"]} rows={system.provider_status ?? []} />
      <h3>Incidents</h3>
      <DataTable columns={["id", "incident_type", "severity", "status"]} rows={system.incidents ?? []} />
    </AdminShell>
  );
}
