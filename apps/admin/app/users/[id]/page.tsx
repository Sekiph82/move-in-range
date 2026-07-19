import { AdminShell, DataTable, DetailList, ErrorPanel, StatusBanner } from "../../admin-ui";
import { readAdminApi, requireAdmin } from "../../session";

export default async function UserDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const statusParams = await searchParams;
  const { token, csrf } = await requireAdmin();
  const detail = await readAdminApi(`/admin/users/${id}`, token);
  return (
    <AdminShell title="User Detail">
      <StatusBanner searchParams={statusParams} />
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
      <form className="form-grid" action="/api/admin-session/mutate" method="post">
        <h3>User mutation</h3>
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="method" value="PATCH" />
        <input type="hidden" name="path" value={`/admin/users/${id}`} />
        <input type="hidden" name="redirectTo" value={`/users/${id}`} />
        <label>Action<select name="action" defaultValue="enable"><option value="enable">Enable</option><option value="disable">Disable</option><option value="update_role">Update role</option></select></label>
        <label>Role<select name="role" defaultValue={detail.user?.role ?? "user"}><option value="user">user</option><option value="support">support</option><option value="analyst">analyst</option><option value="content_editor">content_editor</option><option value="exercise_reviewer">exercise_reviewer</option><option value="clinical_reviewer">clinical_reviewer</option></select></label>
        <label>Reason<input name="reason" defaultValue="closed beta admin validation" /></label>
        <button type="submit">Save user change</button>
      </form>
      <h3>Plans</h3>
      <DataTable columns={["id", "plan_type", "status", "safety_action"]} rows={detail.plans ?? []} />
      <h3>Sessions</h3>
      <DataTable columns={["id", "status", "plan_id", "elapsed_seconds"]} rows={detail.sessions ?? []} />
      <h3>Consents</h3>
      <DataTable columns={["consent_type", "granted", "version"]} rows={detail.consents ?? []} />
    </AdminShell>
  );
}
