# Phase 2 API

All responses use private/no-store caching. JSON success: `{ "data": ... }`; failure: `{ "error": { "code": "...", "message": "...", "fields": {} } }`. Validation returns 422, unauthenticated 401, forbidden 403, missing order/user 404, unique/conflicting operation 409, oversized snapshot 413. Unhandled failures return a generic 500 and never credentials or raw provider errors.

Normal APIs use Supabase cookie sessions and an active current database profile. State-changing browser APIs require `Origin` equal to the request origin. JSON amount fields are **decimal strings**, not numbers.

| Endpoint                       | Method           | Permission / contract                                                                           |
| ------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------- |
| `/api/auth/login`              | POST             | Public, same-origin, `{email,password}`; no signup                                              |
| `/api/auth/logout`             | POST             | Same-origin, signs out cookie session                                                           |
| `/api/session`                 | GET              | Active user; own profile and organization                                                       |
| `/api/orders`                  | GET              | Active user; `page` >=1, `pageSize` 1–50, `search`, `from`, `to`, `status`, `sort`, `direction` |
| `/api/orders`                  | POST             | Admin/Editor; complete validated order input                                                    |
| `/api/orders/:id`              | GET/PATCH/DELETE | Read: active user; mutate: Admin/Editor; PATCH takes complete order input; DELETE soft-deletes  |
| `/api/dashboard/summary`       | GET              | Active user; date/status filters, exact SQL aggregates and ten recent orders                    |
| `/api/reports/monthly-revenue` | GET              | Same summary contract                                                                           |
| `/api/reports/export`          | GET              | Active user; filtered UTF-8 BOM CSV, formula-safe text, <=8,000 active rows                     |
| `/api/users`                   | GET              | Admin; provisioned profiles                                                                     |
| `/api/users/invite`            | POST             | Admin; `{full_name,email,role}`; provider acceptance is not confirmed email delivery            |
| `/api/users/:id/role`          | PATCH            | Admin; `{role}`; cannot alter own access                                                        |
| `/api/users/:id/disable`       | POST             | Admin; `{is_active}`; supports controlled reactivation                                          |
| `/api/settings`                | PATCH            | Admin; `{organization}`                                                                         |
| `/api/audit`                   | GET              | Admin; 100 latest persistent events                                                             |
| `/api/sync/connection`         | GET              | Admin; read actual Sheets metadata                                                              |
| `/api/sync/import/preview`     | POST             | Admin; rereads/validates source, returns rows/errors/hash/eligibility                           |
| `/api/sync/import/confirm`     | POST             | Admin; `{hash}`; reread source, atomic empty-table-only import                                  |
| `/api/sync/export`             | POST             | Admin; shared verified export service                                                           |
| `/api/sync/runs`               | GET              | Admin; 50 latest real runs                                                                      |
| `/api/cron/daily-export`       | GET              | Exact `Authorization: Bearer <CRON_SECRET>`; no cookie role accepted                            |

Order input: `order_code`, `customer_name`, `order_date` (actual ISO date), `status` (`pending/completed/cancelled`), `total_amount` (0 through 9223372036854775807 as text), `note` (optional, max 2,000 chars). Codes are normalized uppercase. Unknown mutation fields are rejected. Sort is allowlisted; amount sort is numeric in PostgreSQL, with UUID tie-breaker. Dates are inclusive. Date/status filters combine with literal/sanitized search. SQL snapshots provide consistent report exports and exact sums.

Auth callback: `/auth/callback?code=...` exchanges a code into cookies and redirects only to local `/auth/accept`; there is no open redirect. Invitation password setup requires a valid Supabase session. Direct admin pages return actual HTTP 403 through the proxy, not just hidden navigation.
