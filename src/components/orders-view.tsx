"use client";
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
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  canWrite,
  orderInputSchema,
  statuses,
  statusLabels,
  validateOrder,
  type Order,
  type OrderInput,
} from "@/lib/domain";
import {
  defaultFilters,
  filterOrders,
  formatDate,
  money,
  type Filters,
} from "@/lib/analytics";
import { useDemo } from "./demo-provider";
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
  const { data, user, deleteOrder } = useDemo();
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
  const writable = !!user && canWrite(user.role);
  const filtered = useMemo(
    () => filterOrders(data.orders, filters),
    [data.orders, filters],
  );
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
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "total_amount",
        header: "Tổng tiền",
        sortFn: "basic",
        cell: ({ row }) => (
          <span className="amount-cell">
            {money(row.original.total_amount)}
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
              aria-label={`${writable ? "Sửa" : "Xem"} ${row.original.order_code}`}
              onClick={() => setEditing(row.original)}
            >
              {writable ? <Pencil size={15} /> : <Eye size={15} />}
            </Button>
            {writable && (
              <Button
                variant="ghost"
                size="icon"
                className="delete-button"
                aria-label={`Xóa ${row.original.order_code}`}
                onClick={() => setDeleting(row.original)}
              >
                <Trash2 size={15} />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [writable],
  );
  const table = useTable({
    features,
    data: filtered,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getRowId: (row) => row.id,
  });
  function changeFilters(next: Filters) {
    setFilters(next);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }
  function confirmDelete() {
    if (!deleting) return;
    try {
      deleteOrder(deleting.id);
      toast.success(
        `Đã xóa mềm ${deleting.order_code}. Báo cáo đã được cập nhật.`,
      );
      setDeleting(null);
      setPagination((p) => ({
        ...p,
        pageIndex: Math.max(
          0,
          Math.min(
            p.pageIndex,
            Math.ceil((filtered.length - 1) / p.pageSize) - 1,
          ),
        ),
      }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa đơn hàng.",
      );
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
          Bạn đang ở chế độ chỉ xem. Chuyển vai trò trong menu người dùng để
          trải nghiệm chỉnh sửa.
        </div>
      )}
      <section className="panel orders-panel">
        <div className="orders-toolbar">
          <div>
            <h2>
              Danh sách đơn hàng{" "}
              <span className="count-pill">{filtered.length}</span>
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
        <FilterBar value={filters} onChange={changeFilters} />
        {filtered.length ? (
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
                    <tr key={row.id}>
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
                  filtered.length,
                )}{" "}
                / {filtered.length} đơn hàng
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
        Dữ liệu mẫu · Xóa mềm: đơn đã xóa được loại khỏi danh sách, KPI và CSV.
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
        title="Xóa mềm đơn hàng?"
        description={`${deleting?.order_code ?? ""} sẽ biến mất khỏi danh sách, tổng quan và báo cáo. Bản ghi vẫn được giữ trong dữ liệu demo.`}
        onConfirm={confirmDelete}
        confirmLabel="Xóa đơn hàng"
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
  const { data, user, saveOrder } = useDemo();
  const writable = !!user && canWrite(user.role);
  const [values, setValues] = useState({
    order_code:
      order?.order_code ??
      `SO-2026-${String(data.orders.length + 1).padStart(4, "0")}`,
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
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = orderInputSchema.safeParse({
      ...values,
      total_amount:
        values.total_amount.trim() === "" ? NaN : Number(values.total_amount),
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
    try {
      validateOrder(parsed.data, data.orders, order?.id);
    } catch (err) {
      setErrors({
        order_code: err instanceof Error ? err.message : "Mã đơn không hợp lệ.",
      });
      return;
    }
    setSaving(true);
    try {
      saveOrder(parsed.data as OrderInput, order?.id);
      toast.success(
        order ? "Đã cập nhật đơn hàng demo." : "Đã tạo đơn hàng demo.",
      );
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
        <span className="section-kicker">ĐƠN HÀNG DEMO</span>
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
                placeholder="Nhập tên khách hàng giả lập"
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
                max="1000000000000"
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
