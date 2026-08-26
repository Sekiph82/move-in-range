import { AdminShell, DataTable, ErrorPanel, MetricGrid } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function ImportJobsPage() {
  const { token } = await requireAdmin();
  const jobs = await readAdminApi("/admin/import-jobs", token);
  const storage = jobs.media?.storage_objects ?? {};
  return (
    <AdminShell title="Import Jobs">
      <ErrorPanel payload={jobs} />
      <MetricGrid
        items={[
          { label: "Exercise rows", value: jobs.items?.[0]?.records_available ?? 0, note: "Imported into PostgreSQL" },
          { label: "Playable media rows", value: jobs.media?.playable_rows ?? 0, note: "HTTPS media approved for product use" },
          { label: "Missing media rows", value: jobs.media?.missing_media_rows ?? 0, note: "Rows needing importer attention" },
          { label: "Local path rows", value: jobs.media?.local_path_rows ?? 0, note: "Must remain zero in production" },
          { label: "Storage objects", value: storage.total_objects ?? "Unavailable", note: "Bucket usage from Supabase Storage" },
          { label: "Storage bytes", value: storage.total_bytes ?? "Unavailable", note: "Object metadata when available" }
        ]}
      />
      <DataTable columns={["kind", "status", "records_available"]} rows={jobs.items ?? []} />
    </AdminShell>
  );
}
