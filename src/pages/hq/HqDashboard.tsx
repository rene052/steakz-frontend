import { useState } from "react";
import { useApi } from "../../hooks";
import { AppShell, useTab } from "../../components/Layouts";
import { OrdersTable } from "../../components/OrdersTable";
import { SalesView, StaffTable } from "../../components/Reports";
import { Empty, Figure, Loading, Notice, PageHeader, RankBars, StatusFilter } from "../../components/ui";
import { money, moneyShort } from "../../format";
import type { Branch, Order, SalesReport, StaffMember } from "../../types";

interface HqOverview {
  totals: {
    branches: number;
    activeBranches: number;
    staff: number;
    customers: number;
    orders: number;
    activeOrders: number;
    revenue: number;
    revenueToday: number;
  };
  ordersToday: Record<string, number>;
  branches: {
    id: number;
    name: string;
    address: string;
    isActive: boolean;
    staff: number;
    tables: number;
    menuItems: number;
    orders: number;
    activeOrders: number;
    revenue: number;
    revenueToday: number;
  }[];
}

interface HqSales extends SalesReport {
  totalRevenue: number;
  byBranch: { branchId: number; branch: string; revenue: number; orders: number; averageOrderValue: number }[];
}

const city = (n: string) => n.replace(/^Steakz\s+/, "");

export default function HqDashboard() {
  const tab = useTab("overview");
  return (
    <AppShell
      nav={[
        { key: "overview", label: "All branches" },
        { key: "sales", label: "Sales" },
        { key: "orders", label: "Orders" },
        { key: "staff", label: "Staff & salaries" },
      ]}
    >
      {tab === "overview" && <HqOverviewTab />}
      {tab === "sales" && <HqSalesTab />}
      {tab === "orders" && <HqOrdersTab />}
      {tab === "staff" && <HqStaffTab />}
    </AppShell>
  );
}

export function HqOverviewTab() {
  const { data, error } = useApi<HqOverview>("/api/hq/overview", 15000);
  if (error) return <Notice>{error}</Notice>;
  if (!data) return <Loading />;
  const t = data.totals;
  return (
    <>
      <PageHeader title="All branches" sub={`${t.activeBranches} open branches, consolidated.`} />
      <div className="figures">
        <Figure value={moneyShort(t.revenue)} label="Revenue, all time" hint={`${t.orders.toLocaleString("en-GB")} orders`} />
        <Figure value={money(t.revenueToday)} label="Revenue today" hint={`${data.ordersToday.DELIVERED} orders served`} />
        <Figure value={t.activeOrders} label="Orders in progress" hint="Across every kitchen" />
        <Figure value={t.staff} label="Staff" hint={`${t.customers} registered customers`} />
      </div>
      <div className="grid-2 grid-2-wide">
        <section className="panel">
          <h2 className="panel-title">Revenue by branch</h2>
          <RankBars rows={[...data.branches].sort((a, b) => b.revenue - a.revenue).map((b) => ({ label: city(b.name), value: b.revenue }))} format={moneyShort} />
        </section>
        <section className="panel">
          <h2 className="panel-title">Right now</h2>
          <table className="table table-flush">
            <thead>
              <tr>
                <th>Branch</th>
                <th className="num">Today</th>
                <th className="num">In progress</th>
              </tr>
            </thead>
            <tbody>
              {data.branches.map((b) => (
                <tr key={b.id}>
                  <td>{city(b.name)}</td>
                  <td className="num">{money(b.revenueToday)}</td>
                  <td className="num">{b.activeOrders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <section className="panel">
        <h2 className="panel-title">Branch details</h2>
        <div className="table-scroll">
          <table className="table table-flush">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Address</th>
                <th className="num">Staff</th>
                <th className="num">Tables</th>
                <th className="num">Dishes</th>
                <th className="num">Orders</th>
                <th className="num">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.branches.map((b) => (
                <tr key={b.id} className={b.isActive ? "" : "row-muted"}>
                  <td>
                    <strong>{city(b.name)}</strong>
                  </td>
                  <td className="muted small">{b.address}</td>
                  <td className="num">{b.staff}</td>
                  <td className="num">{b.tables}</td>
                  <td className="num">{b.menuItems}</td>
                  <td className="num">{b.orders.toLocaleString("en-GB")}</td>
                  <td className="num">{money(b.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function HqSalesTab() {
  const { data, error } = useApi<HqSales>("/api/hq/sales");
  if (error) return <Notice>{error}</Notice>;
  if (!data) return <Loading />;
  return (
    <>
      <PageHeader title="Sales" sub={`${money(data.totalRevenue)} across the chain. Counted when an order is served.`} />
      <SalesView report={data} />
      <section className="panel">
        <h2 className="panel-title">By branch</h2>
        <div className="scroll-x">
        <table className="table table-flush">
          <thead>
            <tr>
              <th>Branch</th>
              <th className="num">Orders served</th>
              <th className="num">Average order</th>
              <th className="num">Revenue</th>
              <th className="num">Share</th>
            </tr>
          </thead>
          <tbody>
            {data.byBranch.map((b) => (
              <tr key={b.branchId}>
                <td>{city(b.branch)}</td>
                <td className="num">{b.orders.toLocaleString("en-GB")}</td>
                <td className="num">{money(b.averageOrderValue)}</td>
                <td className="num">{money(b.revenue)}</td>
                <td className="num">{data.totalRevenue ? Math.round((b.revenue / data.totalRevenue) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="num">{data.byBranch.reduce((s, b) => s + b.orders, 0).toLocaleString("en-GB")}</td>
              <td className="num">{money(data.averageOrderValue)}</td>
              <td className="num">{money(data.totalRevenue)}</td>
              <td className="num">100%</td>
            </tr>
          </tfoot>
        </table>
        </div>
      </section>
    </>
  );
}

function BranchSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data } = useApi<Branch[]>("/api/public/branches");
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Branch">
      <option value="">All branches</option>
      {data?.map((b) => (
        <option key={b.id} value={b.id}>
          {city(b.name)}
        </option>
      ))}
    </select>
  );
}

export function HqOrdersTab() {
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState("");
  const qs = new URLSearchParams({ ...(branchId ? { branchId } : {}), ...(status ? { status } : {}) }).toString();
  const { data, error } = useApi<Order[]>(`/api/hq/orders${qs ? `?${qs}` : ""}`, 15000);
  return (
    <>
      <PageHeader
        title="Orders"
        sub="Every order in every branch, newest first (latest 500)."
        actions={<BranchSelect value={branchId} onChange={setBranchId} />}
      />
      <StatusFilter value={status} onChange={setStatus} />
      {error && <Notice>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && data.length === 0 && <Empty title="No orders match these filters" />}
      {data && data.length > 0 && <OrdersTable orders={data} showBranch />}
    </>
  );
}

export function HqStaffTab() {
  const [branchId, setBranchId] = useState("");
  const { data, error } = useApi<{
    staff: StaffMember[];
    byBranch: { branch: string; headcount: number; totalSalaries: number }[];
    headcount: number;
    totalSalaries: number;
  }>(`/api/hq/staff${branchId ? `?branchId=${branchId}` : ""}`);
  return (
    <>
      <PageHeader title="Staff & salaries" sub="All staff at every location." actions={<BranchSelect value={branchId} onChange={setBranchId} />} />
      {error && <Notice>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && (
        <>
          <div className="figures figures-2">
            <Figure value={data.headcount} label="People" />
            <Figure value={money(data.totalSalaries)} label="Annual salaries" hint={`${money(data.totalSalaries / 12)} a month`} />
          </div>
          {!branchId && (
            <section className="panel">
              <h2 className="panel-title">Payroll by location</h2>
              <RankBars rows={data.byBranch.map((b) => ({ label: city(b.branch), value: b.totalSalaries, sub: `${b.headcount} people` }))} />
            </section>
          )}
          <StaffTable staff={data.staff} showBranch />
        </>
      )}
    </>
  );
}
