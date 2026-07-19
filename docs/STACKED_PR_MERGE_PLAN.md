# Stacked PR Merge Plan

Do not merge automatically. Merge only after manual approval.

## 1. Merge PR #1

- Base: `main`
- Head: `codex/initial-moveinrange-platform`
- Expected CI: `validate` and `security` pass.
- Conflict check: compare PR #1 against current `main`.
- Rollback point: revert PR #1 merge commit if needed.
- Verification:
  ```powershell
  npm.cmd run test
  npm.cmd run build
  ```

## 2. Retarget PR #2 To Main

- Base: `main`
- Head: `codex/functional-mobile-mvp`
- Expected CI: re-run after retarget.
- Conflict check: inspect changed diff after PR #1 merge.
- Rollback point: do not merge PR #2 until diff is reviewed.

## 3. Merge PR #2

- Base: `main`
- Head: `codex/functional-mobile-mvp`
- Expected CI: green after retarget.
- Verification:
  ```powershell
  npm.cmd run test
  python -m pytest services/api/tests
  ```

## 4. Retarget PR #3 To Main

- Base: `main`
- Head: `codex/mvp-hardening`
- Expected CI: re-run after PR #2 merge.
- Conflict check: confirm hardening diff contains only incremental changes from PR #2.
- Rollback point: leave PR #3 draft/open if conflicts or CI failures appear.

## 5. Merge PR #3

- Base: `main`
- Head: `codex/mvp-hardening`
- Expected CI: green.
- Verification:
  ```powershell
  npm.cmd run security:check
  npm.cmd audit --audit-level=high
  ```

## 6. Retarget Release-Candidate PR To Main

- Base: `main`
- Head: `codex/release-candidate-validation`
- Expected CI: full release-candidate CI green.
- Conflict check: verify only release-candidate changes remain.
- Rollback point: keep PR draft until PostgreSQL/Redis/admin/mobile evidence is reviewed.

## 7. Final Release-Candidate Verification

```powershell
npm.cmd install
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
ruff check services/api
python -m pytest services/api/tests
npm.cmd run security:check
npm.cmd audit --audit-level=high
```

When Docker Desktop is available:

```powershell
docker compose down -v
docker compose up -d postgres redis
powershell -ExecutionPolicy Bypass -File scripts\validate-postgres.ps1
```

Merge the release-candidate PR only after manual Android/device validation is either completed or explicitly waived.

## 8. Retarget Complete Product Platform PR

- Base: `main` after PR #1, PR #2, PR #3, and the release-candidate PR are merged in order.
- Head: `codex/complete-product-platform`.
- Expected CI: `validate` and `security` pass, including `npm.cmd run checklist:check`.
- Conflict check: verify the diff contains only complete-product additions on top of release-candidate work.
- Blocked checks: external providers, physical devices, HealthKit, Health Connect, push credentials, licensed media, camera pose-estimation, and paid infrastructure stay blocked until real access exists.

Verification:

```powershell
npm.cmd install
npm.cmd run format:check
npm.cmd run lint
npm.cmd run checklist:check
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
ruff check services/api
python -m pytest services/api/tests
npm.cmd run security:check
npm.cmd audit --audit-level=high
```
