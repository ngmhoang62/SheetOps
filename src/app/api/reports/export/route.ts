import { safeCSV, filterSchema, type LiveOrder } from "@/lib/contracts";
import { fail, HttpError, requireActor } from "@/lib/server/http";
import { params } from "@/lib/server/orders";
export async function GET(request: Request) {
  try {
    const { db } = await requireActor();
    const f = filterSchema.parse(params(request));
    const { data, error } = await db.rpc("report_snapshot", {
      date_from: f.from || null,
      date_to: f.to || null,
      status_filter: f.status === "all" ? null : f.status,
      query_input: f.search,
    });
    if (error) throw error;
    if (data.length > 8000)
      throw new HttpError(413, "Bản xuất quá lớn. Cần worker riêng.");
    return new Response(safeCSV(data as LiveOrder[]), {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": "attachment; filename=sheetops-orders.csv",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
