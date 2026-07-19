import { AdminShell, DataTable, ErrorPanel } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function PrivacyJobsPage() {
  const { token } = await requireAdmin();
  const jobs = await readAdminApi("/admin/privacy-jobs", token);
  return (
    <AdminShell title="Privacy Jobs">
      <ErrorPanel payload={jobs} />
      <h3>Exports</h3>
      <DataTable columns={["id", "status", "archive_format", "created_at"]} rows={jobs.exports ?? []} />
      <h3>Deletions</h3>
      <DataTable columns={["id", "deletion_type", "status", "cancellation_deadline"]} rows={jobs.deletions ?? []} />
    </AdminShell>
  );
}
