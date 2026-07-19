import { AdminShell, DataTable, ErrorPanel } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function PoliciesPage() {
  const { token } = await requireAdmin();
  const policies = await readAdminApi("/admin/policies", token);
  const rows = (policies.items ?? []).map((item: any) => ({ id: item.id, version: item.version, status: item.status, clinical_review_state: item.clinical_review_state, rules: item.rule_count, open: `/policies/${item.version}` }));
  return (
    <AdminShell title="Policies">
      <ErrorPanel payload={policies} />
      <DataTable columns={["id", "version", "status", "clinical_review_state", "rules", "open"]} rows={rows} />
    </AdminShell>
  );
}
