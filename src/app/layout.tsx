import type { Metadata } from "next";
import { Toaster } from "sonner";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { AppShell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "SheetOps — Không gian vận hành",
    template: "%s | SheetOps",
  },
  description: "Quản lý đơn hàng và phân tích vận hành với dữ liệu tập trung.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <WorkspaceProvider>
          <AppShell>{children}</AppShell>
          <Toaster
            richColors
            position="bottom-right"
            closeButton
            toastOptions={{ closeButtonAriaLabel: "Đóng thông báo" }}
            containerAriaLabel="Thông báo"
          />
        </WorkspaceProvider>
      </body>
    </html>
  );
}
