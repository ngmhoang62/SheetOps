import { expect, it } from "vitest";
import { stagingRequests } from "../src/lib/sheets-format";

it("preserves exact integers, Vietnamese and formula-like text as literal strings", () => {
  const row = [
    "TEST-1",
    "Khách hàng giả lập",
    "2026-11-03",
    "completed",
    "9007199254740993",
    "=1+1",
    "2026-11-03T00:00:00Z",
  ];
  const requests = stagingRequests(42, [row]);
  expect(
    requests[2].updateCells?.rows[0].values.map(
      (v) => v.userEnteredValue.stringValue,
    ),
  ).toEqual(row);
  expect(JSON.stringify(requests)).not.toContain('"formulaValue"');
});
it("does not shrink existing grid or clear unmanaged columns", () => {
  const requests = stagingRequests(42, [["header"]], 2000, 12);
  expect(requests[0].updateSheetProperties?.properties.gridProperties).toEqual({
    rowCount: 2000,
    columnCount: 12,
  });
  expect(requests[1].repeatCell?.range).toEqual({
    sheetId: 42,
    startColumnIndex: 0,
    endColumnIndex: 7,
  });
});
