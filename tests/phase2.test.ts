import { describe, it, expect } from "vitest";
import { validCronHeader } from "../src/lib/cron-auth";
import {
  liveOrderInput,
  amountSchema,
  exactMoney,
  safeCSV,
  type LiveOrder,
} from "../src/lib/contracts";
import {
  inputHeaders,
  outputHeaders,
  parseSheet,
  snapshotHash,
  normalizeRows,
  exportRows,
} from "../src/lib/sheets-format";
const row = [
  "SO-EXACT",
  "Khách kiểm thử",
  "2026-11-02",
  "completed",
  "9007199254740993",
  "",
];
describe("cron authorization", () => {
  it("requires the exact bearer header and handles malformed Unicode safely", () => {
    expect(validCronHeader(null, "test-secret")).toBe(false);
    expect(validCronHeader("Bearer wrong", "test-secret")).toBe(false);
    expect(validCronHeader("Bearer test-secret", undefined)).toBe(false);
    expect(validCronHeader("Bearer test-secret", "test-secret")).toBe(true);
    expect(validCronHeader("Bearer ééééééééééé", "test-secret")).toBe(false);
  });
});
describe("Phase 2 precise money", () => {
  it("preserves integers above Number.MAX_SAFE_INTEGER", () => {
    expect(amountSchema.parse("9007199254740993")).toBe("9007199254740993");
    expect(exactMoney("9007199254740993")).toContain("9.007.199.254.740.993");
  });
  it.each(["-1", "1.5", "1e6", "NaN", "", "9223372036854775808", "00"])(
    "rejects invalid integer %s",
    (v) => expect(amountSchema.safeParse(v).success).toBe(false),
  );
  it("accepts BIGINT boundary", () =>
    expect(amountSchema.safeParse("9223372036854775807").success).toBe(true));
});
describe("Sheets parsing and snapshots", () => {
  it("reads canonical string rows exactly", () => {
    const p = parseSheet([inputHeaders, row]);
    expect(p.errors).toEqual([]);
    expect(p.orders[0].total_amount).toBe("9007199254740993");
  });
  it("rejects headers, duplicate normalized codes, impossible dates and unsafe numeric cells", () => {
    expect(
      parseSheet([[...inputHeaders].reverse(), row]).errors.length,
    ).toBeGreaterThan(0);
    expect(parseSheet([inputHeaders, row, [...row]]).errors).toHaveLength(1);
    expect(
      parseSheet([
        inputHeaders,
        [...row.slice(0, 2), "2026-02-30", ...row.slice(3)],
      ]).errors,
    ).toHaveLength(1);
    expect(
      parseSheet([inputHeaders, [...row.slice(0, 4), 9007199254740992, ""]])
        .errors,
    ).toHaveLength(1);
  });
  it("rejects empty input and extra nonempty columns", () => {
    expect(parseSheet([inputHeaders]).errors).toHaveLength(1);
    expect(parseSheet([inputHeaders, [...row, "extra"]]).errors).toHaveLength(
      1,
    );
  });
  it("normalizes omitted trailing cells and detects changed content", () => {
    expect(normalizeRows([["a"]], 3)).toEqual([["a", "", ""]]);
    expect(snapshotHash([row])).toBe(snapshotHash([row]));
    expect(snapshotHash([row])).not.toBe(snapshotHash([[...row, "change"]]));
  });
  it("serializes sorted active rows with exact text amounts and stable headers", () => {
    const input = liveOrderInput.parse(
      Object.fromEntries(inputHeaders.map((k, i) => [k, row[i]])),
    );
    const order: LiveOrder = {
      ...input,
      id: crypto.randomUUID(),
      created_at: "2026-11-02T00:00:00.000Z",
      updated_at: "2026-11-02T00:00:00.000Z",
      updated_by: null,
      deleted_at: null,
    };
    expect(
      exportRows([order, { ...order, deleted_at: order.updated_at }]),
    ).toEqual([outputHeaders, [...row, order.updated_at]]);
    expect(safeCSV([{ ...order, note: '=SUM(A1),"test"' }])).toContain(
      '"\'=SUM(A1),""test"""',
    );
  });
});
