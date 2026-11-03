"use client";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
} from "lucide-react";
import {
  auditActions,
  auditResources,
  auditRoles,
  auditDetail,
  type AuditPage,
} from "@/lib/audit";
import { formatTime } from "@/lib/analytics";
import { useResource } from "./resource";
import { EmptyState } from "./shared";
import { Button } from "./ui/button";

const defaults = {
  role: "all",
  action: "all",
  resource: "all",
  from: "",
  to: "",
};
export function AuditView() {
  const [filters, setFilters] = useState(defaults);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  useEffect(() => {
    if (search.trim() === query) return;
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, query]);
  const url =
    "/api/audit?" +
    new URLSearchParams({
      ...filters,
      search: query,
      page: String(page),
      pageSize: String(pageSize),
    });
  const resource = useResource<AuditPage>(url);
  const data = resource.data;
  const total = data?.total ?? 0;
  const current = data?.page ?? page;
  const last = Math.max(1, Math.ceil(total / pageSize));
  function change(patch: Partial<typeof filters>) {
    setFilters((v) => ({ ...v, ...patch }));
    setPage(1);
  }
  return (
    <section className="panel audit-panel">
      <div className="panel-heading">
        <h2>Nhật ký kiểm toán</h2>
        <span className="outline-pill">
          {total.toLocaleString("vi-VN")} sự kiện
        </span>
      </div>
      <div className="audit-filters">
        <label className="audit-filter audit-search">
          Tìm kiếm
          <input
            aria-label="Tìm sự kiện"
            placeholder="Tên người thực hiện hoặc mã đơn…"
            maxLength={100}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {(
          [
            { key: "role", label: "Vai trò", options: auditRoles },
            { key: "action", label: "Thao tác", options: auditActions },
            {
              key: "resource",
              label: "Loại đối tượng",
              options: auditResources,
            },
          ] as const
        ).map(({ key, label, options }) => (
          <label className="audit-filter" key={key}>
            {label}
            <select
              aria-label={"Lọc " + label.toLowerCase() + " nhật ký"}
              value={filters[key]}
              onChange={(e) => change({ [key]: e.target.value })}
            >
              <option value="all">Tất cả</option>
              {Object.entries(options).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className="audit-filter">
          Từ ngày
          <input
            aria-label="Nhật ký từ ngày"
            type="date"
            value={filters.from}
            onChange={(e) => change({ from: e.target.value })}
          />
        </label>
        <label className="audit-filter">
          Đến ngày
          <input
            aria-label="Nhật ký đến ngày"
            type="date"
            value={filters.to}
            onChange={(e) => change({ to: e.target.value })}
          />
        </label>
        <Button
          variant="ghost"
          onClick={() => {
            setFilters(defaults);
            setSearch("");
            setQuery("");
            setPage(1);
          }}
        >
          <RotateCcw size={16} />
          Đặt lại bộ lọc nhật ký
        </Button>
      </div>
      {resource.loading && (
        <p className="notice" role="status">
          Đang tải nhật ký…
        </p>
      )}
      {resource.refreshing && (
        <p className="audit-notice" role="status">
          Đang cập nhật nhật ký…
        </p>
      )}
      {resource.error && (
        <div className="notice notice-error" role="alert">
          {resource.error}
          <Button variant="ghost" onClick={() => void resource.retry()}>
            Thử lại
          </Button>
        </div>
      )}
      {data?.events.length ? (
        <div
          className="table-scroll"
          role="region"
          aria-label="Danh sách sự kiện"
          tabIndex={0}
        >
          <table className="audit-table" aria-busy={resource.refreshing}>
            <thead>
              <tr>
                {[
                  "Thời gian (UTC+7)",
                  "Người thực hiện",
                  "Vai trò",
                  "Thao tác",
                  "Đối tượng",
                  "Nội dung",
                ].map((text) => (
                  <th scope="col" key={text}>
                    {text}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.events.map((event) => (
                <tr key={event.id}>
                  <td>{formatTime(event.created_at)}</td>
                  <td>
                    {event.actor_role === "system"
                      ? "Hệ thống"
                      : event.actor_context === "unknown"
                        ? "Không xác định"
                        : event.actor_name}
                  </td>
                  <td>
                    {auditRoles[event.actor_role]}
                    {event.actor_context === "current" && (
                      <span
                        className="count-pill"
                        title="Log cũ chưa ghi lại vai trò lúc thao tác; đây là vai trò hiện tại"
                      >
                        Hiện tại
                      </span>
                    )}
                  </td>
                  <td>{auditActions[event.action] ?? event.action}</td>
                  <td>
                    {auditResources[event.resource_type] ?? event.resource_type}
                    {event.resource_label && (
                      <strong className="audit-target">
                        {event.resource_label}
                      </strong>
                    )}
                  </td>
                  <td className="audit-detail">{auditDetail(event)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !resource.loading &&
        !resource.error && (
          <EmptyState
            title="Không có sự kiện phù hợp"
            description="Thử thay đổi bộ lọc nhật ký."
          />
        )
      )}
      <div className="pagination">
        <p>
          Hiển thị {total ? (current - 1) * pageSize + 1 : 0}–
          {Math.min(current * pageSize, total)} /{" "}
          {total.toLocaleString("vi-VN")} sự kiện
        </p>
        <div>
          <label>
            Số sự kiện mỗi trang
            <select
              aria-label="Số sự kiện mỗi trang"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span>
            Trang {current} / {last}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Trang đầu nhật ký"
            disabled={current === 1 || resource.previous || resource.loading}
            onClick={() => setPage(1)}
          >
            <ChevronsLeft size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Trang trước nhật ký"
            disabled={current === 1 || resource.previous || resource.loading}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Trang sau nhật ký"
            disabled={current >= last || resource.previous || resource.loading}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Trang cuối nhật ký"
            disabled={current >= last || resource.previous || resource.loading}
            onClick={() => setPage(last)}
          >
            <ChevronsRight size={16} />
          </Button>
        </div>
      </div>
    </section>
  );
}
