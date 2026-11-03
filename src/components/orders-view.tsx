"use client";
import {
  liveOrderInput,
  exactMoney,
  type LiveOrder as Order,
} from "@/lib/contracts";
import { api, useResource } from "./resource";

import { useMemo, useState } from "react";
import {
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Pencil,
  Plus,
  Search,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { canWrite, statuses, statusLabels } from "@/lib/domain";
import { defaultFilters, formatDate, type Filters } from "@/lib/analytics";
import {
  orderFilter,
  type OrderFilterChoice,
  type OrderVisibility,
} from "@/lib/order-filter";
import { useWorkspace } from "./workspace-provider";
import {
  ConfirmDialog,
  EmptyState,
  FilterBar,
  PageHeading,
  StatusBadge,
} from "./shared";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { basic: sortFn_basic, text: sortFn_text },
});
export function OrdersView() {
  const { user, revision, changed } = useWorkspace();
  const [filters, setFilters] = useState<Filters>({
    ...defaultFilters,
    search: "",
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "order_date", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [editing, setEditing] = useState<Order | "new" | null>(null);
  const [deleting, setDeleting] = useState<Order | null>(null);
  const [visibility, setVisibility] = useState<OrderVisibility>("all");
  const [pendingVisibility, setPendingVisibility] = useState<
    Record<string, boolean>
  >({});
  const writable = !!user && canWrite(user.role);
  const query = new URLSearchParams({
    visibility,
    ...filters,
    search: filters.search ?? "",
    page: String(pagination.pageIndex + 1),
    pageSize: String(pagination.pageSize),
    sort: sorting[0]?.id ?? "order_date",
    direction: sorting[0]?.desc ? "desc" : "asc",
  });
  const resource = useResource<{ orders: Order[]; total: number }>(
    "/api/orders?" + query.toString(),
    revision,
  );
  const filtered = resource.data?.orders ?? [];
  const total = resource.data?.total ?? 0;
  const columns = useMemo<ColumnDef<typeof features, Order>[]>(
    () => [
      {
        accessorKey: "order_code",
        header: "Mã đơn hàng",
        sortFn: "text",
        cell: ({ row }) => (
          <button
            className="code-cell text-link"
            onClick={() => setEditing(row.original)}
          >
            {row.original.order_code}
          </button>
        ),
      },
      {
        accessorKey: "customer_name",
        header: "Khách hàng",
        sortFn: "text",
        cell: ({ row }) => (
          <span>
            <span className="customer-avatar">
              {row.original.customer_name.charAt(0)}
            </span>
            {row.original.customer_name}
          </span>
        ),
      },
      {
        accessorKey: "order_date",
        header: "Ngày đặt",
        sortFn: "text",
        cell: ({ row }) => (
          <span className="muted">{formatDate(row.original.order_date)}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        sortFn: "text",
        cell: ({ row }) => (
          <>
            <StatusBadge status={row.original.status} />
            {(row.original.deleted_at || pendingVisibility[row.id]) && (
              <span className="count-pill">
                {row.id in pendingVisibility
                  ? pendingVisibility[row.id]
                    ? "Đang ẩn…"
                    : "Đang kích hoạt lại…"
                  : "Đã ẩn"}
              </span>
            )}
          </>
        ),
      },
      {
        accessorKey: "total_amount",
        header: "Tổng tiền",
        sortFn: "basic",
        cell: ({ row }) => (
          <span className="amount-cell">
            {exactMoney(row.original.total_amount)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="row-actions">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${writable && !row.original.deleted_at ? "Sửa" : "Xem"} ${row.original.order_code}`}
              onClick={() => setEditing(row.original)}
            >
              {writable && !row.original.deleted_at ? (
                <Pencil size={15} />
              ) : (
                <Eye size={15} />
              )}
            </Button>
            {writable && (
              <Button
                variant="ghost"
                size="icon"
                className="delete-button"
                aria-label={`${row.original.deleted_at ? "Kích hoạt lại" : "Ẩn"} ${row.original.order_code}`}
                disabled={row.id in pendingVisibility}
                onClick={() => setDeleting(row.original)}
              >
                {row.original.deleted_at ? (
                  <RotateCcw size={15} />
                ) : (
                  <EyeOff size={15} />
                )}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [writable, pendingVisibility],
  );
  const table = useTable({
    features,
    data: filtered,
    columns,
    manualPagination: true,
    manualSorting: true,
    rowCount: total,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getRowId: (row) => row.id,
  });
  function changeFilters(next: Filters) {
    setFilters(next);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }
  async function confirmDelete() {
    if (!deleting || deleting.id in pendingVisibility) return;
    const target = deleting;
    const hidden = !target.deleted_at;
    setDeleting(null);
    setPendingVisibility((v) => ({ ...v, [target.id]: hidden }));
    try {
      await api("/api/orders/" + target.id + (hidden ? "" : "/restore"), {
        method: hidden ? "DELETE" : "POST",
      });
      await changed("orders");
      toast.success(hidden ? "Đã ẩn đơn hàng." : "Đã kích hoạt lại đơn hàng.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể cập nhật đơn hàng.",
      );
    } finally {
      setPendingVisibility((v) => {
        const next = { ...v };
        delete next[target.id];
        return next;
      });
    }
  }
  return (
    <>
      <PageHeading
        kicker="QUẢN LÝ KINH DOANH"
        title="Đơn hàng"
        description="Theo dõi, tìm kiếm và quản lý từng đơn hàng trong không gian của bạn."
      >
        {writable && (
          <Button onClick={() => setEditing("new")}>
            <Plus size={17} /> Tạo đơn hàng
          </Button>
        )}
      </PageHeading>
      {!writable && (
        <div className="notice">
          Bạn đang ở chế độ chỉ xem. Liên hệ quản trị viên nếu cần quyền chỉnh
          sửa.
        </div>
      )}
      <section className="panel orders-panel">
        <div className="orders-toolbar">
          <div>
            <h2>
              Danh sách đơn hàng <span className="count-pill">{total}</span>
            </h2>
          </div>
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Tìm kiếm đơn hàng"
              placeholder="Tìm mã đơn hoặc khách hàng…"
              value={filters.search ?? ""}
              onChange={(e) =>
                changeFilters({ ...filters, search: e.target.value })
              }
            />
          </label>
        </div>
        <FilterBar
          value={filters}
          onChange={changeFilters}
          orderDisplay={{
            value: visibility !== "all" ? visibility : filters.status,
            onChange: (choice) => {
              const next = orderFilter(choice as OrderFilterChoice);
              setVisibility(next.visibility);
              changeFilters({ ...filters, status: next.status });
            },
          }}
        />
        {resource.refreshing && (
          <p role="status">
            Đang cập nhật kết quả; dữ liệu trước vẫn hiển thị.
          </p>
        )}
        {resource.error && resource.data && (
          <p role="alert">{resource.error}</p>
        )}
        {resource.loading ? (
          <div className="loading-state" role="status">
            Đang tải đơn hàng…
          </div>
        ) : resource.error && !resource.data ? (
          <div className="notice notice-error" role="alert">
            {resource.error}
          </div>
        ) : total ? (
          <>
            <div className="table-scroll">
              <table className="orders-table">
                <thead>
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id}>
                      {group.headers.map((header) => (
                        <th
                          scope="col"
                          key={header.id}
                          aria-sort={
                            header.column.getIsSorted() === "asc"
                              ? "ascending"
                              : header.column.getIsSorted() === "desc"
                                ? "descending"
                                : "none"
                          }
                        >
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <button
                              className="sort-button"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <table.FlexRender header={header} />
                              {header.column.getIsSorted() === "asc" ? (
                                <ArrowUp size={13} />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ArrowDown size={13} />
                              ) : (
                                <ArrowUpDown size={13} />
                              )}
                            </button>
                          ) : (
                            <table.FlexRender header={header} />
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        row.original.deleted_at || pendingVisibility[row.id]
                          ? "order-hidden"
                          : ""
                      }
                      aria-busy={row.id in pendingVisibility}
                    >
                      {row.getAllCells().map((cell) => (
                        <td key={cell.id}>
                          <table.FlexRender cell={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                Hiển thị {pagination.pageIndex * pagination.pageSize + 1}–
                {Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  total,
                )}{" "}
                / {total} đơn hàng
              </span>
              <div>
                <label>
                  Số dòng{" "}
                  <select
                    aria-label="Số dòng mỗi trang"
                    value={pagination.pageSize}
                    onChange={(e) => table.setPageSize(Number(e.target.value))}
                  >
                    {[20, 30, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <span>
                  Trang {pagination.pageIndex + 1} / {table.getPageCount()}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Trang đầu"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.firstPage()}
                >
                  <ChevronsLeft size={15} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Trang trước"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  <ChevronLeft size={15} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Trang sau"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
                  <ChevronRight size={15} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Trang cuối"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.lastPage()}
                >
                  <ChevronsRight size={15} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState>
            <Button
              variant="outline"
              onClick={() => changeFilters({ ...defaultFilters, search: "" })}
            >
              Xóa bộ lọc
            </Button>
          </EmptyState>
        )}
      </section>
      <p className="data-note">
        Đơn đã ẩn vẫn được giữ, có thể kích hoạt lại; không tính vào KPI, báo
        cáo và xuất dữ liệu.
      </p>
      {editing && (
        <OrderEditor
          key={editing === "new" ? "new" : editing.id}
          order={editing === "new" ? undefined : editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={
          deleting?.deleted_at ? "Kích hoạt lại đơn hàng?" : "Ẩn đơn hàng?"
        }
        description={`${deleting?.order_code ?? ""}: bản ghi và lịch sử được giữ nguyên. Đơn ẩn không tính vào tổng quan, báo cáo và xuất dữ liệu.`}
        onConfirm={confirmDelete}
        confirmLabel={deleting?.deleted_at ? "Kích hoạt lại" : "Ẩn đơn hàng"}
        destructive
      />
    </>
  );
}

function OrderEditor({
  order,
  open,
  onOpenChange,
}: {
  order?: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, changed } = useWorkspace();
  const writable = !!user && canWrite(user.role) && !order?.deleted_at;
  const [values, setValues] = useState({
    order_code:
      order?.order_code ??
      `SO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    customer_name: order?.customer_name ?? "",
    order_date:
      order?.order_date ??
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
        new Date(),
      ),
    status: order?.status ?? "pending",
    total_amount: order ? String(order.total_amount) : "",
    note: order?.note ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const field = (key: keyof typeof values) => ({
    id: `order-${key}`,
    value: values[key],
    disabled: !writable || saving,
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? `error-${key}` : undefined,
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => setValues((v) => ({ ...v, [key]: e.target.value })),
  });
  const error = (key: string) =>
    errors[key] ? (
      <span className="field-error" id={`error-${key}`}>
        {errors[key]}
      </span>
    ) : null;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = liveOrderInput.safeParse({
      ...values,
      total_amount: values.total_amount.trim(),
    });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      return;
    }
    setSaving(true);
    try {
      await api(order ? `/api/orders/${order.id}` : "/api/orders", {
        method: order ? "PATCH" : "POST",
        body: JSON.stringify(parsed.data),
      });
      changed("orders");
      toast.success(order ? "Đã cập nhật đơn hàng." : "Đã tạo đơn hàng.");
      onOpenChange(false);
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : "Không thể lưu đơn hàng.",
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="order-dialog">
        <span className="section-kicker">THÔNG TIN ĐƠN HÀNG</span>
        <DialogTitle>
          {writable
            ? order
              ? "Chỉnh sửa đơn hàng"
              : "Tạo đơn hàng mới"
            : "Chi tiết đơn hàng"}
        </DialogTitle>
        <DialogDescription>
          {writable
            ? "Thông tin sẽ được cập nhật ngay trên tổng quan và báo cáo."
            : "Bạn có quyền xem thông tin đơn hàng."}
        </DialogDescription>
        <form onSubmit={submit} noValidate>
          <div className="form-grid">
            <label className="field" htmlFor="order-order_code">
              Mã đơn hàng *<input {...field("order_code")} maxLength={40} />
              {error("order_code")}
            </label>
            <label className="field" htmlFor="order-order_date">
              Ngày đặt hàng *<input {...field("order_date")} type="date" />
              {error("order_date")}
            </label>
            <label className="field full-width" htmlFor="order-customer_name">
              Tên khách hàng *
              <input
                {...field("customer_name")}
                placeholder="Nhập tên khách hàng"
                maxLength={200}
              />
              {error("customer_name")}
            </label>
            <label className="field" htmlFor="order-total_amount">
              Tổng tiền (VND) *
              <input
                {...field("total_amount")}
                type="number"
                min="0"
                max="9223372036854775807"
                step="1"
                placeholder="0"
              />
              {error("total_amount")}
            </label>
            <label className="field" htmlFor="order-status">
              Trạng thái *
              <select {...field("status")}>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
              {error("status")}
            </label>
            <label className="field full-width" htmlFor="order-note">
              Ghi chú
              <textarea
                {...field("note")}
                rows={3}
                placeholder="Thông tin thêm về đơn hàng…"
                maxLength={2000}
              />
              {error("note")}
            </label>
          </div>
          {errors.form && (
            <p className="field-error" role="alert">
              {errors.form}
            </p>
          )}
          <div className="dialog-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {writable ? "Hủy" : "Đóng"}
            </Button>
            {writable && (
              <Button type="submit" disabled={saving}>
                {saving ? "Đang lưu…" : order ? "Lưu thay đổi" : "Tạo đơn hàng"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
