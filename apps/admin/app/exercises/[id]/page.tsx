import { AdminShell, DataTable, DetailList, DetailsDisclosure, ErrorPanel, StatusBanner } from "../../admin-ui";
import { readAdminApi, requireAdmin } from "../../session";

function listText(value: unknown) {
  return Array.isArray(value) ? value.join("\n") : "";
}

export default async function ExerciseDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const statusParams = await searchParams;
  const { admin, token, csrf } = await requireAdmin();
  const detail = await readAdminApi(`/admin/exercises/${id}`, token);
  const exercise = detail.exercise ?? {};
  const metadata = detail.metadata ?? {};
  const canEditContent = admin.role === "content_editor" || admin.role === "super_admin";
  const canReviewSafety = admin.role === "exercise_reviewer" || admin.role === "super_admin";
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
      {canEditContent ? (
        <>
          <form className="form-grid" action="/api/admin-session/mutate" method="post">
            <h3>Turkish translation</h3>
            <input type="hidden" name="csrf" value={csrf} />
            <input type="hidden" name="operation" value="exercise_translation_update" />
            <input type="hidden" name="exercise_id" value={id} />
            <input type="hidden" name="locale" value="tr" />
            <label>Turkish title<input name="title" defaultValue={detail.turkish?.name ?? ""} /></label>
            <label>Turkish instruction steps<textarea name="instruction_steps" defaultValue={detail.turkish?.instruction ?? ""} /></label>
            <label>Form cues<textarea name="form_cues" defaultValue={listText(metadata.tr_form_cues)} /></label>
            <label>Common mistakes<textarea name="common_mistakes" defaultValue={listText(metadata.tr_common_mistakes)} /></label>
            <label>Breathing cues<textarea name="breathing_cues" defaultValue={listText(metadata.tr_breathing_cues)} /></label>
            <label>Translation change reason<input name="change_reason" defaultValue="Closed beta translation review" /></label>
            <button type="submit">Save translation</button>
          </form>
          <form className="form-grid" action="/api/admin-session/mutate" method="post">
            <h3>Exercise metadata</h3>
            <input type="hidden" name="csrf" value={csrf} />
            <input type="hidden" name="operation" value="exercise_metadata_update" />
            <input type="hidden" name="exercise_id" value={id} />
            <label>Category<input name="category" defaultValue={metadata.category ?? exercise.body_part ?? ""} /></label>
            <label>Equipment<input name="equipment" defaultValue={exercise.equipment ?? ""} /></label>
            <label>Position<input name="position" defaultValue={metadata.position ?? ""} /></label>
            <label>Difficulty<input name="difficulty" defaultValue={metadata.difficulty ?? ""} /></label>
            <label>Metadata change reason<input name="change_reason" defaultValue="Closed beta metadata review" /></label>
            <button type="submit">Save metadata</button>
          </form>
        </>
      ) : null}
      {canReviewSafety ? (
        <>
          <form className="form-grid" action="/api/admin-session/mutate" method="post">
            <h3>Safety review</h3>
            <input type="hidden" name="csrf" value={csrf} />
            <input type="hidden" name="operation" value="exercise_safety_update" />
            <input type="hidden" name="exercise_id" value={id} />
            <label>Safety tags<textarea name="safety_tags" defaultValue={listText(metadata.safety_tags) || "closed_beta_reviewed"} /></label>
            <label>Restricted regions<textarea name="restricted_regions" defaultValue={listText(metadata.restricted_regions)} /></label>
            <label>Contraindication categories<textarea name="contraindication_categories" defaultValue={listText(metadata.contraindication_categories)} /></label>
            <label>Safety review reason<input name="review_reason" defaultValue="Closed beta safety review" /></label>
            <button type="submit">Save safety review</button>
          </form>
          <form className="form-grid" action="/api/admin-session/mutate" method="post">
            <h3>Add substitution</h3>
            <input type="hidden" name="csrf" value={csrf} />
            <input type="hidden" name="operation" value="exercise_substitution_add" />
            <input type="hidden" name="exercise_id" value={id} />
            <label>Substitution exercise id<input name="substitution_id" defaultValue="" /></label>
            <label>Substitution reason<input name="reason" defaultValue="Closed beta safer alternative" /></label>
            <button type="submit">Add substitution</button>
          </form>
          <form className="form-grid" action="/api/admin-session/mutate" method="post">
            <h3>Remove substitution</h3>
            <input type="hidden" name="csrf" value={csrf} />
            <input type="hidden" name="operation" value="exercise_substitution_remove" />
            <input type="hidden" name="exercise_id" value={id} />
            <label>Substitution exercise id<input name="substitution_id" defaultValue={(detail.substitution_ids ?? [])[0] ?? ""} /></label>
            <label>Removal reason<input name="reason" defaultValue="Closed beta substitution cleanup" /></label>
            <button type="submit">Remove substitution</button>
          </form>
          <DetailList items={[
            { label: "Safety review complete", value: detail.publication_preconditions?.safety_review_complete ? "yes" : "no" },
            { label: "Localized content complete", value: detail.publication_preconditions?.localized_content_complete ? "yes" : "no" },
            { label: "Publish eligible", value: detail.publication_preconditions?.eligible ? "yes" : "no" },
            { label: "Publish state", value: metadata.publish_state ?? "unpublished" }
          ]} />
          {["publish", "unpublish"].map((action) => (
            <form key={action} className="form-grid" action="/api/admin-session/mutate" method="post">
              <h3>{action}</h3>
              <input type="hidden" name="csrf" value={csrf} />
              <input type="hidden" name="operation" value={`exercise_${action}`} />
              <input type="hidden" name="exercise_id" value={id} />
              <label>Publication reason<input name="reason" defaultValue={`Closed beta ${action} validation`} /></label>
              <button type="submit">{action}</button>
            </form>
          ))}
        </>
      ) : null}
      <h3>Substitutions</h3>
      <DetailsDisclosure title="Approved substitutions" payload={detail.substitution_ids ?? []} />
      <h3>Safety Tags</h3>
      <DataTable columns={["id", "classifier_version", "provenance", "confidence", "manual_review_status"]} rows={detail.tags ?? []} />
      <h3>Media Review</h3>
      <DataTable columns={["id", "media_type", "license_state", "source", "status"]} rows={detail.media_approvals ?? []} />
      <DetailsDisclosure title="Instruction steps" payload={exercise.instruction_steps ?? []} />
    </AdminShell>
  );
}
