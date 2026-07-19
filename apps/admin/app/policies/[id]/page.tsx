import { AdminShell, DataTable, DetailList, DetailsDisclosure, ErrorPanel, StatusBanner } from "../../admin-ui";
import { readAdminApi, requireAdmin } from "../../session";

export default async function PolicyDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const statusParams = await searchParams;
  const { token, csrf } = await requireAdmin();
  const detail = await readAdminApi(`/admin/policies/${id}`, token);
  const policy = detail.policy ?? {};
  return (
    <AdminShell title="Policy Detail">
      <StatusBanner searchParams={statusParams} />
      <ErrorPanel payload={detail} />
      <DetailList items={[
        { label: "Policy id", value: policy.id },
        { label: "Version", value: policy.version },
        { label: "Status", value: policy.status },
        { label: "Clinical review", value: policy.clinical_review_state },
        { label: "Simulator", value: `/policies/${policy.version ?? id}/simulate` }
      ]} />
      <form className="form-grid" action="/api/admin-session/mutate" method="post">
        <h3>Edit draft</h3>
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="method" value="PATCH" />
        <input type="hidden" name="path" value={`/admin/policies/${policy.version ?? id}`} />
        <input type="hidden" name="redirectTo" value={`/policies/${policy.version ?? id}`} />
        <label>Status<select name="status" defaultValue={policy.status ?? "draft"}><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="published">Published</option></select></label>
        <label>Clinical review<select name="clinical_review_state" defaultValue={policy.clinical_review_state ?? "draft"}><option value="draft">Draft</option><option value="submitted">Submitted for review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
        <button type="submit">Save policy edit</button>
      </form>
      {["approve", "reject", "publish", "rollback"].map((action) => (
        <form key={action} className="form-grid" action="/api/admin-session/mutate" method="post">
          <h3>{action}</h3>
          <input type="hidden" name="csrf" value={csrf} />
          <input type="hidden" name="method" value="POST" />
          <input type="hidden" name="path" value={`/admin/policies/${policy.version ?? id}/${action}`} />
          <input type="hidden" name="redirectTo" value={`/policies/${policy.version ?? id}`} />
          <label>Rationale<input name="rationale" defaultValue={`Closed beta ${action} validation`} /></label>
          <button type="submit">{action}</button>
        </form>
      ))}
      <h3>Approvals</h3>
      <DataTable columns={["id", "reviewer_id", "decision", "rationale"]} rows={detail.approvals ?? []} />
      <DetailsDisclosure title="Rules" payload={policy.rules ?? {}} />
    </AdminShell>
  );
}
