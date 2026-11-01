import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state panel">
      <h1>Không tìm thấy trang</h1>
      <p>Đường dẫn này không tồn tại trong không gian làm việc.</p>
      <Link href="/dashboard" className="text-link">
        Về tổng quan →
      </Link>
    </div>
  );
}
