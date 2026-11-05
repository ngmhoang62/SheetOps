# Inventory file bàn giao

Phân loại từng file source nhánh handover, gồm đợt hoàn thiện cuối; không liệt kê artifacts ignored hoặc dữ liệu riêng tư. KEEP bao gồm file mới cần giao. Không file tracked nào bị xóa. Đọc cùng [audit](HANDOVER_AUDIT.md) và [rà soát cuối](HANDOVER_FINAL_REVIEW.md).

| File                                                              | Phân loại | Lý do                                                  |
| ----------------------------------------------------------------- | --------- | ------------------------------------------------------ |
| .env.backup.example                                               | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| .env.example                                                      | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| .env.staging.example                                              | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| .gitattributes                                                    | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| .github/workflows/ci.yml                                          | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| .gitignore                                                        | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| .prettierignore                                                   | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| AGENTS.md                                                         | REFACTOR  | Policy trung lập tài khoản; quyền của chủ mới          |
| README.md                                                         | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| components.json                                                   | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/API.md                                                       | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/ARCHITECTURE.md                                              | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/BACKUP_RESTORE.md                                            | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/DATABASE.md                                                  | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/DEPLOYMENT.md                                                | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/GOOGLE_SHEETS_SETUP.md                                       | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/HANDOVER_AUDIT.md                                            | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/HANDOVER_FINAL_REVIEW.md                                     | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/HANDOVER_INVENTORY.md                                        | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/HANDOVER_VERIFICATION.md                                     | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/HIDE_RESTORE.md                                              | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/IMPLEMENTATION_PLAN.md                                       | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/KNOWN_LIMITATIONS.md                                         | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/OPERATIONS_RUNBOOK.md                                        | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/PERFORMANCE_BASELINE.md                                      | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/PERFORMANCE_ENGINEERING.md                                   | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/PERFORMANCE_FOLLOWUP.md                                      | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/PERFORMANCE_RESULTS.md                                       | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/PERFORMANCE_VERIFICATION.md                                  | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/PHASE_1.md                                                   | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/PHASE_2.md                                                   | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/PHASE_2_ACCEPTANCE.md                                        | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/PHASE_2_IMPLEMENTATION_PLAN.md                               | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/PHASE_3_PLAN.md                                              | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/PHASE_3_VERIFICATION.md                                      | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/PRD.md                                                       | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/PREVIEW_TESTING.md                                           | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/RELEASE_2026_11_04.md                                        | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/RELEASE_PROCESS.md                                           | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/RETRY_BEHAVIOR.md                                            | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/SECURITY.md                                                  | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/STAGING_SETUP.md                                             | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/UAT.md                                                       | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/UI_AUDIT_VERIFICATION.md                                     | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/VERIFICATION.md                                              | REFACTOR  | Phân biệt setup/workflow hiện hành với lịch sử         |
| docs/archive/ARCHITECTURE-before-final.md                         | ARCHIVE   | Bằng chứng trước bàn giao; không cấu hình cài mới      |
| docs/archive/DATABASE.md                                          | ARCHIVE   | Bằng chứng trước bàn giao; không cấu hình cài mới      |
| docs/archive/DEPLOYMENT.md                                        | ARCHIVE   | Bằng chứng trước bàn giao; không cấu hình cài mới      |
| docs/archive/README-before-handover.md                            | ARCHIVE   | Bằng chứng trước bàn giao; không cấu hình cài mới      |
| docs/archive/README.md                                            | ARCHIVE   | Bằng chứng trước bàn giao; không cấu hình cài mới      |
| docs/archive/RELEASE_PROCESS-before-final.md                      | ARCHIVE   | Bằng chứng trước bàn giao; không cấu hình cài mới      |
| docs/archive/STAGING_SETUP.md                                     | ARCHIVE   | Bằng chứng trước bàn giao; không cấu hình cài mới      |
| docs/screenshots/dashboard-desktop.png                            | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/screenshots/dashboard-mobile.png                             | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/screenshots/orders-desktop.png                               | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/screenshots/phase2-dashboard.png                             | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| docs/setup/01-prerequisites.md                                    | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/02-github.md                                           | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/03-supabase.md                                         | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/04-google-cloud.md                                     | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/05-spreadsheet.md                                      | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/06-local.md                                            | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/07-vercel.md                                           | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/08-first-admin.md                                      | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/09-smtp.md                                             | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/10-verification.md                                     | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/11-staging.md                                          | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/12-operations.md                                       | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/13-development-workflow.md                             | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/ENVIRONMENT.md                                         | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/README.md                                              | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/screenshots/06-local-login-mobile.png                  | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/screenshots/06-local-login.png                         | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| docs/setup/screenshots/README.md                                  | KEEP      | Hướng dẫn người nhận hoặc ảnh local đã xác minh        |
| eslint.config.mjs                                                 | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| next-env.d.ts                                                     | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| next.config.ts                                                    | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| package-lock.json                                                 | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| package.json                                                      | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| postcss.config.mjs                                                | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| scripts/backup-database.ts                                        | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| scripts/benchmark-performance.ts                                  | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| scripts/bootstrap-admin.ts                                        | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| scripts/preview-traffic.ts                                        | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| scripts/responsive-check.ts                                       | KEEP      | Vận hành/backup/kiểm thử có guards                     |
| scripts/seed-source-orders.ts                                     | KEEP      | Vận hành/backup/kiểm thử có guards                     |
| scripts/seed.ts                                                   | KEEP      | Vận hành/backup/kiểm thử có guards                     |
| scripts/staging-env.ts                                            | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| scripts/start-staging.ts                                          | KEEP      | Vận hành/backup/kiểm thử có guards                     |
| scripts/verify-audit-ui.ts                                        | KEEP      | Vận hành/backup/kiểm thử có guards                     |
| scripts/verify-cloud.ts                                           | KEEP      | Vận hành/backup/kiểm thử có guards                     |
| scripts/verify-e2e.ts                                             | KEEP      | Vận hành/backup/kiểm thử có guards                     |
| scripts/verify-install-db.ts                                      | KEEP      | Vận hành/backup/kiểm thử có guards                     |
| scripts/verify-preview-smoke.ts                                   | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| scripts/verify-product.ts                                         | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| scripts/verify-restore.ts                                         | KEEP      | Vận hành/backup/kiểm thử có guards                     |
| scripts/verify-sync-failure.ts                                    | KEEP      | Vận hành/backup/kiểm thử có guards                     |
| src/app/api/audit/route.ts                                        | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/auth/login/route.ts                                   | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/auth/logout/route.ts                                  | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/cron/daily-export/route.ts                            | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/dashboard/summary/route.ts                            | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/orders/[id]/restore/route.ts                          | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/orders/[id]/route.ts                                  | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/orders/route.ts                                       | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/reports/export/route.ts                               | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/reports/monthly-revenue/route.ts                      | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/session/route.ts                                      | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/settings/route.ts                                     | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/sync/connection/route.ts                              | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/sync/export/route.ts                                  | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/sync/import/confirm/route.ts                          | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/sync/import/preview/route.ts                          | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/sync/runs/route.ts                                    | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/users/[id]/disable/route.ts                           | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/users/[id]/role/route.ts                              | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/users/invite/route.ts                                 | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/api/users/route.ts                                        | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/auth/accept/page.tsx                                      | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/auth/callback/route.ts                                    | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/dashboard/page.tsx                                        | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/error.tsx                                                 | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/globals.css                                               | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/icon.svg                                                  | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/layout.tsx                                                | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/loading.tsx                                               | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/login/page.tsx                                            | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/not-found.tsx                                             | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/orders/page.tsx                                           | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/page.tsx                                                  | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/reports/page.tsx                                          | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/settings/page.tsx                                         | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/sync/page.tsx                                             | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/app/users/page.tsx                                            | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/components/admin-view.tsx                                     | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/components/analytics-view.tsx                                 | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/components/audit-view.tsx                                     | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/components/login-view.tsx                                     | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/components/orders-view.tsx                                    | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/components/resource.ts                                        | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/components/shared.tsx                                         | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/components/shell.tsx                                          | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/components/ui/button.tsx                                      | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/components/ui/dialog.tsx                                      | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/components/workspace-provider.tsx                             | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/access-notice.ts                                          | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/analytics.ts                                              | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/audit.ts                                                  | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/contracts.ts                                              | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/cron-auth.ts                                              | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/domain.ts                                                 | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/environment.ts                                            | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| src/lib/invitations.ts                                            | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/order-filter.ts                                           | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/query-policy.ts                                           | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/seed.ts                                                   | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/server/http.ts                                            | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/server/orders.ts                                          | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/server/sheets.ts                                          | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| src/lib/server/users.ts                                           | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/sheets-format.ts                                          | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/supabase/browser.ts                                       | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| src/lib/supabase/server.ts                                        | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| src/lib/supabase/transport.ts                                     | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/lib/utils.ts                                                  | KEEP      | Chức năng hiện có, không refactor nghiệp vụ            |
| src/proxy.ts                                                      | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| supabase/migrations/20261102083706_phase2_foundation.sql          | KEEP      | Schema/RLS/RPC/audit theo lịch sử                      |
| supabase/migrations/20261102083948_phase2_transactions.sql        | KEEP      | Schema/RLS/RPC/audit theo lịch sử                      |
| supabase/migrations/20261102085245_phase2_hardening.sql           | REFACTOR  | Conditional platform helper REVOKE; giữ security guard |
| supabase/migrations/20261102085436_phase2_numeric_sort.sql        | KEEP      | Schema/RLS/RPC/audit theo lịch sử                      |
| supabase/migrations/20261102090827_phase2_rate_and_completion.sql | KEEP      | Schema/RLS/RPC/audit theo lịch sử                      |
| supabase/migrations/20261103135713_order_visibility.sql           | KEEP      | Schema/RLS/RPC/audit theo lịch sử                      |
| supabase/migrations/20261103174506_audit_pagination.sql           | KEEP      | Schema/RLS/RPC/audit theo lịch sử                      |
| tests/access-redirect.test.ts                                     | REFACTOR  | Fixture/guards độc lập với ID chủ cũ                   |
| tests/audit.test.ts                                               | KEEP      | Regression và security contracts                       |
| tests/backup.test.ts                                              | REFACTOR  | Fixture/guards độc lập với ID chủ cũ                   |
| tests/database-retry.test.ts                                      | KEEP      | Regression và security contracts                       |
| tests/domain.test.ts                                              | KEEP      | Regression và security contracts                       |
| tests/environment.test.ts                                         | REFACTOR  | Fixture/guards độc lập với ID chủ cũ                   |
| tests/invitations.test.ts                                         | KEEP      | Regression và security contracts                       |
| tests/phase2.test.ts                                              | KEEP      | Regression và security contracts                       |
| tests/preview-traffic.test.ts                                     | REFACTOR  | Fixture/guards độc lập với ID chủ cũ                   |
| tests/query-policy.test.ts                                        | KEEP      | Regression và security contracts                       |
| tests/seed-source-orders.test.ts                                  | KEEP      | Regression và security contracts                       |
| tests/staging-env.test.ts                                         | REFACTOR  | Fixture/guards độc lập với ID chủ cũ                   |
| tests/staging-transaction.test.ts                                 | KEEP      | Regression và security contracts                       |
| tests/upstream-transport.test.ts                                  | KEEP      | Regression và security contracts                       |
| tsconfig.json                                                     | REFACTOR  | Cấu hình portable hoặc phạm vi kiểm tra                |
| vercel.json                                                       | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
| vitest.config.mts                                                 | KEEP      | Cấu hình/đặc tả/bằng chứng nguồn                       |
