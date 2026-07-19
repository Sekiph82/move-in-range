import { requireAdmin, navHref, roleNavigation } from "./session";
import type { ReactNode } from "react";

type Cell = string | number | boolean | null | undefined;

export async function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const { admin, csrf } = await requireAdmin();
  const navItems = roleNavigation[admin.role];
  return (
    <div className="shell">
      <nav className="nav" aria-label="Admin navigation">
        <h1>MoveInRange</h1>
        <p className="role">{admin.email}<br />{admin.role}</p>
        {navItems.map((item) => <a key={item} href={navHref[item] ?? "/dashboard"}>{item}</a>)}
        <form action="/api/admin-session/logout" method="post">
          <input type="hidden" name="csrf" value={csrf} />
          <button type="submit">Log out</button>
        </form>
      </nav>
      <main className="main">
        <div className="page-title">
          <h2>{title}</h2>
          <p>Authenticated administration uses masked records, role checks, and audit logging.</p>
        </div>
        {children}
      </main>
    </div>
  );
}

export function MetricGrid({ items }: { items: { label: string; value: Cell; note?: string }[] }) {
  return (
    <section className="grid">
      {items.map((item) => (
        <article className="card metric" key={item.label}>
          <span>{item.label}</span>
          <strong>{String(item.value ?? "None")}</strong>
          {item.note ? <p>{item.note}</p> : null}
        </article>
      ))}
    </section>
  );
}

export function DataTable({ columns, rows, empty = "No records available." }: { columns: string[]; rows: Record<string, Cell>[]; empty?: string }) {
  if (!rows.length) return <p className="empty">{empty}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row.id ?? row.version ?? index)}>
              {columns.map((column) => {
                const value = row[column];
                const rendered = typeof value === "string" && value.startsWith("/") ? <a href={value}>{value}</a> : String(value ?? "");
                return <td key={column}>{rendered}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DetailList({ items }: { items: { label: string; value: Cell }[] }) {
  return (
    <dl className="details">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{String(item.value ?? "None")}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ErrorPanel({ payload }: { payload: any }) {
  if (!payload?.error) return null;
  return <p className="error">{payload.error}</p>;
}

export function DetailsDisclosure({ title, payload }: { title: string; payload: unknown }) {
  return (
    <details className="payload">
      <summary>{title}</summary>
      <pre>{JSON.stringify(payload, null, 2)}</pre>
    </details>
  );
}
