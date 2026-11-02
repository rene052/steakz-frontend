import { money, moneyShort, roleLabel } from "../format";
import type { SalesReport, StaffMember } from "../types";
import { BarChart, Figure } from "./ui";

const shortDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/** Sales figures, 14-day chart and best sellers — used by branch managers and HQ. */
export function SalesView({ report, chartOnly }: { report: SalesReport; chartOnly?: boolean }) {
  const chart = (
    <BarChart
      highlightLast
      data={report.daily.map((d) => ({
        label: shortDay(d.date),
        value: d.revenue,
        title: `${shortDay(d.date)}: ${money(d.revenue)} from ${d.orders} orders`,
      }))}
    />
  );
  if (chartOnly) return chart;
  return (
    <>
      <div className="figures">
        <Figure value={money(report.today.revenue)} label="Today" hint={`${report.today.orders} orders`} />
        <Figure value={moneyShort(report.last7Days.revenue)} label="Last 7 days" hint={`${report.last7Days.orders} orders`} />
        <Figure value={moneyShort(report.last30Days.revenue)} label="Last 30 days" hint={`${report.last30Days.orders} orders`} />
        <Figure value={money(report.averageOrderValue)} label="Average order" hint={`${moneyShort(report.allTime.revenue)} all time`} />
      </div>
      <div className="grid-2 grid-2-wide">
        <section className="panel">
          <h2 className="panel-title">Revenue, last 14 days</h2>
          {chart}
        </section>
        <section className="panel">
          <h2 className="panel-title">Best sellers, last 30 days</h2>
          <table className="table table-flush">
            <tbody>
              {report.topItems.map((t) => (
                <tr key={t.name}>
                  <td>{t.name}</td>
                  <td className="num muted">{t.quantity} sold</td>
                  <td className="num">{money(t.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

export function StaffTable({ staff, showBranch }: { staff: StaffMember[]; showBranch?: boolean }) {
  return (
    <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            {showBranch && <th>Branch</th>}
            <th>Email</th>
            <th className="num">Annual salary</th>
            <th>Account</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id} className={s.isActive ? "" : "row-muted"}>
              <td>
                <strong>{s.name}</strong>
              </td>
              <td>{roleLabel[s.role]}</td>
              {showBranch && <td>{s.branch?.name.replace("Steakz ", "") ?? "Head office"}</td>}
              <td className="muted">{s.email}</td>
              <td className="num">{s.salary != null ? money(s.salary) : "–"}</td>
              <td>{s.isActive ? "Active" : "Disabled"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
