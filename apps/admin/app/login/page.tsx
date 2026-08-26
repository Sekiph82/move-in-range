const messages: Record<string, string> = {
  invalid_credentials: "Invalid email or password. E-posta veya parola hatali.",
  session_expired: "Your session expired. Oturum suresi doldu.",
  account_disabled: "This account is disabled. Bu hesap devre disi.",
  rate_limited: "Too many attempts. Cok fazla deneme yapildi.",
  api_unavailable: "Admin API is unavailable. Admin API kullanilamiyor."
};

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error = params?.error;
  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <h1 id="login-title">MoveInRange Admin</h1>
        <p>Sign in to continue. Devam etmek icin giris yapin.</p>
        {error ? <p className="error" role="alert">{messages[error] ?? messages.api_unavailable}</p> : null}
        <form action="/api/admin-session/login" method="post">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required minLength={3} maxLength={320} />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={128} />
          <button type="submit">Sign in</button>
        </form>
      </section>
    </main>
  );
}
