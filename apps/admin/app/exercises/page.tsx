import { AdminShell, DataTable, ErrorPanel } from "../admin-ui";
import { readAdminApi, requireAdmin } from "../session";

export default async function ExercisesPage() {
  const { token } = await requireAdmin();
  const exercises = await readAdminApi("/admin/exercises", token);
  const rows = (exercises.items ?? []).map((item: any) => ({ id: item.id, name: item.name, body_part: item.body_part, equipment: item.equipment, target: item.target, open: `/exercises/${item.id}` }));
  return (
    <AdminShell title="Exercises">
      <ErrorPanel payload={exercises} />
      <DataTable columns={["id", "name", "body_part", "equipment", "target", "open"]} rows={rows} />
    </AdminShell>
  );
}
