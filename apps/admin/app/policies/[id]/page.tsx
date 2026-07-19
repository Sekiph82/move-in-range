import { AdminShell, DataTable, DetailList, DetailsDisclosure, ErrorPanel } from "../../admin-ui";
import { readAdminApi, requireAdmin } from "../../session";

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token } = await requireAdmin();
  const detail = await readAdminApi(`/admin/policies/${id}`, token);
  const policy = detail.policy ?? {};
  return (
    <AdminShell title="Policy Detail">
      <ErrorPanel payload={detail} />
      <DetailList items={[
        { label: "Policy id", value: policy.id },
        { label: "Version", value: policy.version },
        { label: "Status", value: policy.status },
        { label: "Clinical review", value: policy.clinical_review_state },
        { label: "Simulator", value: `/policies/${policy.version ?? id}/simulate` }
      ]} />
      <h3>Approvals</h3>
      <DataTable columns={["id", "reviewer_id", "decision", "rationale"]} rows={detail.approvals ?? []} />
      <DetailsDisclosure title="Rules" payload={policy.rules ?? {}} />
    </AdminShell>
  );
}
