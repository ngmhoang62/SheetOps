import { z } from "zod";
import { beginSync, failRun, previewImport } from "@/lib/server/sheets";
import {
  body,
  checkOrigin,
  fail,
  HttpError,
  json,
  requireActor,
} from "@/lib/server/http";
export const maxDuration = 120;
export async function POST(request: Request) {
  let id: string | undefined;
  try {
    checkOrigin(request);
    const { db, profile } = await requireActor(["admin"], "sync");
    const input = z
      .object({ hash: z.string().regex(/^[a-f0-9]{64}$/) })
      .strict()
      .parse(await body(request));
    const preview = await previewImport();
    if (preview.errors.length || preview.hash !== input.hash)
      throw new HttpError(
        409,
        "Dữ liệu nguồn đã thay đổi hoặc có lỗi. Hãy xem trước lại.",
      );
    const run = await beginSync(
      "import",
      "manual",
      profile.id,
      "import:" + crypto.randomUUID(),
    );
    id = run.run.id;
    const { data, error } = await db.rpc("import_orders", {
      rows_input: preview.orders,
      run_id: id,
      hash_input: preview.hash,
    });
    if (error) throw error;
    return json({ runId: id, rowCount: data });
  } catch (e) {
    if (id) await failRun(id, e);
    return fail(e);
  }
}
