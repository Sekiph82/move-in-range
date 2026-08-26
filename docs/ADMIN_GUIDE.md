# Admin Guide

Admin roles: super_admin, clinical_reviewer, exercise_reviewer, content_editor, support, analyst. Admin workflows include policy draft editing, clinical publishing, exercise classification review, policy simulation, safety event review, import jobs, feature flags, notification templates, and audit inspection.

Run the admin app locally on `http://localhost:3200`:

```powershell
cd <repo-root>
npm.cmd run admin
```

The admin app calls the API at `NEXT_PUBLIC_API_BASE_URL`, which must remain `http://localhost:8200` for local desktop validation. Server-side admin bootstrap credentials are `LOCAL_ADMIN_EMAIL` and `LOCAL_ADMIN_PASSWORD`; they must not be exposed through `NEXT_PUBLIC_*` variables.

Backend authorization is documented in `docs/ADMIN_AUTHORIZATION_MODEL.md`. Client-controlled role headers such as `x-admin-role` are not trusted.
