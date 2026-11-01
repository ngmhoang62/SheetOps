"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state panel" role="alert">
      <h1>Không thể hiển thị nội dung</h1>
      <p>
        Dữ liệu trong trình duyệt vẫn được giữ. Vui lòng thử lại hoặc tải lại
        trang.
      </p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
