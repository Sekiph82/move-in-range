import { AdminShell, DataTable, ErrorPanel, StatusBanner } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { token } = await requireAdmin();
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.role) query.set("role", params.role);
  const users = await readAdminApi(`/admin/users?${query.toString()}`, token);
  const rows = (users.items ?? []).map((user: any) => ({ id: user.id, email: user.email_masked, role: user.role, deleted: user.deleted, open: `/users/${user.id}` }));
  return (
    <AdminShell title="Users">
      <StatusBanner searchParams={params} />
      <ErrorPanel payload={users} />
      <form className="form-grid" action="/users" method="get">
        <h3>Search users</h3>
        <label>Email search<input name="q" defaultValue={params.q ?? ""} /></label>
        <label>Role filter<input name="role" defaultValue={params.role ?? ""} /></label>
        <button type="submit">Search</button>
      </form>
      <p>Page {users.pagination?.page ?? 1} of {Math.max(1, Math.ceil((users.pagination?.total ?? 0) / 50))}</p>
      <DataTable columns={["id", "email", "role", "deleted", "open"]} rows={rows} />
    </AdminShell>
  );
}
