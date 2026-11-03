# Phase 2 — Functional MVP

Phase 2 was explicitly authorized on 2026-11-02. Implementation is in the existing repository and Singapore project; Phase 1 history remains in Git, `PHASE_1.md` and historical verification/UAT sections.

The execution plan is [PHASE_2_IMPLEMENTATION_PLAN.md](PHASE_2_IMPLEMENTATION_PLAN.md). Read the current [architecture](ARCHITECTURE.md), [database/RLS and first Admin instructions](DATABASE.md), [API contract](API.md), [Google Sheets setup](GOOGLE_SHEETS_SETUP.md), [deployment/cron instructions](DEPLOYMENT.md) and [known limitations](KNOWN_LIMITATIONS.md).

The code uses real Supabase Auth/PostgreSQL and server-only Google API calls. It does not reuse mock roles or browser business persistence. No seed runs automatically. The PRD remains unchanged.

Final acceptance is based on actual results in `VERIFICATION.md`, including explicit BLOCKED cases. A blank source sheet, missing permanent Admin credentials, missing Vercel environment values, SMTP delivery or an unobserved scheduled run must never be relabeled as a successful end-to-end integration.

The current handover is [PHASE_2_ACCEPTANCE.md](PHASE_2_ACCEPTANCE.md): real 300-row import and production invitation/password/Viewer/disable UAT have since passed. Scheduled production export, a current-dataset production export read-back and independent Auth dashboard configuration inspection remain pending; see the evidence distinctions in that report.
