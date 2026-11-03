import { afterEach, expect, it } from "vitest";
import {
  createSessionQueryClient,
  affectedResource,
} from "../src/lib/query-policy";
const clients: ReturnType<typeof createSessionQueryClient>[] = [];
const client = (scope: string) => {
  const c = createSessionQueryClient(scope);
  clients.push(c);
  return c;
};
afterEach(() => clients.forEach((c) => c.clear()));

it("deduplicates concurrent reads and reuses fresh data", async () => {
  const c = client("user-a");
  let calls = 0;
  const options = {
    queryKey: ["/api/orders"],
    queryFn: async () => {
      calls++;
      return { total: 300 };
    },
  };
  await Promise.all([c.fetchQuery(options), c.fetchQuery(options)]);
  await c.fetchQuery(options);
  expect(calls).toBe(1);
});
it("does not share cached private data across authenticated scopes", () => {
  const a = client("user-a"),
    b = client("user-b");
  a.setQueryData(["/api/users"], [{ email: "synthetic@example.invalid" }]);
  expect(b.getQueryData(["/api/users"])).toBeUndefined();
  a.clear();
  expect(a.getQueryData(["/api/users"])).toBeUndefined();
});
it("cancellation prevents an old response repopulating a cleared session", async () => {
  const c = client("old-session");
  let resolve!: (value: string) => void;
  const result = c
    .fetchQuery({
      queryKey: ["/api/users"],
      queryFn: () =>
        new Promise<string>((r) => {
          resolve = r;
        }),
    })
    .catch(() => undefined);
  await c.cancelQueries();
  c.clear();
  resolve("old private result");
  await result;
  expect(c.getQueryData(["/api/users"])).toBeUndefined();
});
it("invalidates order projections without invalidating users", async () => {
  const c = client("user-a");
  c.setQueryData(["/api/orders?page=1"], {});
  c.setQueryData(["/api/dashboard/summary"], {});
  c.setQueryData(["/api/users"], {});
  await c.invalidateQueries({
    predicate: (q) => affectedResource(String(q.queryKey[0]), "orders"),
  });
  expect(c.getQueryState(["/api/orders?page=1"])?.isInvalidated).toBe(true);
  expect(c.getQueryState(["/api/dashboard/summary"])?.isInvalidated).toBe(true);
  expect(c.getQueryState(["/api/users"])?.isInvalidated).toBe(false);
});
