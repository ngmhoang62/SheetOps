import type { DemoUser, Order, Snapshot } from "./domain";

export const demoUsers: DemoUser[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    full_name: "Minh An (giả lập)",
    email: "admin@example.com",
    role: "admin",
    is_active: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    full_name: "Khánh Linh (giả lập)",
    email: "editor@example.com",
    role: "editor",
    is_active: true,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    full_name: "Hoàng Nam (giả lập)",
    email: "viewer@example.com",
    role: "viewer",
    is_active: true,
  },
];

export function generateOrders(): Order[] {
  let seed = 62026;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const families = [
    "Nguyễn",
    "Trần",
    "Lê",
    "Phạm",
    "Hoàng",
    "Vũ",
    "Đặng",
    "Bùi",
    "Đỗ",
    "Hồ",
  ];
  const names = [
    "Minh Anh",
    "Bảo An",
    "Khánh Vy",
    "Gia Hân",
    "Quang Huy",
    "Tuấn Kiệt",
    "Thảo Nhi",
    "Hải Đăng",
    "Ngọc Mai",
    "Đức Phúc",
  ];
  return Array.from({ length: 300 }, (_, i) => {
    const month = Math.floor(i / 25) + 1;
    const day = 1 + Math.floor(random() * 28);
    const date = `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const statusRoll = random();
    return {
      id: `20000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      order_code: `SO-2026-${String(i + 1).padStart(4, "0")}`,
      customer_name: `${families[Math.floor(random() * families.length)]} ${names[Math.floor(random() * names.length)]} (mẫu)`,
      order_date: date,
      status:
        statusRoll < 0.67
          ? "completed"
          : statusRoll < 0.9
            ? "pending"
            : "cancelled",
      total_amount: (5 + Math.floor(random() * 195)) * 50_000,
      note: [
        "Đơn hàng minh họa · Không phải dữ liệu thật",
        "Giao trong giờ hành chính · Dữ liệu mẫu",
        "Khách hàng giả lập · Đóng gói tiêu chuẩn",
      ][i % 3],
      created_at: `${date}T02:00:00.000Z`,
      updated_at: `${date}T04:30:00.000Z`,
      updated_by: demoUsers[0].id,
      deleted_at: null,
    };
  });
}
export function initialSnapshot(): Snapshot {
  return {
    version: 1,
    orders: generateOrders(),
    users: structuredClone(demoUsers),
    audit: [],
    organization: "Không gian vận hành",
  };
}
