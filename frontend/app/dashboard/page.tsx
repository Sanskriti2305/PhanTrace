"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type Detection = {
  id: string;
  title: string;
  platform: string;
  account?: string;
  confidence: number;
  threat: string;
  time: string;
  region?: string;
  key?: number;
};

// ── Dummy Data (REMOVE THESE LATER) ──────────────────────────────────────────
// const DETECTIONS = [...]
// const LIVE_FEED_POOL = [...]
// const PLATFORM_DATA = [...]
// const HOTSPOTS = [...]

const threatColor = (t: string): string =>
  t === "HIGH" ? "#E74C3C" : t === "MEDIUM" ? "#F39C12" : "#2E86DE";
const platformIcon = (p: string): string => ({
  youtube: "▶", instagram: "◉", reddit: "●", twitter: "✦",
  tiktok: "♪", facebook: "f", telegram: "✈", web: "◈"
} as Record<string, string>)[p?.toLowerCase()] ?? "◈";

export default function DashboardPage() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [platformData, setPlatformData] = useState<any[]>([]);
  const [liveFeed, setLiveFeed] = useState<Detection[]>([]);
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  const [revenueRisk, setRevenueRisk] = useState(0);
  const [totalDetections, setTotalDetections] = useState(0);
  const [view, setView] = useState("map");
  const [loading, setLoading] = useState(true);
  const feedKey = useRef(100);

  // ── Fetch all detections on mount ──────────────────────────────────────────
  useEffect(() => {
    const fetchDetections = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:8000/api/detections", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status === "success" && data.detections) {
            // Set detections table
            setDetections(data.detections);
            setTotalDetections(data.detections.length);
            
            // Set live feed (latest 8)
            setLiveFeed(
              data.detections.slice(0, 8).map((d: any, i: number) => ({
                ...d,
                key: i,
              }))
            );

            // Calculate platform breakdown
            const platformCounts: Record<string, number> = {};
            data.detections.forEach((d: any) => {
              const p = d.platform?.toLowerCase() || "web";
              platformCounts[p] = (platformCounts[p] || 0) + 1;
            });

            const platforms = Object.entries(platformCounts)
              .map(([name, count]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                count,
                color: "#FF6B2B",
              }))
              .sort((a, b) => b.count - a.count);

            setPlatformData(platforms);

            // Calculate revenue at risk (confidence * 1000)
            const risk = data.detections.reduce(
              (sum: number, d: any) => sum + (d.confidence || 0) * 100,
              0
            );
            setRevenueRisk(Math.round(risk));
          }
        }
      } catch (err) {
        console.error("Detections fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetections();
  }, []);

  // ── Simulate new detections every 5s (optional) ──────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (detections.length > 0) {
        const randomDetection = detections[Math.floor(Math.random() * detections.length)];
        feedKey.current += 1;
        setLiveFeed((prev) => [
          { ...randomDetection, key: feedKey.current },
          ...prev.slice(0, 7),
        ]);
        setRevenueRisk((prev) => prev + Math.floor(Math.random() * 120 + 30));
        setTotalDetections((prev) => prev + 1);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [detections]);

  // ── Convert detections to hotspots ──────────────────────────────────────────
  const HOTSPOTS = detections
    .slice(0, 8)
    .map((d, i) => ({
      x: 20 + (i % 4) * 20,
      y: 25 + Math.floor(i / 4) * 30,
      threat: d.threat,
      platform: d.platform,
      title: d.title,
      confidence: d.confidence,
    }));

  const maxCount = Math.max(...platformData.map((p) => p.count), 1);

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#0d0500", fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.85)", position: "relative", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9rem", color: "#FF6B2B", letterSpacing: "0.15em", textTransform: "uppercase" }}>LOADING DASHBOARD...</p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0d0500", fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.85)", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        .feed-item { animation: slideIn 0.4s ease forwards; }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }

        .hotspot { animation: hotpulse 2s infinite; cursor: pointer; }
        @keyframes hotpulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.7; transform:scale(1.3); } }

        .stat-card { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        .view-btn { transition: all 0.2s; }
        .view-btn:hover { color: #FF6B2B !important; }
        .view-btn.active { color: #FF6B2B !important; border-color: #FF6B2B !important; }

        .bar-fill { transition: width 1s ease; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,107,43,0.2); border-radius: 2px; }

        .tick { animation: tickUp 0.3s ease; }
        @keyframes tickUp { from { transform:translateY(4px); opacity:0; } to { transform:translateY(0); opacity:1; } }
      `}</style>

      <img src="/bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover scale-105" />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,107,43,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,43,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", zIndex: 0, pointerEvents: "none" }} />

      {/* Navbar */}
      <nav style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.4rem 3rem", borderBottom: "1px solid rgba(255,107,43,0.15)", background: "rgba(13,5,0,0.8)", backdropFilter: "blur(12px)" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src="/logo.png" alt="" style={{ height: "28px", width: "28px" }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.5rem", fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>
            Phan<span style={{ color: "#FF6B2B" }}>Trace</span>
          </span>
        </Link>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {[["Home", "/"], ["Upload", "/upload"], ["Dashboard", "/dashboard"], ["Detections", "/detections"], ["Strike", "/strike"]].map(([label, href]) => (
            <Link key={label} href={href} style={{ color: label === "Dashboard" ? "#FF6B2B" : "rgba(255,255,255,0.35)", textDecoration: "none", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {label}
            </Link>
          ))}
          <button style={{ background: "transparent", border: "1px solid rgba(255,107,43,0.2)", color: "rgba(255,255,255,0.4)", padding: "0.45rem 1.2rem", borderRadius: "999px", fontSize: "0.72rem", cursor: "pointer", letterSpacing: "0.08em", fontFamily: "'DM Sans', sans-serif" }}>
            Sign In
          </button>
        </div>
      </nav>

      {/* Page content */}
      <div style={{ position: "relative", zIndex: 1, padding: "2rem 2.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#FF6B2B", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.3rem" }}>live operations</p>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", color: "#fff", lineHeight: 1, letterSpacing: "0.02em" }}>
              WAR <span style={{ color: "#FF6B2B" }}>ROOM</span>
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#39FF14", boxShadow: "0 0 8px #39FF14", animation: "hotpulse 1.5s infinite" }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#39FF14", letterSpacing: "0.15em" }}>SYSTEM ACTIVE</span>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {[
            { label: "Total Detections", value: totalDetections, accent: false },
            { label: "Active Threats", value: detections.filter((d) => d.threat === "HIGH").length, accent: true },
            { label: "Platforms Monitored", value: platformData.length, accent: false },
            { label: "Revenue at Risk", value: `$${revenueRisk.toLocaleString()}`, accent: true },
          ].map(({ label, value, accent }) => (
            <div key={label} className="stat-card" style={{ background: "rgba(22,11,2,0.85)", border: `1px solid ${accent ? "rgba(255,107,43,0.3)" : "rgba(255,107,43,0.1)"}`, borderRadius: "12px", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em", textTransform: "uppercase" }}>{label}</p>
              <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: accent ? "#FF6B2B" : "#fff", lineHeight: 1 }}>{value}</p>
              {accent && <div style={{ height: "2px", width: "24px", background: "#FF6B2B", borderRadius: "1px" }} />}
            </div>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem" }}>

          {/* LEFT: Map + Chart */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* View toggle */}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {["map", "platform", "timeline"].map(v => (
                <button key={v} className={`view-btn ${view === v ? "active" : ""}`} onClick={() => setView(v)} style={{ background: "transparent", border: `1px solid ${view === v ? "#FF6B2B" : "rgba(255,107,43,0.15)"}`, color: view === v ? "#FF6B2B" : "rgba(255,255,255,0.3)", padding: "0.4rem 1rem", borderRadius: "6px", fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>
                  {v === "map" ? "World Map" : v === "platform" ? "By Platform" : "Timeline"}
                </button>
              ))}
            </div>

            {/* World Map */}
            {view === "map" && (
              <div style={{ background: "rgba(16,8,2,0.9)", border: "1px solid rgba(255,107,43,0.15)", borderRadius: "16px", padding: "1.5rem", position: "relative", minHeight: "380px", overflow: "hidden" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1rem" }}>global threat map</p>

                {/* SVG World Map */}
                <svg viewBox="0 0 100 60" style={{ width: "100%", height: "300px" }} preserveAspectRatio="xMidYMid meet">
                  <rect width="100" height="60" fill="rgba(13,5,0,0)" />
                  {[10,20,30,40,50].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,107,43,0.06)" strokeWidth="0.2" />)}
                  {[10,20,30,40,50,60,70,80,90].map(x => <line key={x} x1={x} y1="0" x2={x} y2="60" stroke="rgba(255,107,43,0.06)" strokeWidth="0.2" />)}

                  {/* Continents */}
                  <path d="M8,8 L22,8 L25,12 L23,20 L20,24 L16,28 L12,30 L8,26 L5,20 L6,14 Z" fill="rgba(255,107,43,0.12)" stroke="rgba(255,107,43,0.25)" strokeWidth="0.3" />
                  <path d="M18,32 L26,30 L28,36 L27,44 L24,50 L20,52 L17,48 L16,42 L15,36 Z" fill="rgba(255,107,43,0.1)" stroke="rgba(255,107,43,0.2)" strokeWidth="0.3" />
                  <path d="M40,8 L52,8 L54,12 L52,18 L48,20 L44,19 L40,16 L39,12 Z" fill="rgba(255,107,43,0.12)" stroke="rgba(255,107,43,0.25)" strokeWidth="0.3" />
                  <path d="M42,22 L52,20 L55,26 L54,36 L50,44 L46,46 L42,42 L40,34 L40,26 Z" fill="rgba(255,107,43,0.1)" stroke="rgba(255,107,43,0.2)" strokeWidth="0.3" />
                  <path d="M54,6 L82,6 L86,10 L84,18 L78,22 L68,24 L60,22 L54,18 L52,12 Z" fill="rgba(255,107,43,0.12)" stroke="rgba(255,107,43,0.25)" strokeWidth="0.3" />
                  <path d="M64,24 L70,22 L72,28 L70,34 L66,36 L63,32 L63,26 Z" fill="rgba(255,107,43,0.15)" stroke="rgba(255,107,43,0.3)" strokeWidth="0.3" />
                  <path d="M72,38 L84,36 L86,42 L84,48 L76,50 L70,46 L70,40 Z" fill="rgba(255,107,43,0.1)" stroke="rgba(255,107,43,0.2)" strokeWidth="0.3" />

                  {/* Real hotspots */}
                  {HOTSPOTS.map((h, i) => (
                    <g key={i} onClick={() => setActiveHotspot(activeHotspot === i ? null : i)} style={{ cursor: "pointer" }}>
                      <circle cx={h.x} cy={h.y} r="3" fill="none" stroke={threatColor(h.threat)} strokeWidth="0.4" opacity="0.4">
                        <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={h.x} cy={h.y} r="1.5" fill={threatColor(h.threat)} opacity="0.9" />
                      {activeHotspot === i && (
                        <foreignObject x={h.x > 70 ? h.x - 28 : h.x + 2} y={h.y > 45 ? h.y - 18 : h.y + 3} width="26" height="14">
                          <div style={{ background: "rgba(22,11,2,0.95)", border: `1px solid ${threatColor(h.threat)}`, borderRadius: "4px", padding: "4px 6px", fontSize: "5px", color: "#fff", fontFamily: "monospace", lineHeight: 1.5, whiteSpace: "nowrap" }}>
                            <div style={{ color: threatColor(h.threat), fontWeight: "bold" }}>{h.threat}</div>
                            <div>{h.platform}</div>
                            <div style={{ color: "rgba(255,255,255,0.5)" }}>{h.confidence}% match</div>
                          </div>
                        </foreignObject>
                      )}
                    </g>
                  ))}
                </svg>

                <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem" }}>
                  {[["HIGH", "#E74C3C"], ["MEDIUM", "#F39C12"], ["LOW", "#2E86DE"]].map(([label, color]) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Platform Breakdown */}
            {view === "platform" && (
              <div style={{ background: "rgba(16,8,2,0.9)", border: "1px solid rgba(255,107,43,0.15)", borderRadius: "16px", padding: "1.5rem", minHeight: "380px" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5rem" }}>detections by platform</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                  {platformData.map(({ name, count, color }) => (
                    <div key={name}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>{platformIcon(name)} {name}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "#FF6B2B" }}>{count}</span>
                      </div>
                      <div style={{ height: "6px", background: "rgba(255,107,43,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                        <div className="bar-fill" style={{ height: "100%", width: `${(count / maxCount) * 100}%`, background: `linear-gradient(90deg, #FF6B2B, ${color})`, borderRadius: "3px" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {view === "timeline" && (
              <div style={{ background: "rgba(16,8,2,0.9)", border: "1px solid rgba(255,107,43,0.15)", borderRadius: "16px", padding: "1.5rem", minHeight: "380px" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5rem" }}>detection timeline (24h)</p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem", height: "200px", padding: "0 0.5rem" }}>
                  {[3,5,2,8,12,7,4,9,15,11,6,3,2,7,9,14,10,8,5,11,13,7,4,6].map((h, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
                      <div style={{ width: "100%", height: `${(h / 15) * 180}px`, background: i >= 20 ? "#FF6B2B" : `rgba(255,107,43,${0.1 + i * 0.07})`, borderRadius: "3px 3px 0 0", transition: "height 0.5s ease", minHeight: "4px" }} />
                      {i % 6 === 0 && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.45rem", color: "rgba(255,255,255,0.2)" }}>{i}h</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detection table */}
            <div style={{ background: "rgba(16,8,2,0.9)", border: "1px solid rgba(255,107,43,0.15)", borderRadius: "16px", padding: "1.25rem 1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", textTransform: "uppercase" }}>recent detections</p>
                <Link href="/detections" style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "#FF6B2B", textDecoration: "none", letterSpacing: "0.1em" }}>View All →</Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px 80px", gap: "1rem", padding: "0.5rem 0.75rem", marginBottom: "0.25rem" }}>
                  {["Content", "Platform", "Account", "Match", "Threat"].map(h => (
                    <span key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.52rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", textTransform: "uppercase" }}>{h}</span>
                  ))}
                </div>
                {detections.slice(0, 6).map((d, i) => (
                  <Link key={d.id} href={`/detections/${d.id}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px 80px", gap: "1rem", padding: "0.75rem", borderRadius: "8px", textDecoration: "none", background: i % 2 === 0 ? "rgba(255,107,43,0.02)" : "transparent", border: "1px solid transparent", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,107,43,0.06)"; e.currentTarget.style.borderColor = "rgba(255,107,43,0.15)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,107,43,0.02)" : "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
                    <span style={{ fontSize: "0.78rem", color: "#fff", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "rgba(255,255,255,0.4)" }}>{platformIcon(d.platform)} {d.platform}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.account || "Unknown"}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "#FF6B2B" }}>{d.confidence}%</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: threatColor(d.threat), background: `${threatColor(d.threat)}15`, padding: "0.2rem 0.5rem", borderRadius: "4px", textAlign: "center", border: `1px solid ${threatColor(d.threat)}30` }}>{d.threat}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Live Feed */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Piracy velocity */}
            <div style={{ background: "rgba(16,8,2,0.9)", border: "1px solid rgba(255,107,43,0.2)", borderRadius: "12px", padding: "1.25rem" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Piracy Velocity</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.3rem", height: "48px" }}>
                {[2, 4, 3, 6, 5, 8, 7, 9, 8, 11, 10, 12].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${(h / 12) * 48}px`, background: i === 11 ? "#FF6B2B" : `rgba(255,107,43,${0.1 + i * 0.07})`, borderRadius: "2px 2px 0 0", minHeight: "3px" }} />
                ))}
              </div>
              <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", color: "#FF6B2B", marginTop: "0.5rem", lineHeight: 1 }}>↑ ACCELERATING</p>
            </div>

            {/* Live feed */}
            <div style={{ background: "rgba(16,8,2,0.9)", border: "1px solid rgba(255,107,43,0.15)", borderRadius: "12px", padding: "1.25rem", flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Live Detections</p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#39FF14", boxShadow: "0 0 6px #39FF14", animation: "hotpulse 1.5s infinite" }} />
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.52rem", color: "#39FF14" }}>LIVE</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "420px", overflowY: "auto" }}>
                {liveFeed.map((item, i) => (
                  <div key={`${item.id}-${i}`} className={i === 0 ? "feed-item" : ""} style={{ display: "flex", flexDirection: "column", gap: "0.3rem", padding: "0.75rem", borderRadius: "8px", background: i === 0 ? "rgba(255,107,43,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${i === 0 ? "rgba(255,107,43,0.2)" : "rgba(255,255,255,0.04)"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>{platformIcon(item.platform)} {item.platform}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.52rem", color: "rgba(255,255,255,0.2)" }}>{item.time}</span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 500, lineHeight: 1.3 }}>{item.title}</span>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "#FF6B2B" }}>{item.confidence}% match</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.52rem", color: threatColor(item.threat), background: `${threatColor(item.threat)}15`, padding: "0.15rem 0.4rem", borderRadius: "3px" }}>{item.threat}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <Link href="/detections" style={{ display: "block", textAlign: "center", padding: "0.8rem", background: "#FF6B2B", color: "#fff", borderRadius: "8px", fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#e55a1f"}
                onMouseLeave={e => e.currentTarget.style.background = "#FF6B2B"}>
                View Evidence Locker →
              </Link>
              <Link href="/strike" style={{ display: "block", textAlign: "center", padding: "0.8rem", background: "transparent", color: "#FF6B2B", border: "1px solid rgba(255,107,43,0.3)", borderRadius: "8px", fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(208, 106, 62, 0.08)"; e.currentTarget.style.borderColor = "#FF6B2B"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,107,43,0.3)"; }}>
                Strike Command →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}