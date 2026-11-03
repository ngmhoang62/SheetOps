import { describe, expect, it } from "vitest";
import { backupConnection, encryptedArchive } from "../scripts/backup-database";
describe("production backup guards", () => {
  it("accepts only the production direct/session-pooler target", () => {
    expect(
      backupConnection(
        "postgresql://postgres:test-only@db.ubaxgkqkfcrqbyshkidz.supabase.co:5432/postgres",
      ).PGPORT,
    ).toBe("5432");
    expect(
      backupConnection(
        "postgresql://postgres.ubaxgkqkfcrqbyshkidz:test-only@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
      ).PGSSLMODE,
    ).toBe("require");
    for (const url of [
      "postgresql://postgres:fake@evil.test:5432/postgres",
      "postgresql://postgres.msrmoffrfjhqijdfzzwm:fake@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
      "postgresql://postgres:fake@db.ubaxgkqkfcrqbyshkidz.supabase.co:6543/postgres",
    ])
      expect(() => backupConnection(url)).toThrow();
  });
  it("encrypts with a fresh nonce and verifies the round trip without plaintext output", () => {
    const data = Buffer.from("synthetic database fixture");
    const a = encryptedArchive(data);
    const b = encryptedArchive(data, a.key);
    expect(a.archive.subarray(0, 9).toString()).toBe("SHEETOPS1");
    expect(a.archive.includes(data)).toBe(false);
    expect(a.archive.equals(b.archive)).toBe(false);
    expect(a.key.length).toBe(32);
  });
});
