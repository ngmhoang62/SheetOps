import { execFileSync } from "node:child_process";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { projectRef } from "../src/lib/environment";
let backupStage = "configuration";

export function backupConnection(
  value: string | undefined,
  expectedRef?: string,
) {
  const productionRef = projectRef(expectedRef);
  const url = new URL(value ?? "");
  const user = decodeURIComponent(url.username);
  const direct =
    url.hostname === `db.${productionRef}.supabase.co` && user === "postgres";
  const pooler =
    /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname) &&
    user === `postgres.${productionRef}`;
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    (!direct && !pooler) ||
    (url.port && url.port !== "5432") ||
    url.pathname !== "/postgres" ||
    !url.password
  )
    throw new Error("Expected production PostgreSQL session connection");
  return {
    PGHOST: url.hostname,
    PGPORT: "5432",
    PGDATABASE: "postgres",
    PGUSER: user,
    PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: "require",
  };
}

export function encryptedArchive(dump: Buffer, key = randomBytes(32)) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const body = Buffer.concat([cipher.update(dump), cipher.final()]);
  const tag = cipher.getAuthTag();
  const archive = Buffer.concat([Buffer.from("SHEETOPS1"), nonce, tag, body]);
  const check = createDecipheriv("aes-256-gcm", key, nonce);
  check.setAuthTag(tag);
  if (!Buffer.concat([check.update(body), check.final()]).equals(dump))
    throw new Error("Encryption verification failed");
  return { archive, key };
}

async function main() {
  if (process.env.RUN_DATABASE_BACKUP !== "1")
    throw new Error("Explicit backup opt-in required");
  const config = parseEnv(readFileSync(".env.backup.local", "utf8"));
  const productionRef = projectRef(
    config.NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF,
  );
  const connection = backupConnection(config.DATABASE_URL, productionRef);
  const image = "postgres:17-alpine";
  const env = { ...process.env, ...connection };
  const docker = (command: string[], input?: Buffer) => {
    try {
      return execFileSync("docker", command, {
        input,
        env,
        maxBuffer: 128 * 1024 * 1024,
        timeout: 300000,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      const detail = String((error as { stderr?: Buffer }).stderr ?? "");
      const kind = /Network is unreachable|no route to host/i.test(detail)
        ? "NETWORK_ROUTE_OR_IPV6"
        : /could not translate host name|no such host|Name does not resolve|Temporary failure/i.test(
              detail,
            )
          ? "DNS"
          : /password authentication failed/i.test(detail)
            ? "DATABASE_AUTHENTICATION"
            : /permission denied/i.test(detail)
              ? "DATABASE_OR_DOCKER_PERMISSION"
              : /server version mismatch/i.test(detail)
                ? "POSTGRES_VERSION"
                : "DOCKER_OR_DATABASE_CONNECTION";
      throw new Error(kind);
    }
  };
  // Only environment VARIABLE NAMES appear in process arguments. No host mounts or ports.
  const args = [
    "run",
    "--rm",
    ...Object.keys(connection).flatMap((k) => ["-e", k]),
    image,
  ];
  backupStage = "pg_dump";
  const dump = docker([
    ...args,
    "pg_dump",
    "-Fc",
    "--no-owner",

    "--schema=public",
    "--schema=private",
    "--schema=auth",
    "--schema=supabase_migrations",
  ]);
  if (dump.subarray(0, 5).toString() !== "PGDMP")
    throw new Error("Invalid PostgreSQL archive");
  backupStage = "archive_listing";
  const listing = docker(
    ["run", "--rm", "-i", "--network", "none", image, "pg_restore", "--list"],
    dump,
  ).toString();
  for (const required of [
    "TABLE DATA public orders",
    "TABLE DATA public audit_logs",
    "TABLE DATA auth users",
  ])
    if (!listing.includes(required))
      throw new Error("Backup is missing required tables");
  backupStage = "encryption_and_write";
  const { archive, key } = encryptedArchive(dump);
  const name =
    "sheetops-production-" + new Date().toISOString().replace(/[:.]/g, "-");
  const directory = resolve("output", "backups");
  mkdirSync(directory, { recursive: true });
  const archivePath = resolve(directory, name + ".pgdump.enc");
  const keyPath = resolve(directory, name + ".key.json");
  writeFileSync(archivePath, archive, { mode: 0o600 });
  writeFileSync(
    keyPath,
    JSON.stringify({
      format: "SHEETOPS1",
      algorithm: "aes-256-gcm",
      keyBase64: key.toString("base64"),
      archive: name + ".pgdump.enc",
    }),
    { mode: 0o600 },
  );
  key.fill(0);
  const manifest = {
    projectRef: productionRef,
    createdAt: new Date().toISOString(),
    image,
    archivePath,
    keyPath,
    encryptedSha256: createHash("sha256").update(archive).digest("hex"),
    plainSha256: createHash("sha256").update(dump).digest("hex"),
    bytes: archive.length,
    schemas: ["public", "private", "auth", "supabase_migrations"],
    excludes: [
      "Storage object bytes",
      "external credentials",
      "cluster roles/ownership (restore into a prepared Supabase target)",
    ],
    verification:
      "pg_restore listing and authenticated encryption round-trip passed; full Supabase restore not yet verified",
  };
  writeFileSync(
    resolve(directory, name + ".manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(JSON.stringify(manifest));
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/backup-database.ts"))
  main().catch((error: unknown) => {
    console.error(
      "Database backup failed; no credentials or provider details logged. Verify private backup connection and Docker availability.",
    );
    const safeCodes = [
      "NETWORK_ROUTE_OR_IPV6",
      "DNS",
      "DATABASE_AUTHENTICATION",
      "DATABASE_OR_DOCKER_PERMISSION",
      "POSTGRES_VERSION",
      "DOCKER_OR_DATABASE_CONNECTION",
    ];
    console.error(
      JSON.stringify({
        stage: backupStage,
        code:
          error instanceof Error && safeCodes.includes(error.message)
            ? error.message
            : "BACKUP_VALIDATION_FAILED",
      }),
    );
    process.exitCode = 1;
  });
