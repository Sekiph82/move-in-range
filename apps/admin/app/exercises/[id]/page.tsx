import { AdminShell, DataTable, DetailList, DetailsDisclosure, ErrorPanel, StatusBanner } from "../../admin-ui";
import { readAdminApi, requireAdmin } from "../../session";

export default async function ExerciseDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const statusParams = await searchParams;
  const { token, csrf } = await requireAdmin();
  const detail = await readAdminApi(`/admin/exercises/${id}`, token);
  const exercise = detail.exercise ?? {};
  return (
    <AdminShell title="Exercise Detail">
      <StatusBanner searchParams={statusParams} />
      <ErrorPanel payload={detail} />
      <DetailList items={[
        { label: "Exercise id", value: exercise.id },
        { label: "Name", value: exercise.name },
        { label: "Body part", value: exercise.body_part },
        { label: "Equipment", value: exercise.equipment },
        { label: "Target", value: exercise.target },
        { label: "Media attribution", value: exercise.media?.attribution ?? "No external media committed" }
      ]} />
      <form className="form-grid" action="/api/admin-session/mutate" method="post">
        <h3>Exercise content and safety</h3>
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="operation" value="exercise_content_update" />
        <input type="hidden" name="exercise_id" value={id} />
        <label>Turkish title<input name="turkish_title" defaultValue={detail.turkish?.name ?? ""} /></label>
        <label>Turkish instructions<textarea name="turkish_instructions" defaultValue={detail.turkish?.instruction ?? ""} /></label>
        <label>Body part<input name="body_part" defaultValue={exercise.body_part ?? ""} /></label>
        <label>Equipment<input name="equipment" defaultValue={exercise.equipment ?? ""} /></label>
        <label>Safety tags<input name="safety_tags" defaultValue="closed_beta_reviewed" /></label>
        <label>Restricted regions<input name="restricted_regions" defaultValue="knees" /></label>
        <label>Substitution exercise id<input name="substitution_id" defaultValue="" /></label>
        <label>Publish state<select name="publish_state" defaultValue="published"><option value="published">Publish</option><option value="unpublished">Unpublish</option></select></label>
        <button type="submit">Save exercise change</button>
      </form>
      <h3>Safety Tags</h3>
      <DataTable columns={["id", "classifier_version", "provenance", "confidence", "manual_review_status"]} rows={detail.tags ?? []} />
      <h3>Media Review</h3>
      <DataTable columns={["id", "media_type", "license_state", "source", "status"]} rows={detail.media_approvals ?? []} />
      <DetailsDisclosure title="Instruction steps" payload={exercise.instruction_steps ?? []} />
    </AdminShell>
  );
}
