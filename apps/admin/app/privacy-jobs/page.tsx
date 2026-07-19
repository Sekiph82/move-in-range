import { AdminShell, DataTable, ErrorPanel, StatusBanner } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function PrivacyJobsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { token, csrf } = await requireAdmin();
  const jobs = await readAdminApi("/admin/privacy-jobs", token);
  const firstExport = jobs.exports?.[0];
  const firstDeletion = jobs.deletions?.[0];
  return (
    <AdminShell title="Privacy Jobs">
      <StatusBanner searchParams={params} />
      <ErrorPanel payload={jobs} />
      {firstExport ? <form className="form-grid" action="/api/admin-session/mutate" method="post">
        <h3>Export job action</h3>
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="method" value="POST" />
        <input type="hidden" name="path" value={`/admin/privacy-jobs/export/${firstExport.id}/process`} />
        <input type="hidden" name="redirectTo" value="/privacy-jobs" />
        <button type="submit">Process export</button>
      </form> : null}
      {firstDeletion ? <form className="form-grid" action="/api/admin-session/mutate" method="post">
        <h3>Deletion job action</h3>
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="method" value="POST" />
        <input type="hidden" name="path" value={`/admin/privacy-jobs/deletion/${firstDeletion.id}/process`} />
        <input type="hidden" name="redirectTo" value="/privacy-jobs" />
        <button type="submit" className="danger-button">Process deletion</button>
      </form> : null}
      <h3>Exports</h3>
      <DataTable columns={["id", "status", "archive_format", "created_at"]} rows={jobs.exports ?? []} />
      <h3>Deletions</h3>
      <DataTable columns={["id", "deletion_type", "status", "cancellation_deadline"]} rows={jobs.deletions ?? []} />
    </AdminShell>
  );
}
