import Link from "next/link";
import type { Metadata } from "next";
import { getAdminMaidStats } from "@/lib/services/admin/maids";

export const metadata: Metadata = { title: "Admin — SG Maid" };

/**
 * Admin landing page — Phase 6. Deliberately minimal: a quick
 * operational snapshot (profile counts by status) plus the two actions
 * staff actually need day to day. Not an analytics dashboard.
 */
export default async function AdminHomePage() {
  const stats = await getAdminMaidStats();

  return (
    <section className="sec-admin">
      <div className="wrap-admin">
        <h1>Maid Management</h1>
        <p style={{ color: "var(--ink-70)", marginTop: 8 }}>
          Add and update helper profiles. Only ACTIVE profiles with AVAILABLE or RESERVED availability are visible to
          employers.
        </p>

        <div className="admin-stats">
          <div className="admin-stat"><div className="admin-stat__value">{stats.total}</div><div className="admin-stat__label">Total profiles</div></div>
          <div className="admin-stat"><div className="admin-stat__value">{stats.draft}</div><div className="admin-stat__label">Draft</div></div>
          <div className="admin-stat"><div className="admin-stat__value">{stats.active}</div><div className="admin-stat__label">Active</div></div>
          <div className="admin-stat"><div className="admin-stat__value">{stats.available}</div><div className="admin-stat__label">Available</div></div>
          <div className="admin-stat"><div className="admin-stat__value">{stats.reserved}</div><div className="admin-stat__label">Reserved</div></div>
          <div className="admin-stat"><div className="admin-stat__value">{stats.placed}</div><div className="admin-stat__label">Placed</div></div>
          <div className="admin-stat"><div className="admin-stat__value">{stats.inactive}</div><div className="admin-stat__label">Inactive</div></div>
        </div>

        <div className="btns">
          <Link href="/admin/maids" className="btn btn--secondary">Manage Maids</Link>
          <Link href="/admin/maids/new" className="btn btn--primary">Add New Maid</Link>
          <Link href="/admin/clients" className="btn btn--outline">Manage Clients</Link>
        </div>
      </div>
    </section>
  );
}
