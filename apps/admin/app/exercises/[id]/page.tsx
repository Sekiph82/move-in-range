import { AdminShell, DataTable, DetailList, DetailsDisclosure, ErrorPanel } from "../../admin-ui";
import { readAdminApi, requireAdmin } from "../../session";

export default async function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token } = await requireAdmin();
  const detail = await readAdminApi(`/admin/exercises/${id}`, token);
  const exercise = detail.exercise ?? {};
  return (
    <AdminShell title="Exercise Detail">
      <ErrorPanel payload={detail} />
      <DetailList items={[
        { label: "Exercise id", value: exercise.id },
        { label: "Name", value: exercise.name },
        { label: "Body part", value: exercise.body_part },
        { label: "Equipment", value: exercise.equipment },
        { label: "Target", value: exercise.target },
        { label: "Media attribution", value: exercise.media?.attribution ?? "No external media committed" }
      ]} />
      <h3>Safety Tags</h3>
      <DataTable columns={["id", "classifier_version", "provenance", "confidence", "manual_review_status"]} rows={detail.tags ?? []} />
      <h3>Media Review</h3>
      <DataTable columns={["id", "media_type", "license_state", "source", "status"]} rows={detail.media_approvals ?? []} />
      <DetailsDisclosure title="Instruction steps" payload={exercise.instruction_steps ?? []} />
    </AdminShell>
  );
}
