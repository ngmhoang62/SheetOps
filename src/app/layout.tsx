import type { Metadata } from "next";
import { Toaster } from "sonner";
import { DemoProvider } from "@/components/demo-provider";
import { AppShell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "SheetOps — Không gian vận hành",
    template: "%s | SheetOps",
  },
  description:
    "Bản thử nghiệm quản lý đơn hàng và phân tích vận hành. Dữ liệu hư cấu, lưu trên trình duyệt.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <DemoProvider>
          <AppShell>{children}</AppShell>
          <Toaster richColors position="bottom-right" closeButton />
        </DemoProvider>
      </body>
    </html>
  );
}
