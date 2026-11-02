import type { BookingStatus, OrderStatus, Role } from "./types";

const CURRENCY = import.meta.env.VITE_CURRENCY || "£";

export const money = (n: number) =>
  `${CURRENCY}${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const moneyShort = (n: number) =>
  n >= 10000 ? `${CURRENCY}${(n / 1000).toLocaleString("en-GB", { maximumFractionDigits: 1 })}k` : money(n);

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const dateOnly = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export const timeOnly = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export function minutesAgo(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ${m % 60} min ago` : dateTime(iso);
}

export const roleLabel: Record<Role, string> = {
  CUSTOMER: "Customer",
  CASHIER: "Waiter (cashier)",
  CHEF: "Chef",
  BRANCH_MANAGER: "Branch manager",
  HQ_MANAGER: "HQ manager",
  ADMIN: "Admin",
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: "Sent to kitchen",
  PREPARING: "Preparing",
  DONE: "Ready for pickup",
  DELIVERED: "Served",
  CANCELLED: "Cancelled",
};

export const bookingStatusLabel: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Seated",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Local "YYYY-MM-DD" (for <input type="date">). */
export function isoDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
