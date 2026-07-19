import { AdminShell, DetailList, ErrorPanel } from "../../../admin-ui";
import { apiBase, requireAdmin } from "../../../session";

export default async function PolicySimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token } = await requireAdmin();
  const response = await fetch(`${apiBase}/api/v1/admin/policy-simulator`, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ energy: 2, sleep_quality: 3, pain: 7, available_minutes: 10, stress: 3 })
  }).then((item) => item.ok ? item.json() : { error: `API returned ${item.status}` }).catch((error) => ({ error: error instanceof Error ? error.message : "API unavailable" }));
  return (
    <AdminShell title="Policy Simulator">
      <ErrorPanel payload={response} />
      <DetailList items={[
        { label: "Policy", value: id },
        { label: "Decision", value: response.decision?.action },
        { label: "Allowed", value: response.generated_plan_allowed },
        { label: "Policy version", value: response.decision?.policy_version },
        { label: "Explanation", value: response.decision?.explanation }
      ]} />
    </AdminShell>
  );
}
