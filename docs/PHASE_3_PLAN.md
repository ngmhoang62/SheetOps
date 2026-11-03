# Phase 3 implementation plan

Milestones: (3.0) preserve production cron evidence and restore 23:00 after the test window; (3.1) create dev from verified main, enforce CI for dev/main/PR; (3.2–3.3) deploy isolated Preview with explicit backend and Sheets targets; (3.4) review authorization and prevent destructive tests targeting production; (3.5) document encrypted backups and isolated restore drill; (3.6) review query boundaries/region and runtime monitoring; (3.7) prepare a draft release for owner approval, never merge automatically.

Production baseline: 8da650f, 300 orders, 2 Auth accounts, 306 audit events, successful real 300-row import and manual export. At 14:45 UTC+7 on 2026-11-03 no scheduled run existed; 15:00 test remained future. Work proceeds on dev without waiting. Staging cloud and restore gates require independent infrastructure and credentials.

Choose a separate Free Singapore staging project when quota permits. Branching provides isolated credentials but is metered; do not provision it or upgrade billing automatically. No production personal data is copied into staging. Reuse migrations and deterministic generateOrders fixtures only. All evidence is recorded in PHASE_3_VERIFICATION.md.
