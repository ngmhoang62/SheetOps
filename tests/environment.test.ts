import { describe, expect, it } from "vitest";
import {
  backendTarget,
  stagingSheet,
  assertStaging,
  deploymentStaging,
} from "../src/lib/environment";
const prod = "abcdefghijklmnopqrst";
const stage = "tsrqponmlkjihgfedcba";
describe("portable deployment isolation", () => {
  it("accepts owner identities and fails closed without declarations", () => {
    expect(
      backendTarget(`https://${prod}.supabase.co`, false, undefined, prod),
    ).toContain(prod);
    expect(
      backendTarget(`https://${stage}.supabase.co`, true, stage, prod),
    ).toContain(stage);
    expect(() =>
      backendTarget(`https://${stage}.supabase.co`, true, stage, ""),
    ).toThrow();
    expect(() =>
      backendTarget(`https://${prod}.supabase.co`, true, prod, prod),
    ).toThrow();
    expect(() =>
      backendTarget(`https://${stage}.supabase.co`, false, stage, prod),
    ).toThrow();
    expect(() => assertStaging({})).toThrow();
    expect(() =>
      assertStaging({
        APP_ENV: "staging",
        NEXT_PUBLIC_SUPABASE_URL: `https://${prod}.supabase.co`,
        NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF: prod,
        NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF: prod,
      }),
    ).toThrow();
  });
  it("rejects malformed URLs", () => {
    for (const url of [
      `http://${stage}.supabase.co`,
      `https://${stage}.supabase.co.evil.test`,
      `https://${stage}.supabase.co/path`,
      `https://user:pass@${stage}.supabase.co`,
      `https://${stage}.supabase.co/?x=1`,
    ])
      expect(() => backendTarget(url, true, stage, prod)).toThrow();
  });
  it("rejects missing, reused and mismatched sheet declarations", () => {
    expect(() => stagingSheet("stage", "stage", "prod")).not.toThrow();
    for (const args of [
      ["prod", "prod", "prod"],
      ["other", "stage", "prod"],
      ["stage", "stage", ""],
    ])
      expect(() =>
        stagingSheet(...(args as [string, string, string])),
      ).toThrow();
  });
  it("requires consistent deployment mode", () => {
    expect(
      deploymentStaging({ APP_ENV: "staging", VERCEL_ENV: "preview" }),
    ).toBe(true);
    for (const env of [
      {},
      { APP_ENV: "production", VERCEL_ENV: "preview" },
      { APP_ENV: "staging", VERCEL_ENV: "production" },
    ])
      expect(() => deploymentStaging(env)).toThrow();
  });
});
