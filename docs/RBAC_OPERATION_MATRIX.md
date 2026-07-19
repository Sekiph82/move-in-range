# RBAC Operation Matrix

Backend authorization is authoritative. Frontend operation visibility uses the same allowed-role sets.

| Operation | super_admin | clinical_reviewer | exercise_reviewer | content_editor | support | analyst |
| --- | --- | --- | --- | --- | --- | --- |
| user_disable | ALLOWED | DENIED | DENIED | DENIED | ALLOWED | DENIED |
| user_enable | ALLOWED | DENIED | DENIED | DENIED | ALLOWED | DENIED |
| user_role_update | ALLOWED | DENIED | DENIED | DENIED | DENIED | DENIED |
| exercise_translation_update | ALLOWED | DENIED | DENIED | ALLOWED | DENIED | DENIED |
| exercise_safety_update | ALLOWED | DENIED | ALLOWED | DENIED | DENIED | DENIED |
| exercise_substitution_add | ALLOWED | DENIED | ALLOWED | DENIED | DENIED | DENIED |
| exercise_publish | ALLOWED | DENIED | ALLOWED | DENIED | DENIED | DENIED |
| exercise_unpublish | ALLOWED | DENIED | ALLOWED | DENIED | DENIED | DENIED |
| policy_draft_create | ALLOWED | DENIED | DENIED | ALLOWED | DENIED | DENIED |
| policy_draft_update | ALLOWED | DENIED | DENIED | ALLOWED | DENIED | DENIED |
| policy_submit | ALLOWED | DENIED | DENIED | ALLOWED | DENIED | DENIED |
| policy_approve | DENIED | CONDITIONAL | DENIED | DENIED | DENIED | DENIED |
| policy_reject | DENIED | CONDITIONAL | DENIED | DENIED | DENIED | DENIED |
| policy_publish | ALLOWED | DENIED | DENIED | DENIED | DENIED | DENIED |
| policy_rollback | ALLOWED | DENIED | DENIED | DENIED | DENIED | DENIED |
| privacy_job_process | ALLOWED | DENIED | DENIED | DENIED | ALLOWED | DENIED |
| privacy_job_retry | ALLOWED | DENIED | DENIED | DENIED | ALLOWED | DENIED |
| notification_retry | ALLOWED | DENIED | DENIED | DENIED | ALLOWED | ALLOWED |
| notification_cancel | ALLOWED | DENIED | DENIED | DENIED | ALLOWED | DENIED |
| integration_retry_sync | ALLOWED | DENIED | DENIED | DENIED | DENIED | ALLOWED |
| integration_disable | ALLOWED | DENIED | DENIED | DENIED | DENIED | DENIED |
| integration_revoke | ALLOWED | DENIED | DENIED | DENIED | DENIED | DENIED |

Conditional rules:

- `policy_approve` and `policy_reject`: clinical reviewer only, denied when the same admin created the policy version.
- `policy_publish`: super admin only, denied until clinical review state is approved and an approver is persisted.
- `exercise_translation_update`: content editor or super admin for non-clinical content fields only.
- `exercise_safety_update`, `exercise_substitution_add`, `exercise_publish`, and `exercise_unpublish`: exercise reviewer or super admin for safety/publication fields.
- `privacy_job_process`: support or super admin for implemented local job types; legal certification remains a manual external process.

Test evidence:

- Backend: `test_release_rehearsal_admin_rbac_matrix_and_separation`
- Static frontend proxy: `admin mutation proxy uses typed allowlisted operations instead of browser supplied backend paths`
- Browser: `Playwright admin acceptance performs login, navigation, screenshots, logout, and CSRF rejection`
