import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

type Status = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
const STATUSES: Status[] = ["pending", "confirmed", "in_progress", "completed", "cancelled"];

export default function HomeSolutionsAdmin() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<Status | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth?next=/admin/home-solutions"); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const ok = (roles || []).some((r: any) => r.role === "vendor" || r.role === "admin");
      setAllowed(ok);
      setAuthChecked(true);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!allowed) return;
    const load = async () => {
      const { data } = await supabase
        .from("home_solutions_bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows(data || []);
    };
    load();
    const ch = supabase
      .channel("hsb-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "home_solutions_bookings" },
        (p: any) => {
          setRows(prev => {
            if (p.eventType === "INSERT") return [p.new, ...prev];
            if (p.eventType === "UPDATE") return prev.map(r => r.id === p.new.id ? p.new : r);
            return prev;
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [allowed]);

  const setStatus = async (id: string, status: Status) => {
    setBusy(id);
    await supabase.from("home_solutions_bookings").update({ status }).eq("id", id);
    setBusy(null);
  };

  if (!authChecked) return <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Checking access…</div>;
  if (!allowed) return (
    <div style={{ padding: 40, textAlign: "center", maxWidth: 420, margin: "0 auto" }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🔒</div>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Vendor access only</div>
      <div style={{ fontSize: 13, color: "#666" }}>This dashboard is restricted to Nexgenn operations staff. Contact the admin to request access.</div>
    </div>
  );

  const visible = filter === "all" ? rows : rows.filter(r => r.status === filter);
  const counts = STATUSES.reduce((acc: any, s) => { acc[s] = rows.filter(r => r.status === s).length; return acc; }, {});

  return (
    <>
      <Helmet><title>Home Solutions Operations — Vendor Dashboard</title></Helmet>
      <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#F4F5F9", minHeight: "100vh", maxWidth: 720, margin: "0 auto", padding: "16px 16px 32px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "14px 18px", marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>Home Solutions Ops</div>
          <div style={{ fontSize: 12, color: "#666" }}>Live bookings · Nexgenn × Chatr+</div>
        </div>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 4 }}>
          {(["all", ...STATUSES] as const).map(s => (
            <button key={s} onClick={() => setFilter(s as any)}
              style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 20, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: filter === s ? "#0F3460" : "#fff", color: filter === s ? "#fff" : "#444" }}>
              {s === "all" ? `All (${rows.length})` : `${s.replace("_", " ")} (${counts[s] || 0})`}
            </button>
          ))}
        </div>

        {visible.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, textAlign: "center", color: "#888", fontSize: 13 }}>No bookings in this view.</div>
        )}

        {visible.map(r => (
          <div key={r.id} style={{ background: "#fff", borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 26 }}>{r.item_icon || "📦"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#111" }}>{r.item_title}</div>
                <div style={{ fontSize: 11, color: "#888" }}>{new Date(r.created_at).toLocaleString()} · {r.category}</div>
              </div>
              <div style={{ fontWeight: 800, color: "#0F3460", fontSize: 14 }}>
                {r.total_amount ? `₹${Number(r.total_amount).toLocaleString("en-IN")}` : (r.price_label || "Quote")}
              </div>
            </div>
            <div style={{ background: "#F4F5F9", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: "#333", marginBottom: 8 }}>
              <div><strong>{r.contact_name}</strong> · <a href={`tel:${r.contact_phone}`} style={{ color: "#0F3460" }}>{r.contact_phone}</a></div>
              <div style={{ marginTop: 2 }}>📍 {r.address}</div>
              {r.preferred_date && <div style={{ marginTop: 2 }}>📅 {new Date(r.preferred_date).toLocaleDateString()}</div>}
              {r.notes && <div style={{ marginTop: 2, color: "#666" }}>📝 {r.notes}</div>}
              <div style={{ marginTop: 4, fontSize: 11, color: "#666" }}>💳 {r.payment_method} · {r.payment_status}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STATUSES.filter(s => s !== r.status).map(s => (
                <button key={s} onClick={() => setStatus(r.id, s)} disabled={busy === r.id}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "capitalize", opacity: busy === r.id ? 0.5 : 1 }}>
                  → {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
