import { describe, expect, it } from "vitest";
import { sampleRows, sourceState } from "../scripts/seed-source-orders";
import { inputHeaders, parseSheet } from "../src/lib/sheets-format";

describe("development Source_Orders seed guard", () => {
  it("reuses deterministic import-compatible samples with exact string amounts", () => {
    const rows = sampleRows();
    expect(rows).toEqual(sampleRows());
    expect(rows).toHaveLength(301);
    expect(parseSheet(rows).errors).toEqual([]);
    expect(new Set(rows.slice(1).map((r) => r[0])).size).toBe(300);
    expect(
      rows.slice(1).every((r) => r.length === 6 && /^\d+$/.test(r[4])),
    ).toBe(true);
    expect(rows[1][1]).toContain("(mẫu)");
  });

  it("allows only the canonical header or the exact complete sample", () => {
    expect(sourceState([[...inputHeaders]])).toBe("empty");
    expect(sourceState(sampleRows())).toBe("seeded");
  });

  it.each([
    "header",
    "changed",
    "partial",
    "extra-row",
    "extra-column",
    "formula",
    "numeric-amount",
  ])("rejects %s without normalizing away differences", (kind) => {
    const rows: unknown[][] = sampleRows();
    if (kind === "header") rows[0][0] = "Order Code";
    if (kind === "changed") rows[1][1] = "Different customer";
    if (kind === "partial") rows.pop();
    if (kind === "extra-row") rows.push(["unrelated"]);
    if (kind === "extra-column") rows[1].push("unrelated");
    if (kind === "formula") rows[1][4] = "=1000";
    if (kind === "numeric-amount") rows[1][4] = Number(rows[1][4]);
    expect(() => sourceState(rows)).toThrow();
  });
});
