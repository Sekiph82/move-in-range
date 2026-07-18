# SECURITY REVIEW

Security review checks include no secrets in Git, role authorization, redaction, audit events, safe env templates, CORS, rate-limit hooks, dependency audit, Python audit, and prohibited file checks. Local npm audit currently reports moderate transitive findings in the Expo/Next dependency graph, including a PostCSS advisory with no npm-provided fix; CI fails high and critical advisories and reports the moderate set for review.
