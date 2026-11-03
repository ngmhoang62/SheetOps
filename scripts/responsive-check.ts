import { expect, type Page } from "@playwright/test";

/** Check populated layouts rather than taking screenshots of initial loaders. */
export async function verifyResponsive(
  page: Page,
  base: string,
  label: string,
) {
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [path, heading] of [
      ["dashboard", "Tổng quan hoạt động"],
      ["orders", "Đơn hàng"],
      ["reports", "Báo cáo vận hành"],
      ["users", "Người dùng & vai trò"],
      ["sync", "Trung tâm đồng bộ"],
      ["settings", "Cài đặt"],
    ]) {
      await page.goto(base + "/" + path);
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(/Đang tải (thống kê|dữ liệu|đơn hàng|nhật ký)…/, {
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(page.locator("main [role=alert]")).toHaveCount(0);
      if (path === "orders")
        await expect(page.locator("tbody tr").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path:
          "output/performance/" +
          label +
          "-loaded-" +
          path +
          "-" +
          width +
          ".png",
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1366, height: 900 });
}
