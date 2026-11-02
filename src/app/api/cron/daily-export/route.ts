import { validCronHeader } from "@/lib/cron-auth";
import { exportSnapshot } from "@/lib/server/sheets";
import { fail, HttpError, json } from "@/lib/server/http";
export const maxDuration = 120;
export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!validCronHeader(request.headers.get("authorization"), secret))
      throw new HttpError(401, "Yêu cầu cron không hợp lệ.");
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date());
    return json(await exportSnapshot("cron", null, "daily:" + date));
  } catch (e) {
    return fail(e);
  }
}
