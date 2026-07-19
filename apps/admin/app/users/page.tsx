import { AdminShell, DataTable, ErrorPanel } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function UsersPage() {
  const { token } = await requireAdmin();
  const users = await readAdminApi("/admin/users", token);
  const rows = (users.items ?? []).map((user: any) => ({ id: user.id, email: user.email_masked, role: user.role, deleted: user.deleted, open: `/users/${user.id}` }));
  return (
    <AdminShell title="Users">
      <ErrorPanel payload={users} />
      <DataTable columns={["id", "email", "role", "deleted", "open"]} rows={rows} />
    </AdminShell>
  );
}
