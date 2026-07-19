import { requireAdmin, readAdminApi, roleNavigation, apiBase } from "./session";

export default async function AdminHome() {
  const { admin, token, csrf } = await requireAdmin();
  const navItems = roleNavigation[admin.role];
  const [policies, exercises, audit, simulation] = await Promise.all([
    navItems.includes("Policies") ? readAdminApi("/admin/policies", token) : { error: "Forbidden" },
    navItems.includes("Exercise Review") ? readAdminApi("/admin/exercises", token) : { error: "Forbidden" },
    navItems.includes("Audit Logs") ? readAdminApi("/admin/audit-logs", token) : { error: "Forbidden" },
    navItems.includes("Simulator")
      ? fetch(`${apiBase}/api/v1/admin/policy-simulator`, {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ energy: 2, sleep_quality: 3, pain: 7, available_minutes: 10, stress: 3 })
        }).then((response) => response.ok ? response.json() : { error: `API returned ${response.status}` }).catch((error) => ({ error: error instanceof Error ? error.message : "API unavailable" }))
      : { error: "Forbidden" }
  ]);

  return (
    <div className="shell">
      <nav className="nav" aria-label="Admin navigation">
        <h1>MoveInRange</h1>
        <p className="role">{admin.email}<br />{admin.role}</p>
        {navItems.map((item) => <a key={item} href={"#" + item}>{item}</a>)}
        <form action="/api/admin-session/logout" method="post">
          <input type="hidden" name="csrf" value={csrf} />
          <button type="submit">Log out</button>
        </form>
      </nav>
      <main className="main">
        <h2>Administration</h2>
        <p>Authenticated administration reads API data from {apiBase}.</p>
        <section className="grid">
          <article className="card"><h3>Admin Session</h3><p>Signed in with a secure server-side session cookie.</p></article>
          <article className="card" id="Policies"><h3>Policies</h3><pre>{JSON.stringify(policies, null, 2)}</pre></article>
          <article className="card" id="Exercise Review"><h3>Exercise Review</h3><p>{exercises.items?.length ?? 0} exercises loaded for review.</p><pre>{JSON.stringify((exercises.items ?? []).slice(0, 3), null, 2)}</pre></article>
          <article className="card" id="Simulator"><h3>Simulator</h3><pre>{JSON.stringify(simulation, null, 2)}</pre></article>
          <article className="card" id="Audit Logs"><h3>Audit Logs</h3><pre>{JSON.stringify(audit, null, 2)}</pre></article>
          <article className="card"><h3>Safety Boundary</h3><p>No medication recommendation, diagnosis, or clinician-plan override.</p></article>
        </section>
      </main>
    </div>
  );
}
