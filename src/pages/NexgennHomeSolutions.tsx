import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

// ─── Data ────────────────────────────────────────────────────────────────────
const workers = [
  { id: "w1", title: "Carpenter", icon: "🪚", skilled: true, rate: "₹1,300 – ₹1,500", unitPrice: 1400, unit: "per day", tag: "Most Booked", tagColor: "#FF6B35", desc: "Furniture, doors, false ceiling, framework", available: 4, rating: 4.8 },
  { id: "w2", title: "Mason / Raj Mistri", icon: "🧱", skilled: true, rate: "₹1,300 – ₹1,500", unitPrice: 1400, unit: "per day", tag: "Top Rated", tagColor: "#4CAF50", desc: "Brickwork, plastering, tiling, flooring", available: 3, rating: 4.7 },
  { id: "w3", title: "Electrician", icon: "⚡", skilled: true, rate: "₹1,300 – ₹1,500", unitPrice: 1400, unit: "per day", tag: null as string | null, tagColor: null as string | null, desc: "Wiring, fitting, panel work, earthing", available: 2, rating: 4.6 },
  { id: "w4", title: "Plumber", icon: "🔧", skilled: true, rate: "₹1,300 – ₹1,500", unitPrice: 1400, unit: "per day", tag: null, tagColor: null, desc: "Pipework, fixtures, drainage, waterproofing", available: 2, rating: 4.5 },
  { id: "w5", title: "General Labour", icon: "👷", skilled: false, rate: "₹700 – ₹900", unitPrice: 800, unit: "per day", tag: "Best Value", tagColor: "#5B67FF", desc: "Loading, digging, mixing, site support", available: 8, rating: 4.4 },
  { id: "w6", title: "Construction Team", icon: "🏗️", skilled: true, rate: "Custom Quote", unitPrice: 0, unit: "full project", tag: "New", tagColor: "#E91E8C", desc: "End-to-end managed team for your project", available: 1, rating: 4.9 },
];

const materials = [
  { id: "m1", name: "Cement (50kg bag)", price: 420, icon: "🏺" },
  { id: "m2", name: "River Sand (cubic ft)", price: 65, icon: "⛏️" },
  { id: "m3", name: "Red Bricks (per 1000)", price: 8500, icon: "🧱" },
  { id: "m4", name: "MS Rod 10mm (per kg)", price: 72, icon: "🔩" },
];

const interiorServices = [
  { id: "i1", title: "Living Room Design", icon: "🛋️", price: "From ₹8,000", unitPrice: 8000, tag: "Most Popular", tagColor: "#C9A96E", desc: "Space planning, furniture layout, colour palette, decor", rating: 4.9, time: "3–5 days" },
  { id: "i2", title: "Bedroom Makeover", icon: "🛏️", price: "From ₹6,500", unitPrice: 6500, tag: "Trending", tagColor: "#B5838D", desc: "Wardrobe styling, lighting, wallpaper, soft furnishings", rating: 4.8, time: "2–4 days" },
  { id: "i3", title: "Kitchen Styling", icon: "🍳", price: "From ₹5,000", unitPrice: 5000, tag: null as string | null, tagColor: null as string | null, desc: "Modular planning, tile selection, storage solutions", rating: 4.7, time: "2–3 days" },
  { id: "i4", title: "False Ceiling & Lighting", icon: "💡", price: "From ₹12,000", unitPrice: 12000, tag: "Premium", tagColor: "#7C6D8A", desc: "POP, gypsum, cove lighting, chandelier placement", rating: 4.8, time: "4–6 days" },
  { id: "i5", title: "Wallpaper & Textures", icon: "🖼️", price: "From ₹3,500", unitPrice: 3500, tag: "Quick", tagColor: "#4CAF50", desc: "Feature walls, textured finishes, panel installation", rating: 4.6, time: "1–2 days" },
  { id: "i6", title: "Full Home Interior", icon: "🏡", price: "Custom Quote", unitPrice: 0, tag: "Complete Package", tagColor: "#C9A96E", desc: "End-to-end interior design for your entire home", rating: 5.0, time: "Custom timeline" },
];

const moodBoards = [
  { name: "Modern Minimal", color: "linear-gradient(135deg, #E8E0D5, #C4B49A)", accent: "#8B7355", emoji: "🤍" },
  { name: "Warm Boho", color: "linear-gradient(135deg, #D4956A, #A0522D)", accent: "#fff", emoji: "🪴" },
  { name: "Royal Classic", color: "linear-gradient(135deg, #2C2240, #5C4D7D)", accent: "#C9A96E", emoji: "👑" },
  { name: "Coastal Fresh", color: "linear-gradient(135deg, #B2D8D8, #4A90A4)", accent: "#fff", emoji: "🌊" },
];

const constructionBadges = [
  { icon: "✅", label: "Verified Workers" },
  { icon: "🪪", label: "ID Checked" },
  { icon: "⏰", label: "On-Time" },
  { icon: "🛡️", label: "Guaranteed" },
];

const interiorBadges = [
  { icon: "🎨", label: "Certified Designer" },
  { icon: "📐", label: "Site Visit Incl." },
  { icon: "🏆", label: "Award Winning" },
  { icon: "💬", label: "Dedicated Support" },
];

type Section = "home" | "construction" | "interior" | "orders";
type CartItem = { id: string; name: string; price: number; icon: string; qty: number };

// ─── Main ────────────────────────────────────────────────────────────────────
export default function NexgennHomeSolutions() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initial = (params.get("section") as Section) || "home";
  const [section, setSection] = useState<Section>(initial);
  const [constrTab, setConstrTab] = useState<"workers" | "materials">("workers");
  const [interiorTab, setInteriorTab] = useState<"services" | "packages">("services");
  const [selected, setSelected] = useState<any>(null);
  const [booked, setBooked] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const goHome = () => { setSection("home"); setParams({}); };
  const goBack = () => { if (section === "home") navigate(-1); else goHome(); };

  const addToCart = (m: typeof materials[number]) => {
    setCart(prev => {
      const ex = prev.find(p => p.id === m.id);
      if (ex) return prev.map(p => p.id === m.id ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { id: m.id, name: m.name, price: m.price, icon: m.icon, qty: 1 }];
    });
  };
  const updateQty = (id: string, delta: number) =>
    setCart(prev => prev.flatMap(p => p.id === id ? (p.qty + delta <= 0 ? [] : [{ ...p, qty: p.qty + delta }]) : [p]));

  return (
    <>
      <Helmet>
        <title>Home Solutions by Nexgenn — Workers, Materials & Interior Design</title>
        <meta name="description" content="Book verified construction workers, materials & interior designers. Powered by Nexgenn × Chatr+." />
      </Helmet>
      {section === "construction" && (
        <ConstructionScreen
          tab={constrTab} setTab={setConstrTab}
          onBack={goHome}
          selected={selected} setSelected={setSelected}
          cart={cart} addToCart={addToCart} openCart={() => setCartOpen(true)}
          onOrders={() => setSection("orders")}
        />
      )}
      {section === "interior" && (
        <InteriorScreen
          tab={interiorTab} setTab={setInteriorTab}
          onBack={goHome}
          selected={selected} setSelected={setSelected}
          onOrders={() => setSection("orders")}
        />
      )}
      {section === "orders" && <OrdersScreen onBack={goHome} userId={userId} />}
      {section === "home" && <HomeScreen onBack={goBack} onPick={(s) => setSection(s)} onOrders={() => setSection("orders")} />}

      {selected && (
        <BookingModal
          selected={selected}
          userId={userId}
          onClose={() => setSelected(null)}
          onSuccess={(b) => { setBooked(b); setSelected(null); }}
          theme={section === "interior" ? "interior" : "navy"}
          onAuthRequired={() => { setSelected(null); navigate("/auth?next=/home-solutions"); }}
        />
      )}
      {cartOpen && (
        <CartSheet
          cart={cart} setCart={setCart} updateQty={updateQty}
          onClose={() => setCartOpen(false)}
          userId={userId}
          onCheckout={(b) => { setCart([]); setCartOpen(false); setBooked(b); }}
          onAuthRequired={() => { setCartOpen(false); navigate("/auth?next=/home-solutions"); }}
        />
      )}
      {booked && <ConfirmationSheet booked={booked} onClose={() => setBooked(null)} onViewOrders={() => { setBooked(null); setSection("orders"); }} theme={section === "interior" ? "interior" : "navy"} />}
    </>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────────────
function HomeScreen({ onBack, onPick, onOrders }: { onBack: () => void; onPick: (s: Section) => void; onOrders: () => void }) {
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#F4F5F9", minHeight: "100vh", maxWidth: 420, margin: "0 auto", paddingBottom: 24 }}>
      <div style={{ background: "#fff", padding: "14px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 20, cursor: "pointer" }} onClick={onBack}>←</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>Home Solutions by Nexgenn</div>
            <div style={{ fontSize: 12, color: "#6B6F82" }}>powered by Chatr+</div>
          </div>
          <button onClick={onOrders} style={{ background: "#EEF0FF", color: "#5B67FF", border: "none", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📋 My Orders</button>
        </div>
        <div style={{ background: "#F4F5F9", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, background: "#EEF0FF", borderRadius: 8, padding: "4px 6px" }}>📍</span>
            <div>
              <div style={{ fontSize: 11, color: "#888" }}>Service location</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Set at checkout</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div style={{ marginTop: 18, marginBottom: 6, fontWeight: 800, fontSize: 16, color: "#111" }}>Our Services</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div onClick={() => onPick("construction")} style={{ borderRadius: 22, background: "linear-gradient(135deg, #1A1A2E 0%, #0F3460 100%)", padding: "22px 20px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
            <div style={{ position: "absolute", bottom: -20, right: -10, fontSize: 110, opacity: 0.07, transform: "rotate(-10deg)" }}>🏗️</div>
            <div style={{ position: "relative" }}>
              <div style={{ display: "inline-block", background: "rgba(255,107,53,0.2)", border: "1px solid rgba(255,107,53,0.5)", color: "#FF6B35", fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, marginBottom: 8, letterSpacing: 0.5 }}>CONSTRUCTION & BUILD</div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 22, lineHeight: 1.2, marginBottom: 6 }}>Workers, Labour<br />&amp; Materials</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginBottom: 14 }}>Carpenters · Masons · Electricians · Plumbers · Labour</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "4px 10px", color: "#fff", fontSize: 11, fontWeight: 600 }}>From ₹700/day</div>
                <div style={{ background: "rgba(255,107,53,0.2)", borderRadius: 10, padding: "4px 10px", color: "#FF6B35", fontSize: 11, fontWeight: 700 }}>↗ Book Now</div>
              </div>
            </div>
          </div>

          <div onClick={() => onPick("interior")} style={{ borderRadius: 22, background: "linear-gradient(135deg, #2C1F3E 0%, #5C3D6B 60%, #8B5E8B 100%)", padding: "22px 20px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse, rgba(201,169,110,0.08) 0%, transparent 70%)" }} />
            <div style={{ position: "absolute", bottom: -15, right: -5, fontSize: 100, opacity: 0.1, transform: "rotate(10deg)" }}>🏡</div>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ display: "inline-block", background: "rgba(201,169,110,0.2)", border: "1px solid rgba(201,169,110,0.5)", color: "#C9A96E", fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, letterSpacing: 0.5 }}>INTERIOR DESIGN</div>
                <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "2px 8px", color: "#fff", fontSize: 10, fontWeight: 700 }}>✨ Women-led</div>
              </div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 22, lineHeight: 1.2, marginBottom: 6 }}>Transform Your<br />Living Spaces</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginBottom: 14 }}>Living Room · Bedroom · Kitchen · Full Home</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "4px 10px", color: "#fff", fontSize: 11, fontWeight: 600 }}>From ₹3,500</div>
                <div style={{ background: "rgba(201,169,110,0.25)", borderRadius: 10, padding: "4px 10px", color: "#C9A96E", fontSize: 11, fontWeight: 700 }}>↗ Explore</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Construction ────────────────────────────────────────────────────────────
function ConstructionScreen({ tab, setTab, onBack, selected, setSelected, cart, addToCart, openCart, onOrders }: any) {
  const cartCount = cart.reduce((s: number, c: CartItem) => s + c.qty, 0);
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#F4F5F9", minHeight: "100vh", maxWidth: 420, margin: "0 auto", position: "relative", paddingBottom: cartCount ? 90 : 32 }}>
      <div style={{ background: "#fff", padding: "14px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 20, cursor: "pointer" }} onClick={onBack}>←</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>Construction Services</div>
            <div style={{ fontSize: 12, color: "#6B6F82" }}>by Nexgenn · powered by Chatr+</div>
          </div>
          <button onClick={onOrders} style={{ background: "#EEF0FF", color: "#5B67FF", border: "none", borderRadius: 10, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>📋 Orders</button>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div style={{ marginTop: 16, borderRadius: 20, background: "linear-gradient(135deg, #1A1A2E, #0F3460)", padding: "20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          <div style={{ position: "absolute", top: -30, right: -20, fontSize: 100, opacity: 0.07 }}>🏗️</div>
          <div style={{ position: "relative" }}>
            <div style={{ display: "inline-block", background: "rgba(255,107,53,0.2)", border: "1px solid rgba(255,107,53,0.5)", color: "#FF6B35", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginBottom: 8 }}>⚡ LAUNCH OFFER</div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 22, lineHeight: 1.2, marginBottom: 6 }}>First Booking<br /><span style={{ color: "#FF6B35" }}>₹200 OFF</span></div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 14 }}>Use code: <strong style={{ color: "#fff" }}>BUILD200</strong> · Skilled workers at your site</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 16 }}>
          {constructionBadges.map((b, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "10px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{b.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#444", lineHeight: 1.2 }}>{b.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", background: "#fff", borderRadius: 14, padding: 4, marginTop: 16, gap: 4 }}>
          {(["workers", "materials"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "9px 0", borderRadius: 11, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: tab === t ? "#0F3460" : "transparent", color: tab === t ? "#fff" : "#888", textTransform: "capitalize" }}>
              {t === "workers" ? "👷 Workers" : "🏺 Materials"}
            </button>
          ))}
        </div>

        {tab === "workers" && (
          <>
            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#111", marginBottom: 12 }}>Skilled Workers</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {workers.filter(w => w.skilled && w.id !== "w6").map(w => <WorkerCard key={w.id} worker={w} onBook={() => setSelected({ ...w, category: "worker" })} theme="navy" />)}
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#111", marginBottom: 12 }}>Daily Labour</div>
              {workers.filter(w => !w.skilled).map(w => <WorkerCard key={w.id} worker={w} onBook={() => setSelected({ ...w, category: "worker" })} theme="navy" />)}
            </div>
            <div style={{ marginTop: 16 }}>
              {workers.filter(w => w.id === "w6").map(w => (
                <div key={w.id} style={{ background: "linear-gradient(135deg, #FF6B35, #E91E8C)", borderRadius: 18, padding: "18px 20px" }}>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 700, marginBottom: 4, letterSpacing: 1 }}>MANAGED PROJECT</div>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Full Construction Team</div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginBottom: 14 }}>Carpenter + Mason + Labour + Material — all coordinated by us</div>
                  <button onClick={() => setSelected({ ...w, category: "worker" })} style={{ background: "#fff", color: "#E91E8C", border: "none", borderRadius: 20, padding: "8px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Request Custom Quote →</button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "materials" && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#111", marginBottom: 4 }}>Construction Materials</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>Delivered to your site · Prices include delivery</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {materials.map(m => {
                const inCart = cart.find((c: CartItem) => c.id === m.id);
                return (
                  <div key={m.id} style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 28, background: "#F4F5F9", borderRadius: 12, padding: "6px 10px" }}>{m.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>In stock · Fast delivery</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#0F3460" }}>₹{m.price.toLocaleString("en-IN")}</div>
                      <button onClick={() => addToCart(m)} style={{ background: inCart ? "#0F3460" : "#EEF0FF", color: inCart ? "#fff" : "#5B67FF", border: "none", borderRadius: 8, padding: "4px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", marginTop: 4 }}>
                        {inCart ? `In cart · ${inCart.qty}` : "+ Add"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {cartCount > 0 && (
        <div onClick={openCart} style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 388, background: "#0F3460", color: "#fff", borderRadius: 16, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", boxShadow: "0 8px 24px rgba(15,52,96,0.4)", zIndex: 50 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{cartCount} item{cartCount > 1 ? "s" : ""} in cart</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>₹{cart.reduce((s: number, c: CartItem) => s + c.price * c.qty, 0).toLocaleString("en-IN")}</div>
          </div>
          <div style={{ background: "#FF6B35", padding: "8px 16px", borderRadius: 10, fontWeight: 800, fontSize: 13 }}>Checkout →</div>
        </div>
      )}
    </div>
  );
}

// ─── Interior ────────────────────────────────────────────────────────────────
function InteriorScreen({ tab, setTab, onBack, selected, setSelected, onOrders }: any) {
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#FBF8F4", minHeight: "100vh", maxWidth: 420, margin: "0 auto", position: "relative", paddingBottom: 32 }}>
      <div style={{ background: "linear-gradient(135deg, #2C1F3E 0%, #5C3D6B 100%)", padding: "14px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 20, cursor: "pointer", color: "#fff" }} onClick={onBack}>←</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#fff" }}>Interior Design</div>
            <div style={{ fontSize: 12, color: "rgba(201,169,110,0.8)" }}>by Nexgenn · Women-led Studio ✨</div>
          </div>
          <button onClick={onOrders} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 10, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>📋 Orders</button>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div style={{ marginTop: 16, borderRadius: 22, background: "linear-gradient(135deg, #3D2B54, #7B4F7B)", padding: "22px 20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 80% 50%, rgba(201,169,110,0.15) 0%, transparent 60%)" }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "inline-block", background: "rgba(201,169,110,0.2)", border: "1px solid rgba(201,169,110,0.4)", color: "#C9A96E", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginBottom: 8 }}>✨ INTRODUCTORY OFFER</div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 22, lineHeight: 1.2, marginBottom: 6 }}>Free Home Consultation<br /><span style={{ color: "#C9A96E" }}>Book This Week</span></div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginBottom: 14 }}>Expert design advice, mood boards & cost estimate — at your home</div>
            <button onClick={() => setSelected({ id: "consult", title: "Free Consultation Visit", icon: "🏡", desc: "On-site visit, mood board & cost estimate", unitPrice: 0, price: "Free", category: "interior" })} style={{ background: "linear-gradient(135deg, #C9A96E, #A0784A)", color: "#fff", border: "none", borderRadius: 25, padding: "9px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Book Free Visit →</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 16 }}>
          {interiorBadges.map((b, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "10px 6px", textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{b.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#444", lineHeight: 1.2 }}>{b.label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#2C1F3E", marginBottom: 10 }}>Browse Styles</div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {moodBoards.map((m, i) => (
              <div key={i} style={{ minWidth: 100, height: 80, borderRadius: 16, background: m.color, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 22 }}>{m.emoji}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: m.accent, marginTop: 4, textAlign: "center", padding: "0 6px" }}>{m.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", background: "#fff", borderRadius: 14, padding: 4, marginTop: 16, gap: 4, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          {(["services", "packages"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "9px 0", borderRadius: 11, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: tab === t ? "linear-gradient(135deg, #2C1F3E, #5C3D6B)" : "transparent", color: tab === t ? "#fff" : "#888", textTransform: "capitalize" }}>
              {t === "services" ? "🎨 Services" : "📦 Packages"}
            </button>
          ))}
        </div>

        {tab === "services" && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#2C1F3E", marginBottom: 10 }}>All Services</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {interiorServices.filter(s => s.id !== "i6").map(s => (
                <div key={s.id} style={{ background: "#fff", borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, position: "relative", overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                  {s.tag && <div style={{ position: "absolute", top: 10, right: 10, background: s.tagColor || "#888", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{s.tag}</div>}
                  <div style={{ fontSize: 28, background: "#F9F4EE", borderRadius: 14, padding: "8px 12px", flexShrink: 0 }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#2C1F3E" }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{s.desc}</div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#5C3D6B" }}>{s.price}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>⭐ {s.rating} · ⏱ {s.time}</div>
                  </div>
                  <button onClick={() => setSelected({ ...s, category: "interior" })} style={{ background: "linear-gradient(135deg, #2C1F3E, #5C3D6B)", color: "#fff", border: "none", borderRadius: 12, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Book</button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, borderRadius: 20, background: "linear-gradient(135deg, #C9A96E, #8B5E3C)", padding: "20px" }}>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 700, marginBottom: 4, letterSpacing: 1 }}>COMPLETE TRANSFORMATION</div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Full Home Interior</div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginBottom: 14 }}>Living + Bedroom + Kitchen + All rooms — one team, one vision</div>
              <button onClick={() => setSelected({ ...interiorServices.find(s => s.id === "i6"), category: "interior" })} style={{ background: "#fff", color: "#8B5E3C", border: "none", borderRadius: 20, padding: "8px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Request Custom Quote →</button>
            </div>
          </div>
        )}

        {tab === "packages" && (
          <div style={{ marginTop: 16 }}>
            {[
              { id: "p1", name: "Starter Refresh", price: "₹15,000", unitPrice: 15000, rooms: "1 Room", items: ["Colour consultation", "Furniture layout", "Soft furnishings advice", "1 mood board"], color: "#E8E0D5", accent: "#8B7355", dark: false },
              { id: "p2", name: "Home Makeover", price: "₹35,000", unitPrice: 35000, rooms: "2–3 Rooms", items: ["Full design plan", "3D visualisation", "Vendor coordination", "Site supervision"], color: "#2C1F3E", accent: "#C9A96E", dark: true },
              { id: "p3", name: "Premium Studio", price: "Custom", unitPrice: 0, rooms: "Full Home", items: ["Dedicated designer", "Custom furniture", "Complete execution", "Post-move styling"], color: "linear-gradient(135deg,#C9A96E,#8B5E3C)", accent: "#fff", dark: true },
            ].map(pkg => (
              <div key={pkg.id} style={{ borderRadius: 20, background: pkg.color, padding: "20px", marginBottom: 12 }}>
                <div style={{ color: pkg.dark ? "rgba(255,255,255,0.6)" : "#888", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{pkg.rooms}</div>
                <div style={{ color: pkg.dark ? "#fff" : "#2C1F3E", fontWeight: 800, fontSize: 20, marginBottom: 2 }}>{pkg.name}</div>
                <div style={{ color: pkg.accent, fontWeight: 800, fontSize: 18, marginBottom: 12 }}>{pkg.price}</div>
                {pkg.items.map((item, j) => (
                  <div key={j} style={{ color: pkg.dark ? "rgba(255,255,255,0.75)" : "#555", fontSize: 12, marginBottom: 4 }}>✓ {item}</div>
                ))}
                <button onClick={() => setSelected({ id: pkg.id, title: pkg.name, icon: "📦", desc: pkg.rooms + " · " + pkg.items.join(", "), price: pkg.price, unitPrice: pkg.unitPrice, category: "interior" })} style={{ marginTop: 14, background: pkg.dark ? "rgba(255,255,255,0.15)" : "#2C1F3E", color: "#fff", border: "none", borderRadius: 14, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Choose Package</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Orders Screen ───────────────────────────────────────────────────────────
function OrdersScreen({ onBack, userId }: { onBack: () => void; userId: string | null }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("home_solutions_bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (!cancelled) { setOrders(data || []); setLoading(false); }
    })();

    // Realtime: vendor status updates appear instantly
    const channel = supabase
      .channel(`hsb-user-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "home_solutions_bookings", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          setOrders(prev => {
            if (payload.eventType === "INSERT") return [payload.new, ...prev];
            if (payload.eventType === "UPDATE") return prev.map(o => o.id === payload.new.id ? payload.new : o);
            if (payload.eventType === "DELETE") return prev.filter(o => o.id !== payload.old.id);
            return prev;
          });
        })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [userId]);

  const cancel = async (id: string) => {
    await supabase.from("home_solutions_bookings").update({ status: "cancelled" }).eq("id", id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "cancelled" } : o));
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#F4F5F9", minHeight: "100vh", maxWidth: 420, margin: "0 auto", paddingBottom: 32 }}>
      <div style={{ background: "#fff", padding: "14px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20, cursor: "pointer" }} onClick={onBack}>←</span>
        <div style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>My Orders</div>
      </div>
      <div style={{ padding: 16 }}>
        {!userId && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, textAlign: "center", color: "#666" }}>
            Please sign in to view your orders.
          </div>
        )}
        {userId && loading && <div style={{ textAlign: "center", padding: 24, color: "#888" }}>Loading…</div>}
        {userId && !loading && orders.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            <div style={{ fontWeight: 800, color: "#111" }}>No orders yet</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Your bookings will appear here once placed.</div>
          </div>
        )}
        {orders.map(o => (
          <div key={o.id} style={{ background: "#fff", borderRadius: 16, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 26 }}>{o.item_icon || "📦"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{o.item_title}</div>
                <div style={{ fontSize: 11, color: "#888" }}>
                  {new Date(o.created_at).toLocaleDateString()} · {o.category}
                </div>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div style={{ marginTop: 10, padding: "8px 10px", background: "#F4F5F9", borderRadius: 10, fontSize: 12, color: "#444" }}>
              📍 {o.address}<br />
              📞 {o.contact_phone}
              {o.preferred_date && <><br />📅 {new Date(o.preferred_date).toLocaleDateString()}</>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <div style={{ fontWeight: 800, color: "#0F3460" }}>
                {o.total_amount ? `₹${Number(o.total_amount).toLocaleString("en-IN")}` : (o.price_label || "Quote on request")}
              </div>
              {(o.status === "pending" || o.status === "confirmed") && (
                <button onClick={() => cancel(o.id)} style={{ background: "transparent", color: "#E91E8C", border: "1px solid #E91E8C", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: any = {
    pending: { bg: "#FFF4E5", c: "#FF8800", l: "Pending" },
    confirmed: { bg: "#E5F2FF", c: "#0F3460", l: "Confirmed" },
    in_progress: { bg: "#EEF0FF", c: "#5B67FF", l: "In Progress" },
    completed: { bg: "#E5F8EC", c: "#2E7D32", l: "Completed" },
    cancelled: { bg: "#FDECEA", c: "#C62828", l: "Cancelled" },
  };
  const s = map[status] || map.pending;
  return <span style={{ background: s.bg, color: s.c, fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 20 }}>{s.l}</span>;
}

// ─── Shared ──────────────────────────────────────────────────────────────────
function WorkerCard({ worker, onBook, theme }: any) {
  const accent = theme === "interior" ? "#5C3D6B" : "#0F3460";
  return (
    <div style={{ background: "#fff", borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, position: "relative", overflow: "hidden" }}>
      {worker.tag && <div style={{ position: "absolute", top: 10, right: 10, background: worker.tagColor, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{worker.tag}</div>}
      <div style={{ fontSize: 28, background: "#F4F5F9", borderRadius: 14, padding: "8px 12px", flexShrink: 0 }}>{worker.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#111" }}>{worker.title}</div>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{worker.desc}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: accent }}>{worker.rate}</span>
          <span style={{ fontSize: 11, color: "#aaa" }}>{worker.unit}</span>
        </div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>⭐ {worker.rating} · {worker.available} available today</div>
      </div>
      <button onClick={onBook} style={{ background: accent, color: "#fff", border: "none", borderRadius: 12, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Book</button>
    </div>
  );
}

// ─── Booking Modal ───────────────────────────────────────────────────────────
// E.164 normalization (defaults to +91 for 10-digit IN numbers per project standard)
function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (/^\+[1-9]\d{9,14}$/.test(cleaned)) return cleaned;
  if (/^[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned}`;
  if (/^0[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned.slice(1)}`;
  return null;
}

function BookingModal({ selected, userId, onClose, onSuccess, theme, onAuthRequired }: any) {
  const accent = theme === "interior" ? "linear-gradient(135deg, #2C1F3E, #5C3D6B)" : "linear-gradient(135deg, #0F3460, #5B67FF)";
  const isInterior = theme === "interior";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [payMethod, setPayMethod] = useState<"cod" | "upi_advance">("cod");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("username,phone_number").eq("id", userId).maybeSingle();
      if (data?.username) setName(data.username);
      if (data?.phone_number) setPhone(data.phone_number);
    })();
  }, [userId]);

  const isWorker = selected.category === "worker";
  const total = selected.unitPrice ? selected.unitPrice * qty : 0;
  const unitDisplay = selected.price || selected.rate;

  const submit = async () => {
    setErr("");
    if (!userId) { onAuthRequired(); return; }
    if (!name.trim() || name.trim().length < 2) { setErr("Please enter your name"); return; }
    const normPhone = normalizePhone(phone);
    if (!normPhone) { setErr("Enter a valid 10-digit Indian mobile or full international number"); return; }
    if (address.trim().length < 10) { setErr("Please enter complete address (min 10 chars)"); return; }

    setSubmitting(true);
    // total_amount is intentionally omitted — server trigger recomputes from catalog
    const { data, error } = await supabase.from("home_solutions_bookings").insert({
      user_id: userId,
      category: selected.category,
      item_code: selected.id,
      item_title: selected.title,
      item_icon: selected.icon || null,
      items: [{ id: selected.id, title: selected.title, qty }],
      quantity: qty,
      price_label: unitDisplay,
      contact_name: name.trim(),
      contact_phone: normPhone,
      address: address.trim(),
      preferred_date: date || null,
      notes: notes.trim() || null,
      payment_method: selected.unitPrice > 0 ? payMethod : "cod",
    }).select().single();
    setSubmitting(false);

    if (error) { setErr(error.message); return; }
    supabase.functions.invoke("notify-home-solutions-vendors", { body: { bookingId: data.id } }).catch(() => {});
    onSuccess(data);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", padding: "20px 20px 28px", width: "100%", maxWidth: 420, margin: "0 auto", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "#ddd", borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 32, background: isInterior ? "#F9F4EE" : "#F4F5F9", borderRadius: 12, padding: "8px 12px" }}>{selected.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{selected.title}</div>
            <div style={{ color: "#888", fontSize: 12 }}>{selected.desc}</div>
          </div>
        </div>

        <Field label="Your Name *">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
        </Field>
        <Field label="Phone Number *">
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="98765 43210" inputMode="tel" style={inputStyle} />
        </Field>
        <Field label="Service Address *">
          <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="House no., street, area, city, pincode" rows={2} style={{ ...inputStyle, resize: "vertical" as const }} />
        </Field>
        <Field label="Preferred Date">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} style={inputStyle} />
        </Field>
        {isWorker && selected.unitPrice > 0 && (
          <Field label="Number of days">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={qtyBtn}>−</button>
              <div style={{ fontWeight: 800, minWidth: 30, textAlign: "center" }}>{qty}</div>
              <button onClick={() => setQty(qty + 1)} style={qtyBtn}>+</button>
            </div>
          </Field>
        )}
        {selected.unitPrice > 0 && (
          <Field label="Payment">
            <div style={{ display: "flex", gap: 8 }}>
              {([["cod","Pay after service"],["upi_advance","UPI advance (10%)"]] as const).map(([v,l]) => (
                <button key={v} onClick={() => setPayMethod(v as any)}
                  style={{ flex: 1, padding: "10px", borderRadius: 10, border: payMethod === v ? `2px solid ${isInterior ? "#5C3D6B" : "#0F3460"}` : "2px solid #ddd", background: payMethod === v ? (isInterior ? "#F9F4EE" : "#EEF0FF") : "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{l}</button>
              ))}
            </div>
          </Field>
        )}
        <Field label="Notes (optional)">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any specific requirements" rows={2} style={{ ...inputStyle, resize: "vertical" as const }} />
        </Field>

        <div style={{ background: "#F4F5F9", borderRadius: 12, padding: "12px 14px", marginTop: 6 }}>
          <Row label="Rate" value={unitDisplay} />
          {isWorker && selected.unitPrice > 0 && <Row label={`× ${qty} day${qty > 1 ? "s" : ""}`} value={`₹${(selected.unitPrice * qty).toLocaleString("en-IN")}`} />}
          <Row label="Platform Fee" value="Included" highlight={isInterior ? "#5C3D6B" : "#5B67FF"} />
          <div style={{ borderTop: "1px solid #ddd", marginTop: 6, paddingTop: 6 }}>
            <Row bold label="Estimated Total" value={total > 0 ? `₹${total.toLocaleString("en-IN")}` : unitDisplay} />
          </div>
          {selected.unitPrice === 0 && <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Final quote confirmed after site visit.</div>}
          <div style={{ fontSize: 10, color: "#999", marginTop: 6 }}>🔒 Final price confirmed server-side from live catalog.</div>
        </div>

        {err && <div style={{ color: "#C62828", fontSize: 12, marginTop: 8 }}>{err}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "2px solid #ddd", background: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Cancel</button>
          <button onClick={submit} disabled={submitting} style={{ flex: 2, padding: "13px", borderRadius: 12, border: "none", background: accent, color: "#fff", fontWeight: 800, cursor: submitting ? "wait" : "pointer", fontSize: 14, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Placing…" : "Confirm Booking →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cart Sheet (Materials Checkout) ─────────────────────────────────────────
function CartSheet({ cart, setCart, updateQty, onClose, userId, onCheckout, onAuthRequired }: any) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const total = useMemo(() => cart.reduce((s: number, c: CartItem) => s + c.price * c.qty, 0), [cart]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("username,phone_number").eq("id", userId).maybeSingle();
      if (data?.username) setName(data.username);
      if (data?.phone_number) setPhone(data.phone_number);
    })();
  }, [userId]);

  const place = async () => {
    setErr("");
    if (!userId) { onAuthRequired(); return; }
    if (cart.length === 0) return;
    if (!name.trim() || name.trim().length < 2) { setErr("Please enter your name"); return; }
    const normPhone = normalizePhone(phone);
    if (!normPhone) { setErr("Enter a valid 10-digit Indian mobile or full international number"); return; }
    if (address.trim().length < 10) { setErr("Please enter complete delivery address"); return; }

    setSubmitting(true);
    const titles = cart.map((c: CartItem) => `${c.qty}× ${c.name}`).join(", ");
    // total_amount intentionally omitted — server recomputes from catalog
    const { data, error } = await supabase.from("home_solutions_bookings").insert({
      user_id: userId,
      category: "material",
      item_code: "materials_cart",
      item_title: `Materials Order (${cart.length} item${cart.length > 1 ? "s" : ""})`,
      item_icon: "🏺",
      items: cart.map((c: CartItem) => ({ id: c.id, qty: c.qty, name: c.name })),
      quantity: cart.reduce((s: number, c: CartItem) => s + c.qty, 0),
      price_label: `₹${total.toLocaleString("en-IN")}`,
      contact_name: name.trim(),
      contact_phone: normPhone,
      address: address.trim(),
      preferred_date: date || null,
      notes: titles,
      payment_method: "cod",
    }).select().single();
    setSubmitting(false);

    if (error) { setErr(error.message); return; }
    supabase.functions.invoke("notify-home-solutions-vendors", { body: { bookingId: data.id } }).catch(() => {});
    onCheckout(data);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", padding: "20px 20px 28px", width: "100%", maxWidth: 420, margin: "0 auto", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "#ddd", borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>Your Material Cart</div>

        {cart.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "#888" }}>Cart is empty</div>}

        {cart.map((c: CartItem) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ fontSize: 24 }}>{c.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "#888" }}>₹{c.price.toLocaleString("en-IN")} each</div>
            </div>
            <button onClick={() => updateQty(c.id, -1)} style={qtyBtnSm}>−</button>
            <div style={{ minWidth: 22, textAlign: "center", fontWeight: 700 }}>{c.qty}</div>
            <button onClick={() => updateQty(c.id, 1)} style={qtyBtnSm}>+</button>
            <div style={{ minWidth: 60, textAlign: "right", fontWeight: 800, color: "#0F3460" }}>₹{(c.price * c.qty).toLocaleString("en-IN")}</div>
          </div>
        ))}

        {cart.length > 0 && (
          <>
            <div style={{ marginTop: 14 }}>
              <Field label="Your Name *"><input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputStyle} /></Field>
              <Field label="Phone Number *"><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" inputMode="tel" style={inputStyle} /></Field>
              <Field label="Delivery Address *">
                <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Site address with pincode" rows={2} style={{ ...inputStyle, resize: "vertical" as const }} />
              </Field>
              <Field label="Preferred Delivery Date">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} style={inputStyle} />
              </Field>
            </div>

            <div style={{ background: "#F4F5F9", borderRadius: 12, padding: 12, marginTop: 8 }}>
              <Row label="Subtotal" value={`₹${total.toLocaleString("en-IN")}`} />
              <Row label="Delivery" value="Included" highlight="#5B67FF" />
              <div style={{ borderTop: "1px solid #ddd", marginTop: 6, paddingTop: 6 }}>
                <Row bold label="Total" value={`₹${total.toLocaleString("en-IN")}`} />
              </div>
            </div>

            {err && <div style={{ color: "#C62828", fontSize: 12, marginTop: 8 }}>{err}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "2px solid #ddd", background: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Keep Shopping</button>
              <button onClick={place} disabled={submitting} style={{ flex: 2, padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #0F3460, #5B67FF)", color: "#fff", fontWeight: 800, cursor: submitting ? "wait" : "pointer", fontSize: 14, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Placing…" : "Place Order →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Silent UX-compliant inline bottom sheet (no system toasts)
function ConfirmationSheet({ booked, onClose, onViewOrders, theme }: any) {
  const accent = theme === "interior" ? "#5C3D6B" : "#0F3460";
  const isPaid = booked.payment_status === "paid";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 28px", width: "100%", maxWidth: 420, margin: "0 auto" }}>
        <div style={{ width: 40, height: 4, background: "#ddd", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: accent, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 10 }}>✓</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>Booking confirmed</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Order #{String(booked.id).slice(0, 8).toUpperCase()}</div>
        </div>
        <div style={{ background: "#F4F5F9", borderRadius: 12, padding: "12px 14px", fontSize: 13, color: "#333", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{booked.item_title}</div>
          <div style={{ fontSize: 11, color: "#666" }}>📞 We'll call {booked.contact_phone} to confirm timing.</div>
          {booked.payment_method === "upi_advance" && !isPaid && (
            <div style={{ marginTop: 8, padding: "8px 10px", background: "#FFF4E5", color: "#9A6700", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>UPI advance pending — link will be shared on confirmation call.</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "2px solid #ddd", background: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Close</button>
          <button onClick={onViewOrders} style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: accent, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>View My Orders</button>
        </div>
      </div>
    </div>
  );
}

// ─── Mini UI helpers ─────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, fontFamily: "inherit", background: "#fff", boxSizing: "border-box" };
const qtyBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" };
const qtyBtnSm: React.CSSProperties = { width: 26, height: 26, borderRadius: 8, border: "1px solid #ddd", background: "#fff", fontWeight: 800, cursor: "pointer" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}
function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
      <span style={{ color: bold ? "#111" : "#666", fontWeight: bold ? 800 : 500 }}>{label}</span>
      <span style={{ color: highlight || "#111", fontWeight: bold ? 800 : 700, fontSize: bold ? 15 : 13 }}>{value}</span>
    </div>
  );
}
