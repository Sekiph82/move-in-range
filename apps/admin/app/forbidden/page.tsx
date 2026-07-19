export default function ForbiddenPage() {
  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="forbidden-title">
        <h1 id="forbidden-title">Forbidden</h1>
        <p>This admin account cannot access that view. Bu hesap bu bolume erisemez.</p>
        <a href="/">Return to dashboard</a>
      </section>
    </main>
  );
}
