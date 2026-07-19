import { AdminShell, DataTable, ErrorPanel } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function ImportJobsPage() {
  const { token } = await requireAdmin();
  const jobs = await readAdminApi("/admin/import-jobs", token);
  return (
    <AdminShell title="Import Jobs">
      <ErrorPanel payload={jobs} />
      <DataTable columns={["kind", "status", "records_available"]} rows={jobs.items ?? []} />
    </AdminShell>
  );
}
