import { AdminShell, DataTable, ErrorPanel, StatusBanner } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { token, csrf } = await requireAdmin();
  const policies = await readAdminApi("/admin/policies", token);
  const rows = (policies.items ?? []).map((item: any) => ({ id: item.id, version: item.version, status: item.status, clinical_review_state: item.clinical_review_state, rules: item.rule_count, open: `/policies/${item.version}` }));
  return (
    <AdminShell title="Policies">
      <StatusBanner searchParams={params} />
      <ErrorPanel payload={policies} />
      <form className="form-grid" action="/api/admin-session/mutate" method="post">
        <h3>Create policy draft</h3>
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="method" value="POST" />
        <input type="hidden" name="path" value="/admin/policies" />
        <input type="hidden" name="redirectTo" value="/policies" />
        <label>Version<input name="version" defaultValue={`closed-beta-${Date.now()}`} /></label>
        <label>Clinical review<select name="clinical_review_state" defaultValue="draft"><option value="draft">Draft</option><option value="submitted">Submitted</option></select></label>
        <button type="submit">Create draft</button>
      </form>
      <DataTable columns={["id", "version", "status", "clinical_review_state", "rules", "open"]} rows={rows} />
    </AdminShell>
  );
}
