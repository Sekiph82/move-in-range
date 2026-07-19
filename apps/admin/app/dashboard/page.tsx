import { AdminShell, ErrorPanel, MetricGrid, StatusBanner } from "../admin-ui";
import { apiBase, readAdminApi, requireAdmin } from "../session";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { token, csrf } = await requireAdmin();
  const [users, policies, exercises, system] = await Promise.all([
    readAdminApi("/admin/users", token),
    readAdminApi("/admin/policies", token),
    readAdminApi("/admin/exercises", token),
    readAdminApi("/admin/system", token)
  ]);
  return (
    <AdminShell title="Dashboard">
      <StatusBanner searchParams={params} />
      <ErrorPanel payload={users} />
      <ErrorPanel payload={policies} />
      <ErrorPanel payload={exercises} />
      <ErrorPanel payload={system} />
      <MetricGrid items={[
        { label: "API", value: apiBase, note: "Primary backend endpoint" },
        { label: "Masked users", value: users.items?.length ?? 0 },
        { label: "Policies", value: policies.items?.length ?? 0 },
        { label: "Exercises", value: exercises.items?.length ?? 0 },
        { label: "Redis revocation", value: system.redis ?? "unavailable" },
        { label: "PostgreSQL", value: system.postgresql ?? "unavailable" }
      ]} />
      <form className="form-grid" action="/api/admin-session/mutate" method="post">
        <h3>Closed beta seed</h3>
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="operation" value="e2e_seed" />
        <button type="submit">Prepare disposable test records</button>
      </form>
    </AdminShell>
  );
}
