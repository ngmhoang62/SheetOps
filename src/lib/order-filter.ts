import type { Status } from "./domain";
export type OrderVisibility = "all" | "active" | "hidden";
export type OrderFilterChoice = Status | OrderVisibility;
export function orderFilter(choice: OrderFilterChoice): {
  status: Status | "all";
  visibility: OrderVisibility;
} {
  return ["active", "hidden"].includes(choice)
    ? { status: "all", visibility: choice as OrderVisibility }
    : { status: choice as Status | "all", visibility: "all" };
}
