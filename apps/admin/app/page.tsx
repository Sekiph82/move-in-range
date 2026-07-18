const roles = ["super_admin", "clinical_reviewer", "exercise_reviewer", "content_editor", "support", "analyst"];
const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8200").replace(/\/api\/v1\/?$/, "");

async function readApi(path: string, role = "super_admin") {
  try {
    const response = await fetch(`${apiBase}/api/v1${path}`, {
      cache: "no-store",
      headers: { "x-admin-role": role }
    });
    if (!response.ok) return { error: `API returned ${response.status}` };
    return response.json();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "API unavailable" };
  }
}

export default async function AdminHome() {
  const [policies, exercises, audit, simulation] = await Promise.all([
    readApi("/admin/policies", "clinical_reviewer"),
    readApi("/admin/exercises", "exercise_reviewer"),
    readApi("/admin/audit-logs", "support"),
    fetch(`${apiBase}/api/v1/admin/policy-simulator`, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json", "x-admin-role": "clinical_reviewer" },
      body: JSON.stringify({ energy: 2, sleep_quality: 3, pain: 7, available_minutes: 10, stress: 3 })
    }).then((response) => response.ok ? response.json() : { error: `API returned ${response.status}` }).catch((error) => ({ error: error instanceof Error ? error.message : "API unavailable" }))
  ]);

  return (
    <div className="shell">
      <nav className="nav" aria-label="Admin navigation">
        <h1>MoveInRange</h1>
        {["Policies", "Exercise Review", "Simulator", "Audit Logs", "Import Jobs", "Feature Flags"].map((item) => <a key={item} href={"#" + item}>{item}</a>)}
      </nav>
      <main className="main">
        <h2>Administration</h2>
        <p>Functional MVP administration reads real API data when the local FastAPI service is running on {apiBase}.</p>
        <section className="grid">
          <article className="card"><h3>Roles</h3><p>{roles.join(", ")}</p></article>
          <article className="card" id="Policies"><h3>Policies</h3><pre>{JSON.stringify(policies, null, 2)}</pre></article>
          <article className="card" id="Exercise Review"><h3>Exercise Review</h3><p>{exercises.items?.length ?? 0} exercises loaded for review.</p><pre>{JSON.stringify((exercises.items ?? []).slice(0, 3), null, 2)}</pre></article>
          <article className="card" id="Simulator"><h3>Simulator</h3><pre>{JSON.stringify(simulation, null, 2)}</pre></article>
          <article className="card" id="Audit Logs"><h3>Audit Logs</h3><pre>{JSON.stringify(audit, null, 2)}</pre></article>
          <article className="card"><h3>Safety Boundary</h3><p>No insulin dose calculation, medication recommendation, diagnosis, or clinician-plan override.</p></article>
        </section>
      </main>
    </div>
  );
}
