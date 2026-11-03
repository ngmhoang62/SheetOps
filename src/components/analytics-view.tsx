"use client";
import { exactMoney as money, type LiveOrder } from "@/lib/contracts";
import { statusLabels, type Status } from "@/lib/domain";
import { useResource } from "./resource";
type AnalyticsSummary = {
  total: number;
  completed: number;
  revenue: string;
  rate: number;
  monthly: { month: string; count: number; revenue: string }[];
  distribution: { status: Status; value: number; amount: string }[];
  recent: LiveOrder[];
};
import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  CheckCheck,
  CircleDollarSign,
  ClipboardList,
  Percent,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { defaultFilters, formatDate, shortMoney } from "@/lib/analytics";
import { useWorkspace } from "./workspace-provider";
import { EmptyState, FilterBar, PageHeading, StatusBadge } from "./shared";
import { Button } from "./ui/button";

const colors = {
  pending: "#e7ad4c",
  completed: "#247a60",
  cancelled: "#c4c9d1",
};
export function AnalyticsView({ report = false }: { report?: boolean }) {
  const { revision } = useWorkspace();
  const [filters, setFilters] = useState(defaultFilters);
  const resource = useResource<AnalyticsSummary>(
    "/api/dashboard/summary?" +
      new URLSearchParams({ ...filters, search: filters.search ?? "" }),
    revision,
  );
  const stats = resource.data ?? {
    total: 0,
    completed: 0,
    revenue: "0",
    rate: 0,
    monthly: [],
    distribution: [],
    recent: [],
  };
  const monthly = stats.monthly.map((m) => ({
    ...m,
    label: m.month.slice(5) + "/" + m.month.slice(0, 4),
    chartValue: Number(m.revenue),
  }));
  const distribution = stats.distribution.map((s) => ({
    ...s,
    name: statusLabels[s.status],
  }));
  const recent = stats.recent;
  const orders = { length: stats.total };
  function exportCSV() {
    const link = document.createElement("a");
    link.href =
      "/api/reports/export?" +
      new URLSearchParams({ ...filters, search: filters.search ?? "" });
    link.download = "sheetops-orders.csv";
    link.click();
  }
  const cards = [
    {
      label: "Tổng đơn hàng",
      value: stats.total.toLocaleString("vi-VN"),
      caption: "Đơn hàng trong khoảng đã chọn",
      icon: ClipboardList,
      className: "",
    },
    {
      label: "Đơn hoàn thành",
      value: stats.completed.toLocaleString("vi-VN"),
      caption: "Đã ghi nhận doanh thu",
      icon: CheckCheck,
      className: "",
    },
    {
      label: "Tổng doanh thu",
      value: money(stats.revenue),
      caption: "Chỉ tính đơn hàng hoàn thành",
      icon: CircleDollarSign,
      className: "kpi-featured",
    },
    {
      label: "Tỷ lệ hoàn thành",
      value: `${stats.rate.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`,
      caption: "Trên tổng số đơn hàng",
      icon: Percent,
      className: "",
    },
  ];
  return (
    <>
      <PageHeading
        kicker={report ? "PHÂN TÍCH & THỐNG KÊ" : "GÓC NHÌN KINH DOANH"}
        title={report ? "Báo cáo vận hành" : "Tổng quan hoạt động"}
        description={
          report
            ? "Từ dữ liệu đến quyết định. Theo dõi kết quả theo từng giai đoạn."
            : "Nắm bắt nhịp kinh doanh, từ những con số quan trọng nhất."
        }
      >
        <Button variant="outline" onClick={exportCSV} disabled={!orders.length}>
          <ArrowDownToLine size={16} /> Xuất CSV
        </Button>
        {!report && (
          <Button asChild>
            <Link href="/orders">
              Xem đơn hàng <ArrowRight size={16} />
            </Link>
          </Button>
        )}
      </PageHeading>
      <FilterBar value={filters} onChange={setFilters} />
      {resource.loading && (
        <div role="status" className="notice">
          Đang tải thống kê…
        </div>
      )}
      {resource.error && (
        <div role="alert" className="notice notice-error">
          {resource.error}
        </div>
      )}
      <div className="kpi-grid">
        {cards.map((card) => (
          <section className={`kpi-card ${card.className}`} key={card.label}>
            <div className="kpi-top">
              <h2>{card.label}</h2>
              <span className="kpi-icon">
                <card.icon size={18} />
              </span>
            </div>
            <strong className="kpi-value" data-testid={card.label}>
              {card.value}
            </strong>
            {card.className === "kpi-featured" && <p>{card.caption}</p>}
          </section>
        ))}
      </div>
      <div className="charts-grid">
        <section className="panel revenue-panel">
          <div className="panel-heading">
            <div>
              <h2>Doanh thu theo tháng</h2>
              <p>Doanh thu từ đơn hàng hoàn thành · VND</p>
            </div>
            <span className="chart-legend">
              <span /> Doanh thu
            </span>
          </div>
          {orders.length ? (
            <div
              className="chart-area"
              role="img"
              aria-label={`Biểu đồ doanh thu theo tháng. Tổng ${money(stats.revenue)}`}
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={monthly}
                  margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 5"
                    stroke="#e8ecea"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 14, fill: "#78847d" }}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={12}
                  />
                  <YAxis
                    tickFormatter={shortMoney}
                    tick={{ fontSize: 14, fill: "#78847d" }}
                    axisLine={false}
                    tickLine={false}
                    width={76}
                  />
                  <Tooltip
                    cursor={{ fill: "#f0f5f2" }}
                    formatter={(_value, _name, item) => [
                      money(String(item.payload?.revenue ?? "0")),
                      "Doanh thu",
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e5eae6",
                      fontSize: 14,
                    }}
                  />
                  <Bar
                    dataKey="chartValue"
                    fill="#338266"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={35}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState />
          )}
          <div className="chart-footnote">
            <TrendingUp size={15} />
            <span>{monthly.length} tháng có đơn hàng trong khoảng đã chọn</span>
            <strong>{money(stats.revenue)}</strong>
          </div>
        </section>
        <section className="panel status-panel">
          <div className="panel-heading">
            <div>
              <h2>Trạng thái đơn hàng</h2>
            </div>
          </div>
          {orders.length ? (
            <>
              <div
                className="donut-wrap"
                role="img"
                aria-label={distribution
                  .map((s) => `${s.name}: ${s.value}`)
                  .join(", ")}
              >
                <ResponsiveContainer width="100%" height={210} minWidth={0}>
                  <PieChart>
                    <Pie
                      data={distribution.filter((s) => s.value > 0)}
                      dataKey="value"
                      innerRadius={67}
                      outerRadius={87}
                      paddingAngle={4}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {distribution
                        .filter((s) => s.value > 0)
                        .map((s) => (
                          <Cell key={s.status} fill={colors[s.status]} />
                        ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} đơn`, "Số lượng"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>{stats.total}</strong>
                  <span>tổng đơn hàng</span>
                </div>
              </div>
              <div className="status-legend">
                {distribution.map((s) => (
                  <div key={s.status}>
                    <span
                      className="legend-dot"
                      style={{ background: colors[s.status] }}
                    />
                    <span>{s.name}</span>
                    <strong>{s.value}</strong>
                    <small>
                      {stats.total
                        ? Math.round((s.value / stats.total) * 100)
                        : 0}
                      %
                    </small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
      {report ? (
        <div className="report-tables">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Chi tiết doanh thu</h2>
                <p>Số đơn bao gồm tất cả trạng thái đã lọc</p>
              </div>
              <span className="count-pill">{monthly.length} tháng</span>
            </div>
            {monthly.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Tháng</th>
                      <th scope="col" className="text-right">
                        Số đơn
                      </th>
                      <th scope="col" className="text-right">
                        Doanh thu hoàn thành
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((m) => (
                      <tr key={m.month}>
                        <td>{m.label}</td>
                        <td className="text-right">{m.count}</td>
                        <td className="text-right amount-cell">
                          {money(m.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Tổng cộng</td>
                      <td className="text-right">{stats.total}</td>
                      <td className="text-right">{money(stats.revenue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <EmptyState />
            )}
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Tổng hợp trạng thái</h2>
                <p>Giá trị đơn khác với doanh thu ghi nhận</p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Trạng thái</th>
                    <th scope="col" className="text-right">
                      Số đơn
                    </th>
                    <th scope="col" className="text-right">
                      Giá trị đơn
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {distribution.map((s) => (
                    <tr key={s.status}>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="text-right">{s.value}</td>
                      <td className="text-right">{money(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Tổng cộng</td>
                    <td className="text-right">{stats.total}</td>
                    <td className="text-right">
                      {money(
                        distribution.reduce(
                          (sum, s) => sum + BigInt(s.amount),
                          0n,
                        ),
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="table-note">
              CSV chỉ xuất đơn đang hoạt động theo bộ lọc.
            </p>
          </section>
        </div>
      ) : (
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>
                Đơn hàng gần đây <span className="count-pill">10 gần nhất</span>
              </h2>
            </div>
            <Link className="text-link" href="/orders">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          {recent.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Mã đơn hàng</th>
                    <th scope="col">Khách hàng</th>
                    <th scope="col">Ngày đặt</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col" className="text-right">
                      Tổng tiền
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id}>
                      <td className="code-cell">{o.order_code}</td>
                      <td>
                        <span className="customer-avatar">
                          {o.customer_name.charAt(0)}
                        </span>
                        {o.customer_name}
                      </td>
                      <td className="muted">{formatDate(o.order_date)}</td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="text-right amount-cell">
                        {money(o.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
      )}
      <p className="data-note">
        Doanh thu chỉ tính đơn hoàn thành đang hoạt động
      </p>
    </>
  );
}
