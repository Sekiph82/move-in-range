import { AdminShell, ErrorPanel, MetricGrid } from "../admin-ui";
import { apiBase, readAdminApi, requireAdmin } from "../session";

export default async function DashboardPage() {
  const { token } = await requireAdmin();
  const [users, policies, exercises, system] = await Promise.all([
    readAdminApi("/admin/users", token),
    readAdminApi("/admin/policies", token),
    readAdminApi("/admin/exercises", token),
    readAdminApi("/admin/system", token)
  ]);
  return (
    <AdminShell title="Dashboard">
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
    </AdminShell>
  );
}
