from fastapi.responses import HTMLResponse


RESET_PAGE_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Reset your MoveInRange password</title>
  <style>
    :root {
      color-scheme: light dark;
      --background: #f7f9f7;
      --surface: #ffffff;
      --text: #14211b;
      --muted: #5f6f68;
      --primary: #176b5c;
      --border: #d7e2dd;
      --danger: #a3332f;
      --success: #176b5c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--background);
      color: var(--text);
      display: grid;
      place-items: center;
      padding: 24px;
    }
    main {
      width: min(100%, 440px);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 12px 28px rgba(20, 33, 27, 0.08);
    }
    .brand {
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 8px;
    }
    h1 {
      font-size: 1.5rem;
      line-height: 1.2;
      margin: 0 0 8px;
    }
    p {
      color: var(--muted);
      line-height: 1.5;
      margin: 0 0 16px;
    }
    form, .field, .actions {
      display: grid;
      gap: 12px;
    }
    label {
      font-weight: 700;
    }
    input {
      width: 100%;
      min-height: 48px;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      font: inherit;
      color: var(--text);
      background: var(--surface);
    }
    button, a.button {
      min-height: 48px;
      border: 0;
      border-radius: 8px;
      background: var(--primary);
      color: #ffffff;
      font: inherit;
      font-weight: 800;
      text-align: center;
      text-decoration: none;
      display: inline-grid;
      place-items: center;
      padding: 12px 14px;
      cursor: pointer;
    }
    button.secondary {
      background: transparent;
      color: var(--primary);
      border: 1px solid var(--border);
    }
    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    [role="status"], [role="alert"] {
      min-height: 24px;
      line-height: 1.45;
    }
    [role="alert"] {
      color: var(--danger);
      font-weight: 700;
    }
    .success {
      color: var(--success);
      font-weight: 800;
    }
    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <main>
    <div class="brand">MoveInRange</div>
    <h1>Reset your password</h1>
    <p>Choose a new password for your MoveInRange account. This one-time link expires after 30 minutes.</p>
    <div id="status" role="status" aria-live="polite">Checking reset link...</div>
    <div id="error" role="alert" aria-live="assertive"></div>
    <form id="reset-form" class="hidden" novalidate>
      <div class="field">
        <label for="password">New password</label>
        <input id="password" name="password" type="password" autocomplete="new-password" minlength="10" required>
      </div>
      <div class="field">
        <label for="confirm-password">Confirm password</label>
        <input id="confirm-password" name="confirm-password" type="password" autocomplete="new-password" minlength="10" required>
      </div>
      <button class="secondary" id="toggle-password" type="button">Show password</button>
      <button id="submit-button" type="submit">Change password</button>
    </form>
    <div id="success" class="hidden">
      <p class="success">Your password has been changed successfully.</p>
      <div class="actions">
        <a class="button" href="moveinrange://auth/login" rel="noreferrer">Open MoveInRange</a>
      </div>
    </div>
  </main>
  <script>
    (function () {
      var resetToken = "";
      var statusEl = document.getElementById("status");
      var errorEl = document.getElementById("error");
      var form = document.getElementById("reset-form");
      var success = document.getElementById("success");
      var password = document.getElementById("password");
      var confirmPassword = document.getElementById("confirm-password");
      var togglePassword = document.getElementById("toggle-password");
      var submitButton = document.getElementById("submit-button");

      function captureToken() {
        var query = new URLSearchParams(window.location.search);
        var hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        var token = hash.get("token") || query.get("token") || "";
        window.history.replaceState({}, document.title, window.location.pathname);
        return token;
      }

      function setError(message) {
        statusEl.textContent = "";
        errorEl.textContent = message;
      }

      function codeMessage(code) {
        if (code === "expired_reset_token") return "This reset link has expired. Request a new password reset email.";
        if (code === "used_reset_token") return "This reset link has already been used. Request a new password reset email.";
        if (code === "weak_password") return "Use at least 10 characters with uppercase, lowercase, and a number.";
        if (code === "validation_error") return "This reset link is invalid or the password does not meet requirements.";
        if (code === "invalid_reset_token") return "This reset link is invalid. Request a new password reset email.";
        return "The request could not be completed. Check your connection and try again.";
      }

      function passwordIsStrong(value) {
        return value.length >= 10 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);
      }

      async function postJson(path, body) {
        var response = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          referrerPolicy: "no-referrer",
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          var payload = {};
          try { payload = await response.json(); } catch (_) {}
          throw new Error(codeMessage(payload.code || "network_error"));
        }
        return response.json();
      }

      async function validateToken() {
        resetToken = captureToken();
        if (!resetToken) {
          setError("This reset link is invalid. Request a new password reset email.");
          return;
        }
        try {
          await postJson("/api/v1/auth/reset-password/validate", { token: resetToken });
          errorEl.textContent = "";
          statusEl.textContent = "Enter a new password.";
          form.classList.remove("hidden");
        } catch (error) {
          setError(error.message);
        }
      }

      togglePassword.addEventListener("click", function () {
        var show = password.type === "password";
        password.type = show ? "text" : "password";
        confirmPassword.type = show ? "text" : "password";
        togglePassword.textContent = show ? "Hide password" : "Show password";
      });

      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        errorEl.textContent = "";
        if (password.value !== confirmPassword.value) {
          setError("Passwords do not match.");
          return;
        }
        if (!passwordIsStrong(password.value)) {
          setError("Use at least 10 characters with uppercase, lowercase, and a number.");
          return;
        }
        submitButton.disabled = true;
        statusEl.textContent = "Changing password...";
        try {
          await postJson("/api/v1/auth/reset-password", { token: resetToken, password: password.value });
          resetToken = "";
          password.value = "";
          confirmPassword.value = "";
          form.classList.add("hidden");
          statusEl.textContent = "";
          success.classList.remove("hidden");
        } catch (error) {
          setError(error.message);
        } finally {
          submitButton.disabled = false;
        }
      });

      validateToken();
    })();
  </script>
</body>
</html>
"""


RESET_PAGE_HEADERS = {
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "referrer-policy": "no-referrer",
    "x-robots-tag": "noindex, nofollow",
}


def password_reset_page() -> HTMLResponse:
    return HTMLResponse(RESET_PAGE_HTML, headers=RESET_PAGE_HEADERS)
