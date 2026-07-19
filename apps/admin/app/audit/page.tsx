import { AdminShell, DataTable, ErrorPanel } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function AuditPage() {
  const { token } = await requireAdmin();
  const audit = await readAdminApi("/admin/audit", token);
  return (
    <AdminShell title="Audit">
      <ErrorPanel payload={audit} />
      <DataTable columns={["event", "actor_id", "target_type", "redacted"]} rows={audit.items ?? []} />
    </AdminShell>
  );
}
