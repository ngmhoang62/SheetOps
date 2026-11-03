import { execFileSync } from "node:child_process";
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
import { generateOrders } from "../src/lib/seed";

// No cloud clients, environment files, credentials, host mounts or published ports.
async function main() {
  if (process.env.RUN_RESTORE_DRILL !== "1")
    throw new Error("Explicit restore opt-in required");
  const docker = (args: string[], input?: Buffer | string) =>
    execFileSync("docker", args, {
      input,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });
  let container: string | undefined;
  const start = Date.now();
  try {
    container = docker([
      "run",
      "--rm",
      "-d",
      "--network",
      "none",
      "-e",
      "POSTGRES_HOST_AUTH_METHOD=trust",
      "postgres:17-alpine",
    ])
      .toString()
      .trim();
    if (!/^[a-f0-9]{64}$/.test(container))
      throw new Error("Unexpected container ID");
    for (let i = 0; ; i++) {
      try {
        docker(["exec", container, "pg_isready", "-U", "postgres"]);
        break;
      } catch {
        if (i > 30) throw new Error("Local database unavailable");
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    const sql = (db: string, query: string) =>
      docker(
        [
          "exec",
          "-i",
          container!,
          "psql",
          "-U",
          "postgres",
          "-d",
          db,
          "-v",
          "ON_ERROR_STOP=1",
          "-At",
        ],
        query,
      )
        .toString()
        .trim();
    sql(
      "postgres",
      "create database drill_source; create database drill_target;",
    );
    const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'";
    const seeds = generateOrders();
    const rows = Array.from({ length: 2000 }, (_, i) => {
      const o = seeds[i % seeds.length];
      return [
        quote(`RESTORE-${i + 1}`),
        quote(o.customer_name),
        quote(o.order_date),
        quote(o.status),
        i === 0 ? "9007199254740993" : String(o.total_amount),
        quote(o.note),
      ].join(",");
    });
    sql(
      "drill_source",
      "create table orders (order_code text primary key, customer_name text not null, order_date date not null, status text check(status in ('completed','pending','cancelled')), total_amount bigint check(total_amount>=0), note text); insert into orders values " +
        rows.map((r) => "(" + r + ")").join(",") +
        "; create index orders_date on orders(order_date);",
    );
    const fingerprint =
      "select json_build_object('count',count(*),'total',sum(total_amount)::text,'digest',md5(string_agg(row_to_json(o)::text,E'\\n' order by order_code)))::text from orders o;";
    const before = sql("drill_source", fingerprint);
    const dump = docker([
      "exec",
      container,
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      "drill_source",
      "-Fc",
    ]);
    const key = randomBytes(32),
      nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    const encrypted = Buffer.concat([cipher.update(dump), cipher.final()]);
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAuthTag(cipher.getAuthTag());
    const restored = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    if (!dump.equals(restored))
      throw new Error("Encrypted backup verification failed");
    docker(
      [
        "exec",
        "-i",
        container,
        "pg_restore",
        "-U",
        "postgres",
        "-d",
        "drill_target",
        "--exit-on-error",
        "--no-owner",
        "--no-privileges",
      ],
      restored,
    );
    const after = sql("drill_target", fingerprint);
    if (before !== after) throw new Error("Restored rows differ");
    const indexes = sql(
      "drill_target",
      "select count(*) from pg_indexes where tablename='orders';",
    );
    if (indexes !== "2") throw new Error("Restored indexes missing");
    key.fill(0);
    console.log(
      JSON.stringify({
        restore: "PASS",
        encryptionRoundTrip: "AES-256-GCM PASS (ephemeral memory key)",
        rows: 2000,
        exactTotalsAndDigest: "MATCH",
        indexes: 2,
        dumpSha256: createHash("sha256").update(dump).digest("hex"),
        elapsedMs: Date.now() - start,
        scope:
          "isolated synthetic PostgreSQL only; not full Supabase/Auth disaster recovery",
      }),
    );
  } finally {
    // Delete only the container ID returned by this invocation; no volumes exist.
    if (container && /^[a-f0-9]{64}$/.test(container))
      docker(["rm", "-f", container]);
  }
}
main().catch(() => {
  console.error(
    "Synthetic restore drill failed; inspect Docker availability. No cloud data was accessed.",
  );
  process.exitCode = 1;
});
