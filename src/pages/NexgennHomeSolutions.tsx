import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

// ─── Data ────────────────────────────────────────────────────────────────────
const workers = [
  { id: 1, title: "Carpenter", icon: "🪚", skilled: true, rate: "₹1,300 – ₹1,500", unit: "per day", tag: "Most Booked", tagColor: "#FF6B35", desc: "Furniture, doors, false ceiling, framework", available: 4, rating: 4.8 },
  { id: 2, title: "Mason / Raj Mistri", icon: "🧱", skilled: true, rate: "₹1,300 – ₹1,500", unit: "per day", tag: "Top Rated", tagColor: "#4CAF50", desc: "Brickwork, plastering, tiling, flooring", available: 3, rating: 4.7 },
  { id: 3, title: "Electrician", icon: "⚡", skilled: true, rate: "₹1,300 – ₹1,500", unit: "per day", tag: null as string | null, tagColor: null as string | null, desc: "Wiring, fitting, panel work, earthing", available: 2, rating: 4.6 },
  { id: 4, title: "Plumber", icon: "🔧", skilled: true, rate: "₹1,300 – ₹1,500", unit: "per day", tag: null, tagColor: null, desc: "Pipework, fixtures, drainage, waterproofing", available: 2, rating: 4.5 },
  { id: 5, title: "General Labour", icon: "👷", skilled: false, rate: "₹700 – ₹900", unit: "per day", tag: "Best Value", tagColor: "#5B67FF", desc: "Loading, digging, mixing, site support", available: 8, rating: 4.4 },
  { id: 6, title: "Construction Team", icon: "🏗️", skilled: true, rate: "Custom Quote", unit: "full project", tag: "New", tagColor: "#E91E8C", desc: "End-to-end managed team for your project", available: 1, rating: 4.9 },
];

const materials = [
  { name: "Cement (50kg bag)", price: "₹420", icon: "🏺" },
  { name: "River Sand (cubic ft)", price: "₹65", icon: "⛏️" },
  { name: "Red Bricks (per 1000)", price: "₹8,500", icon: "🧱" },
  { name: "MS Rod 10mm (per kg)", price: "₹72", icon: "🔩" },
];

const interiorServices = [
  { id: 1, title: "Living Room Design", icon: "🛋️", price: "From ₹8,000", tag: "Most Popular", tagColor: "#C9A96E", desc: "Space planning, furniture layout, colour palette, decor", rating: 4.9, time: "3–5 days" },
  { id: 2, title: "Bedroom Makeover", icon: "🛏️", price: "From ₹6,500", tag: "Trending", tagColor: "#B5838D", desc: "Wardrobe styling, lighting, wallpaper, soft furnishings", rating: 4.8, time: "2–4 days" },
  { id: 3, title: "Kitchen Styling", icon: "🍳", price: "From ₹5,000", tag: null as string | null, tagColor: null as string | null, desc: "Modular planning, tile selection, storage solutions", rating: 4.7, time: "2–3 days" },
  { id: 4, title: "False Ceiling & Lighting", icon: "💡", price: "From ₹12,000", tag: "Premium", tagColor: "#7C6D8A", desc: "POP, gypsum, cove lighting, chandelier placement", rating: 4.8, time: "4–6 days" },
  { id: 5, title: "Wallpaper & Textures", icon: "🖼️", price: "From ₹3,500", tag: "Quick", tagColor: "#4CAF50", desc: "Feature walls, textured finishes, panel installation", rating: 4.6, time: "1–2 days" },
  { id: 6, title: "Full Home Interior", icon: "🏡", price: "Custom Quote", tag: "Complete Package", tagColor: "#C9A96E", desc: "End-to-end interior design for your entire home", rating: 5.0, time: "Custom timeline" },
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

type Section = "home" | "construction" | "interior";

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

  const confirmBook = () => { setBooked(selected); setSelected(null); };
  const goHome = () => { setSection("home"); setParams({}); };
  const goBack = () => { if (section === "home") navigate(-1); else goHome(); };

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
          booked={booked} setBooked={setBooked}
          confirmBook={confirmBook}
        />
      )}
      {section === "interior" && (
        <InteriorScreen
          tab={interiorTab} setTab={setInteriorTab}
          onBack={goHome}
          selected={selected} setSelected={setSelected}
          booked={booked} setBooked={setBooked}
          confirmBook={confirmBook}
        />
      )}
      {section === "home" && <HomeScreen onBack={goBack} onPick={(s) => setSection(s)} />}
    </>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────────────
function HomeScreen({ onBack, onPick }: { onBack: () => void; onPick: (s: Section) => void }) {
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#F4F5F9", minHeight: "100vh", maxWidth: 420, margin: "0 auto", paddingBottom: 24 }}>
      <div style={{ background: "#fff", padding: "14px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 20, cursor: "pointer" }} onClick={onBack}>←</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>Home Solutions by Nexgenn</div>
            <div style={{ fontSize: 12, color: "#6B6F82" }}>powered by Chatr+</div>
          </div>
        </div>
        <div style={{ background: "#F4F5F9", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, background: "#EEF0FF", borderRadius: 8, padding: "4px 6px" }}>📍</span>
            <div>
              <div style={{ fontSize: 11, color: "#888" }}>Deliver to</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Noida</div>
            </div>
          </div>
          <span style={{ color: "#5B67FF", fontSize: 18 }}>›</span>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", marginTop: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <span style={{ fontSize: 18, color: "#aaa" }}>🔍</span>
          <span style={{ color: "#bbb", fontSize: 14 }}>Search for services...</span>
        </div>

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

        <div style={{ marginTop: 20, fontWeight: 800, fontSize: 16, color: "#111", marginBottom: 12 }}>Other Services</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[["🧹","Cleaning","₹399"], ["❄️","AC Service","₹499"], ["🌿","Pest Control","₹599"], ["💇","Salon","₹299"], ["🔌","Appliances","₹349"], ["🖌️","Painting","₹799"]].map(([icon, name, price]) => (
            <div key={name} style={{ background: "#fff", borderRadius: 16, padding: "14px 10px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 26, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#111" }}>{name}</div>
              <div style={{ fontSize: 11, color: "#5B67FF", fontWeight: 600 }}>{price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Construction ────────────────────────────────────────────────────────────
function ConstructionScreen({ tab, setTab, onBack, selected, setSelected, booked, setBooked, confirmBook }: any) {
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#F4F5F9", minHeight: "100vh", maxWidth: 420, margin: "0 auto", position: "relative", paddingBottom: 32 }}>
      <div style={{ background: "#fff", padding: "14px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 20, cursor: "pointer" }} onClick={onBack}>←</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>Construction Services</div>
            <div style={{ fontSize: 12, color: "#6B6F82" }}>by Nexgenn · powered by Chatr+</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div style={{ marginTop: 16, borderRadius: 20, background: "linear-gradient(135deg, #1A1A2E, #0F3460)", padding: "20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          <div style={{ position: "absolute", top: -30, right: -20, fontSize: 100, opacity: 0.07, transform: "rotate(-15deg)" }}>🏗️</div>
          <div style={{ position: "relative" }}>
            <div style={{ display: "inline-block", background: "rgba(255,107,53,0.2)", border: "1px solid rgba(255,107,53,0.5)", color: "#FF6B35", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginBottom: 8 }}>⚡ LAUNCH OFFER</div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 22, lineHeight: 1.2, marginBottom: 6 }}>First Booking<br /><span style={{ color: "#FF6B35" }}>₹200 OFF</span></div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 14 }}>Use code: <strong style={{ color: "#fff" }}>BUILD200</strong> · Skilled workers at your site</div>
            <button style={{ background: "#fff", color: "#0F3460", border: "none", borderRadius: 25, padding: "9px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Book Now →</button>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>Skilled Workers</div>
                <div style={{ fontSize: 12, color: "#5B67FF", fontWeight: 600 }}>See all</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {workers.filter(w => w.skilled && w.id !== 6).map(w => <WorkerCard key={w.id} worker={w} onBook={() => setSelected(w)} theme="navy" />)}
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#111", marginBottom: 12 }}>Daily Labour</div>
              {workers.filter(w => !w.skilled).map(w => <WorkerCard key={w.id} worker={w} onBook={() => setSelected(w)} theme="navy" />)}
            </div>
            <div style={{ marginTop: 16 }}>
              {workers.filter(w => w.id === 6).map(w => (
                <div key={w.id} style={{ background: "linear-gradient(135deg, #FF6B35, #E91E8C)", borderRadius: 18, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -10, right: -10, fontSize: 70, opacity: 0.1 }}>🏗️</div>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 700, marginBottom: 4, letterSpacing: 1 }}>MANAGED PROJECT</div>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Full Construction Team</div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginBottom: 14 }}>Carpenter + Mason + Labour + Material — all coordinated by us</div>
                  <button onClick={() => setSelected(w)} style={{ background: "#fff", color: "#E91E8C", border: "none", borderRadius: 20, padding: "8px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Get Custom Quote →</button>
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
              {materials.map((m, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 28, background: "#F4F5F9", borderRadius: 12, padding: "6px 10px" }}>{m.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>In stock · Fast delivery</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#0F3460" }}>{m.price}</div>
                    <button style={{ background: "#EEF0FF", color: "#5B67FF", border: "none", borderRadius: 8, padding: "4px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", marginTop: 4 }}>+ Add</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, background: "#fff", borderRadius: 16, padding: "14px 16px", border: "2px dashed #ddd", textAlign: "center", color: "#888", fontSize: 13, fontWeight: 600 }}>+ Request a material not listed</div>
          </div>
        )}
      </div>

      {selected && <BookingModal selected={selected} onClose={() => setSelected(null)} onConfirm={confirmBook} theme="navy" />}
      {booked && <SuccessToast booked={booked} onClose={() => setBooked(null)} theme="navy" />}
    </div>
  );
}

// ─── Interior ────────────────────────────────────────────────────────────────
function InteriorScreen({ tab, setTab, onBack, selected, setSelected, booked, setBooked, confirmBook }: any) {
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#FBF8F4", minHeight: "100vh", maxWidth: 420, margin: "0 auto", position: "relative", paddingBottom: 32 }}>
      <div style={{ background: "linear-gradient(135deg, #2C1F3E 0%, #5C3D6B 100%)", padding: "14px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 20, cursor: "pointer", color: "#fff" }} onClick={onBack}>←</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#fff" }}>Interior Design</div>
            <div style={{ fontSize: 12, color: "rgba(201,169,110,0.8)" }}>by Nexgenn · Women-led Studio ✨</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div style={{ marginTop: 16, borderRadius: 22, background: "linear-gradient(135deg, #3D2B54, #7B4F7B)", padding: "22px 20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 80% 50%, rgba(201,169,110,0.15) 0%, transparent 60%)" }} />
          <div style={{ position: "absolute", bottom: -20, right: -10, fontSize: 100, opacity: 0.08, transform: "rotate(15deg)" }}>🏡</div>
          <div style={{ position: "relative" }}>
            <div style={{ display: "inline-block", background: "rgba(201,169,110,0.2)", border: "1px solid rgba(201,169,110,0.4)", color: "#C9A96E", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginBottom: 8 }}>✨ INTRODUCTORY OFFER</div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 22, lineHeight: 1.2, marginBottom: 6 }}>Free Home Consultation<br /><span style={{ color: "#C9A96E" }}>Book This Week</span></div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginBottom: 14 }}>Expert design advice, mood boards & cost estimate — at your home</div>
            <button style={{ background: "linear-gradient(135deg, #C9A96E, #A0784A)", color: "#fff", border: "none", borderRadius: 25, padding: "9px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Book Free Visit →</button>
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
              <div key={i} style={{ minWidth: 100, height: 80, borderRadius: 16, background: m.color, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
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
              {interiorServices.filter(s => s.id !== 6).map(s => (
                <div key={s.id} style={{ background: "#fff", borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, position: "relative", overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                  {s.tag && <div style={{ position: "absolute", top: 10, right: 10, background: s.tagColor || "#888", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{s.tag}</div>}
                  <div style={{ fontSize: 28, background: "#F9F4EE", borderRadius: 14, padding: "8px 12px", flexShrink: 0 }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#2C1F3E" }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{s.desc}</div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#5C3D6B" }}>{s.price}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>⭐ {s.rating} · ⏱ {s.time}</div>
                  </div>
                  <button onClick={() => setSelected(s)} style={{ background: "linear-gradient(135deg, #2C1F3E, #5C3D6B)", color: "#fff", border: "none", borderRadius: 12, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Book</button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, borderRadius: 20, background: "linear-gradient(135deg, #C9A96E, #8B5E3C)", padding: "20px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", bottom: -15, right: -5, fontSize: 80, opacity: 0.1 }}>🏡</div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 700, marginBottom: 4, letterSpacing: 1 }}>COMPLETE TRANSFORMATION</div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Full Home Interior</div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginBottom: 14 }}>Living + Bedroom + Kitchen + All rooms — one team, one vision</div>
              <button onClick={() => setSelected(interiorServices.find(s => s.id === 6))} style={{ background: "#fff", color: "#8B5E3C", border: "none", borderRadius: 20, padding: "8px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Get Custom Quote →</button>
            </div>
          </div>
        )}

        {tab === "packages" && (
          <div style={{ marginTop: 16 }}>
            {[
              { name: "Starter Refresh", price: "₹15,000", rooms: "1 Room", items: ["Colour consultation", "Furniture layout", "Soft furnishings advice", "1 mood board"], color: "#E8E0D5", accent: "#8B7355", dark: false },
              { name: "Home Makeover", price: "₹35,000", rooms: "2–3 Rooms", items: ["Full design plan", "3D visualisation", "Vendor coordination", "Site supervision"], color: "#2C1F3E", accent: "#C9A96E", dark: true },
              { name: "Premium Studio", price: "Custom", rooms: "Full Home", items: ["Dedicated designer", "Custom furniture", "Complete execution", "Post-move styling"], color: "linear-gradient(135deg,#C9A96E,#8B5E3C)", accent: "#fff", dark: true },
            ].map((pkg, i) => (
              <div key={i} style={{ borderRadius: 20, background: pkg.color, padding: "20px", marginBottom: 12, position: "relative", overflow: "hidden" }}>
                <div style={{ color: pkg.dark ? "rgba(255,255,255,0.6)" : "#888", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{pkg.rooms}</div>
                <div style={{ color: pkg.dark ? "#fff" : "#2C1F3E", fontWeight: 800, fontSize: 20, marginBottom: 2 }}>{pkg.name}</div>
                <div style={{ color: pkg.accent, fontWeight: 800, fontSize: 18, marginBottom: 12 }}>{pkg.price}</div>
                {pkg.items.map((item, j) => (
                  <div key={j} style={{ color: pkg.dark ? "rgba(255,255,255,0.75)" : "#555", fontSize: 12, marginBottom: 4 }}>✓ {item}</div>
                ))}
                <button style={{ marginTop: 14, background: pkg.dark ? "rgba(255,255,255,0.15)" : "#2C1F3E", color: "#fff", border: "none", borderRadius: 14, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Choose Package</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && <BookingModal selected={selected} onClose={() => setSelected(null)} onConfirm={confirmBook} theme="interior" />}
      {booked && <SuccessToast booked={booked} onClose={() => setBooked(null)} theme="interior" />}
    </div>
  );
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

function BookingModal({ selected, onClose, onConfirm, theme }: any) {
  const accent = theme === "interior" ? "linear-gradient(135deg, #2C1F3E, #5C3D6B)" : "linear-gradient(135deg, #0F3460, #5B67FF)";
  const isInterior = theme === "interior";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", width: "100%", maxWidth: 420, margin: "0 auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "#ddd", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 40, background: isInterior ? "#F9F4EE" : "#F4F5F9", borderRadius: 14, padding: "10px 14px" }}>{selected.icon}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{selected.title}</div>
            <div style={{ color: "#888", fontSize: 13 }}>{selected.desc}</div>
          </div>
        </div>
        <div style={{ background: "#F4F5F9", borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#666", fontSize: 13 }}>{isInterior ? "Service Rate" : "Worker Rate"}</span>
            <span style={{ fontWeight: 700 }}>{selected.price || selected.rate}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#666", fontSize: 13 }}>Platform Fee</span>
            <span style={{ fontWeight: 700, color: isInterior ? "#5C3D6B" : "#5B67FF" }}>Included</span>
          </div>
          <div style={{ borderTop: "1px solid #ddd", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700 }}>You Pay</span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>{selected.price || selected.rate}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "13px", borderRadius: 14, border: "2px solid #ddd", background: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 2, padding: "13px", borderRadius: 14, border: "none", background: accent, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>Confirm Booking →</button>
        </div>
      </div>
    </div>
  );
}

function SuccessToast({ booked, onClose, theme }: any) {
  const bg = theme === "interior" ? "#2C1F3E" : "#0F3460";
  return (
    <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: bg, color: "#fff", padding: "12px 24px", borderRadius: 30, fontWeight: 700, fontSize: 14, zIndex: 200, boxShadow: "0 8px 30px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
      ✅ {booked.title} booked! We'll confirm shortly.
      <span onClick={onClose} style={{ marginLeft: 12, cursor: "pointer", opacity: 0.7 }}>✕</span>
    </div>
  );
}
