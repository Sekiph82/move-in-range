import { AdminShell, DataTable, DetailList, ErrorPanel } from "../../admin-ui";
import { readAdminApi, requireAdmin } from "../../session";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token } = await requireAdmin();
  const detail = await readAdminApi(`/admin/users/${id}`, token);
  return (
    <AdminShell title="User Detail">
      <ErrorPanel payload={detail} />
      <DetailList items={[
        { label: "User id", value: detail.user?.id },
        { label: "Email", value: detail.user?.email_masked },
        { label: "Role", value: detail.user?.role },
        { label: "Deleted", value: detail.user?.deleted },
        { label: "Onboarding", value: detail.profile_summary?.onboarding_complete },
        { label: "Conditions", value: detail.profile_summary?.conditions_count },
        { label: "Diabetes enabled", value: detail.profile_summary?.diabetes_enabled }
      ]} />
      <h3>Plans</h3>
      <DataTable columns={["id", "plan_type", "status", "safety_action"]} rows={detail.plans ?? []} />
      <h3>Sessions</h3>
      <DataTable columns={["id", "status", "plan_id", "elapsed_seconds"]} rows={detail.sessions ?? []} />
      <h3>Consents</h3>
      <DataTable columns={["consent_type", "granted", "version"]} rows={detail.consents ?? []} />
    </AdminShell>
  );
}
