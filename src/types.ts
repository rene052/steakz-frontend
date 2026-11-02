export type Role = "CUSTOMER" | "CASHIER" | "CHEF" | "BRANCH_MANAGER" | "HQ_MANAGER" | "ADMIN";
export type OrderStatus = "PENDING" | "PREPARING" | "DONE" | "DELIVERED" | "CANCELLED";
export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  branchId: number | null;
  salary: number | null;
  createdAt: string;
  branch: { id: number; name: string } | null;
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  isActive?: boolean;
  _count?: { tables?: number; menuItems?: number; users?: number; orders?: number };
}

export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  isAvailable: boolean;
  branchId: number;
}

export interface Table {
  id: number;
  tableNumber: number;
  capacity: number;
  isAvailable: boolean;
  branchId: number;
  isBooked?: boolean;
}

export interface BranchDetail extends Branch {
  tables: Table[];
  menuItems: MenuItem[];
}

export interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: number;
  menuItem: { id: number; name: string; category: string };
}

export interface Order {
  id: number;
  status: OrderStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
  branchId: number;
  items: OrderItem[];
  table: { id: number; tableNumber: number } | null;
  branch: { id: number; name: string };
  customer: { id: number; name: string; email: string } | null;
  booking: { id: number; date: string; guestCount: number } | null;
}

export interface Booking {
  id: number;
  date: string;
  guestCount: number;
  status: BookingStatus;
  createdAt: string;
  table: { id: number; tableNumber: number; capacity: number; branch?: { id: number; name: string; address: string } };
  customer?: { id: number; name: string; email?: string };
  orders?: { id: number; status: OrderStatus; total: number }[];
}

export interface SalesReport {
  today: { revenue: number; orders: number };
  last7Days: { revenue: number; orders: number };
  last30Days: { revenue: number; orders: number };
  allTime: { revenue: number; orders: number };
  averageOrderValue: number;
  daily: { date: string; revenue: number; orders: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: Role;
  salary: number | null;
  isActive: boolean;
  branch: { id: number; name: string } | null;
}
