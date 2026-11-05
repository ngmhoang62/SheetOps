import { describe, expect, it } from "vitest";
import { validateDistinctSecrets } from "../scripts/staging-env";
describe("staging credential isolation", () => {
  it("rejects misleading production target declarations when local production is available", () => {
    expect(() =>
      validateDistinctSecrets(
        { NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst" },
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://tsrqponmlkjihgfedcba.supabase.co",
        },
      ),
    ).toThrow("Production reference declaration");
    expect(() =>
      validateDistinctSecrets(
        { PRODUCTION_GOOGLE_SPREADSHEET_ID: "declared" },
        { GOOGLE_SPREADSHEET_ID: "actual" },
      ),
    ).toThrow("Production spreadsheet declaration");
  });
  it.each(["SUPABASE_SECRET_KEY", "GOOGLE_PRIVATE_KEY", "CRON_SECRET"])(
    "rejects copied %s without returning its contents",
    (key) => {
      expect(() =>
        validateDistinctSecrets(
          { [key]: "test-value" },
          { [key]: "test-value" },
        ),
      ).toThrow(`Independent staging credential required for ${key}`);
    },
  );
  it("compares escaped and literal key newlines consistently", () => {
    expect(() =>
      validateDistinctSecrets(
        { GOOGLE_PRIVATE_KEY: "line1\\nline2" },
        { GOOGLE_PRIVATE_KEY: "line1\nline2" },
      ),
    ).toThrow();
  });
  it("accepts independent credentials and does not require a production file", () => {
    expect(() =>
      validateDistinctSecrets(
        { CRON_SECRET: "stage-only" },
        { CRON_SECRET: "prod-only" },
      ),
    ).not.toThrow();
    expect(() =>
      validateDistinctSecrets({ CRON_SECRET: "stage-only" }, {}),
    ).not.toThrow();
  });
});
