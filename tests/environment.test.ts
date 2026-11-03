import { describe, expect, it } from "vitest";
import {
  backendTarget,
  productionRef,
  productionSheet,
  stagingSheet,
  assertStaging,
} from "../src/lib/environment";
describe("deployment isolation", () => {
  const ref = "abcdefghijklmnopqrst";
  it("pins production and rejects an unconfigured preview", () => {
    expect(
      backendTarget(`https://${productionRef}.supabase.co`, false),
    ).toContain(productionRef);
    expect(() =>
      backendTarget(`https://${productionRef}.supabase.co`, true),
    ).toThrow();
    expect(() =>
      backendTarget(
        `https://${productionRef}.supabase.co`,
        true,
        productionRef,
      ),
    ).toThrow();
  });
  it("only accepts an explicit independent HTTPS staging ref", () => {
    expect(backendTarget(`https://${ref}.supabase.co`, true, ref)).toContain(
      ref,
    );
    for (const url of [
      `http://${ref}.supabase.co`,
      `https://${ref}.supabase.co.evil.test`,
      `https://${ref}.supabase.co/path`,
      `https://user:pass@${ref}.supabase.co`,
    ])
      expect(() => backendTarget(url, true, ref)).toThrow();
    expect(() =>
      backendTarget(
        "https://mkobuvmadimunvfgzzuy.supabase.co",
        true,
        "mkobuvmadimunvfgzzuy",
      ),
    ).toThrow();
  });
  it("prevents production cleanup tests even with opt-in", () => {
    expect(() =>
      assertStaging({
        APP_ENV: "staging",
        NEXT_PUBLIC_SUPABASE_URL: `https://${productionRef}.supabase.co`,
        NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF: productionRef,
      }),
    ).toThrow();
    expect(() => assertStaging({})).toThrow();
  });
  it("refuses production or mismatching spreadsheet IDs", () => {
    expect(() => stagingSheet(productionSheet, productionSheet)).toThrow();
    expect(() => stagingSheet("different", "stage")).toThrow();
    expect(() => stagingSheet("stage", "stage")).not.toThrow();
  });
});
