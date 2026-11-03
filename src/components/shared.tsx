"use client";
import type { ReactNode } from "react";
import { CalendarDays, Inbox, RotateCcw } from "lucide-react";
import { defaultFilters, type Filters } from "@/lib/analytics";
import { statuses, statusLabels, type Status } from "@/lib/domain";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";

export function PageHeading({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="section-kicker">{kicker}</span>
        <h1>{title}</h1>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function FilterBar({
  value,
  onChange,
  children,
  orderDisplay,
}: {
  value: Filters;
  onChange: (filters: Filters) => void;
  children?: ReactNode;
  orderDisplay?: { value: string; onChange: (value: string) => void };
}) {
  return (
    <div className="filter-wrapper">
      <div className="filter-bar">
        <span className="filter-title">
          <CalendarDays size={16} /> Bộ lọc
        </span>
        <label className="date-field">
          Từ ngày
          <input
            aria-label="Từ ngày"
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
        </label>
        <span className="date-divider">—</span>
        <label className="date-field">
          Đến ngày
          <input
            aria-label="Đến ngày"
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </label>
        <label className="status-filter">
          <span className="sr-only">Lọc trạng thái</span>
          <select
            aria-label="Lọc trạng thái"
            value={orderDisplay?.value ?? value.status}
            onChange={(e) =>
              orderDisplay
                ? orderDisplay.onChange(e.target.value)
                : onChange({
                    ...value,
                    status: e.target.value as Filters["status"],
                  })
            }
          >
            <option value="all">Tất cả trạng thái</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
            {orderDisplay && (
              <optgroup label="Hiển thị đơn hàng">
                <option value="active">Đang hoạt động</option>
                <option value="hidden">Đã ẩn</option>
              </optgroup>
            )}
          </select>
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            orderDisplay?.onChange("all");
            onChange({ ...defaultFilters, search: value.search });
          }}
        >
          <RotateCcw size={14} /> Đặt lại
        </Button>
        {children}
      </div>
      {value.from && value.to && value.from > value.to && (
        <p className="field-error" role="alert">
          Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.
        </p>
      )}
    </div>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span />
      {statusLabels[status]}
    </span>
  );
}
export function EmptyState({
  title = "Chưa có dữ liệu phù hợp",
  description = "Thử thay đổi bộ lọc hoặc chọn khoảng ngày khác.",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={26} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "Xác nhận",
  destructive = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
