import { statusLabels, statuses, type Order, type Status } from "./domain";

export type Filters = {
  from: string;
  to: string;
  status: Status | "all";
  search?: string;
};
export const defaultFilters: Filters = {
  from: "",
  to: "",
  status: "all",
};
export function filterOrders(orders: Order[], filters: Filters) {
  const query = (filters.search ?? "").trim().toLocaleLowerCase("vi");
  return orders.filter(
    (o) =>
      !o.deleted_at &&
      (!filters.from || o.order_date >= filters.from) &&
      (!filters.to || o.order_date <= filters.to) &&
      (filters.status === "all" || o.status === filters.status) &&
      (!query ||
        `${o.order_code} ${o.customer_name}`
          .toLocaleLowerCase("vi")
          .includes(query)),
  );
}
export function summarize(orders: Order[]) {
  const active = orders.filter((o) => !o.deleted_at);
  const completed = active.filter((o) => o.status === "completed");
  const revenue = completed.reduce((sum, o) => sum + o.total_amount, 0);
  return {
    total: active.length,
    completed: completed.length,
    revenue,
    rate: active.length ? (completed.length / active.length) * 100 : 0,
  };
}
export function monthlyRevenue(orders: Order[]) {
  const months = new Map<
    string,
    { month: string; label: string; revenue: number; count: number }
  >();
  for (const order of orders) {
    if (order.deleted_at) continue;
    const month = order.order_date.slice(0, 7);
    const entry = months.get(month) ?? {
      month,
      label: `${month.slice(5)}/${month.slice(0, 4)}`,
      revenue: 0,
      count: 0,
    };
    entry.count++;
    if (order.status === "completed") entry.revenue += order.total_amount;
    months.set(month, entry);
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}
export function statusSummary(orders: Order[]) {
  const active = orders.filter((o) => !o.deleted_at);
  return statuses.map((status) => ({
    status,
    name: statusLabels[status],
    value: active.filter((o) => o.status === status).length,
    amount: active
      .filter((o) => o.status === status)
      .reduce((sum, o) => sum + o.total_amount, 0),
  }));
}
export const money = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
export const shortMoney = (amount: number) =>
  amount >= 1e9
    ? `${(amount / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`
    : `${(amount / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
export const formatDate = (date: string) =>
  new Date(date + "T00:00:00+07:00").toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
export const formatTime = (date: string) =>
  new Date(date).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
export function ordersCSV(orders: Order[]) {
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    const safe =
      /^[\s]*[=+\-@\t\r\n]/.test(text) || /^[\t\r\n]/.test(text)
        ? "'" + text
        : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const fields = [
    "order_code",
    "customer_name",
    "order_date",
    "status",
    "total_amount",
    "note",
    "updated_at",
  ] as const;
  return (
    "\uFEFF" +
    [
      fields.join(","),
      ...orders
        .filter((o) => !o.deleted_at)
        .sort((a, b) => a.order_code.localeCompare(b.order_code))
        .map((o) => fields.map((key) => escape(o[key])).join(",")),
    ].join("\r\n")
  );
}
