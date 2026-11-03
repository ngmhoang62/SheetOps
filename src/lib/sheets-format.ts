import { createHash } from "node:crypto";
import { liveOrderInput, type LiveOrder } from "./contracts";

/** Atomic staging replacement; stringValue preserves RAW text and exact VND. */
export function stagingRequests(
  sheetId: number,
  rows: string[][],
  rowCount = 1000,
  columnCount = 7,
) {
  return [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            rowCount: Math.max(rowCount, rows.length),
            columnCount: Math.max(columnCount, 7),
          },
        },
        fields: "gridProperties",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startColumnIndex: 0, endColumnIndex: 7 },
        cell: {},
        fields: "userEnteredValue",
      },
    },
    {
      updateCells: {
        start: { sheetId, rowIndex: 0, columnIndex: 0 },
        rows: rows.map((row) => ({
          values: row.map((value) => ({
            userEnteredValue: { stringValue: value },
          })),
        })),
        fields: "userEnteredValue",
      },
    },
  ];
}
export const inputHeaders = [
  "order_code",
  "customer_name",
  "order_date",
  "status",
  "total_amount",
  "note",
];
export const outputHeaders = [...inputHeaders, "updated_at"];
export const snapshotHash = (rows: string[][]) =>
  createHash("sha256").update(JSON.stringify(rows)).digest("hex");
export function normalizeRows(rows: unknown[][], width: number) {
  return rows.map((row) =>
    Array.from({ length: width }, (_, i) => String(row[i] ?? "")),
  );
}
export function parseSheet(rows: unknown[][]) {
  const errors: { row: number; message: string }[] = [];
  if (JSON.stringify(rows[0]) !== JSON.stringify(inputHeaders))
    return {
      orders: [],
      errors: [
        { row: 1, message: "Header phải là: " + inputHeaders.join(", ") },
      ],
      hash: snapshotHash([]),
    };
  const orders = [];
  const codes = new Set<string>();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].every((v) => v === "" || v === null)) continue;
    if (
      rows[i].length > 6 &&
      rows[i].slice(6).some((v) => v !== "" && v !== null)
    ) {
      errors.push({ row: i + 1, message: "Dữ liệu vượt quá 6 cột" });
      continue;
    }
    const values = normalizeRows([rows[i]], 6)[0];
    const raw = Object.fromEntries(inputHeaders.map((k, j) => [k, values[j]]));
    const amount = rows[i][4];
    if (typeof amount === "number" && !Number.isSafeInteger(amount)) {
      errors.push({
        row: i + 1,
        message:
          "Số tiền dạng số không còn chính xác. Hãy lưu dưới dạng văn bản.",
      });
      continue;
    }
    const parsed = liveOrderInput.safeParse(raw);
    if (!parsed.success) {
      errors.push({
        row: i + 1,
        message: parsed.error.issues
          .map((e) => `${String(e.path[0])}: ${e.message}`)
          .join("; "),
      });
      continue;
    }
    if (codes.has(parsed.data.order_code)) {
      errors.push({ row: i + 1, message: "Mã đơn trùng trong bảng nguồn" });
      continue;
    }
    codes.add(parsed.data.order_code);
    orders.push(parsed.data);
  }
  if (!orders.length && !errors.length)
    errors.push({ row: 2, message: "Bảng nguồn chưa có đơn hàng" });
  if (orders.length > 5000)
    errors.push({ row: 5002, message: "Giới hạn 5.000 dòng cho một lần nhập" });
  return { orders, errors, hash: snapshotHash(normalizeRows(rows, 6)) };
}
export function exportRows(orders: LiveOrder[]) {
  return [
    outputHeaders,
    ...orders
      .filter((o) => !o.deleted_at)
      .sort((a, b) => a.order_code.localeCompare(b.order_code))
      .map((o) =>
        outputHeaders.map((k) => String(o[k as keyof LiveOrder] ?? "")),
      ),
  ];
}
