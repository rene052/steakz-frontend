import { Link, NavLink, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import type { ReactNode } from "react";
import { homeFor, useAuth } from "../auth";
import { roleLabel } from "../format";

export function Wordmark({ light }: { light?: boolean }) {
  return (
    <Link to="/" className={`wordmark ${light ? "wordmark-light" : ""}`} aria-label="Steakz home">
      Steakz
    </Link>
  );
}

/** Header + footer for the public site (guests and logged-in customers). */
export function PublicLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="public">
      <header className="topbar">
        <div className="topbar-inner">
          <Wordmark light />
          <nav className="topnav" aria-label="Main">
            <NavLink to="/branches">Locations & menus</NavLink>
            {user ? (
              <>
                <NavLink to={homeFor[user.role]}>{user.role === "CUSTOMER" ? "My bookings" : "Dashboard"}</NavLink>
                <button className="link-btn" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login">Log in</NavLink>
                <Link to="/register" className="btn btn-brass btn-sm">
                  Create account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer-inner">
          <span className="wordmark wordmark-light wordmark-sm">Steakz</span>
          <span>Seven steakhouses across the UK. Dine-in and table booking only.</span>
        </div>
      </footer>
    </div>
  );
}

export interface NavItem {
  key: string;
  label: string;
  badge?: number;
}

/** Sidebar shell for every staff/customer dashboard. Sections switch with ?tab=. */
export function AppShell({ nav, children, extra }: { nav: NavItem[]; children: ReactNode; extra?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const current = params.get("tab") || nav[0]?.key;

  return (
    <div className="shell">
      <aside className="sidebar">
        <Wordmark light />
        <div className="who">
          <div className="who-name">{user?.name}</div>
          <div className="who-role">
            {user && roleLabel[user.role]}
            {user?.branch ? `, ${user.branch.name.replace("Steakz ", "")}` : user?.role === "HQ_MANAGER" || user?.role === "ADMIN" ? ", all branches" : ""}
          </div>
        </div>
        <nav className="sidenav" aria-label="Sections">
          {nav.map((n) => (
            <button
              key={n.key}
              className={`sidenav-item ${current === n.key ? "is-active" : ""}`}
              aria-current={current === n.key ? "page" : undefined}
              onClick={() => setParams(n.key === nav[0].key ? {} : { tab: n.key })}
            >
              <span>{n.label}</span>
              {!!n.badge && <span className="sidenav-badge">{n.badge}</span>}
            </button>
          ))}
        </nav>
        {extra}
        <div className="sidebar-foot">
          <Link to="/branches" className="sidebar-link">
            Public site
          </Link>
          <button
            className="sidebar-link"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="shell-main" id="main">
        {children}
      </main>
    </div>
  );
}

export function useTab(defaultTab: string) {
  const [params] = useSearchParams();
  return params.get("tab") || defaultTab;
}
