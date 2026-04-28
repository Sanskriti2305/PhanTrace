"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { getAllDetections } from "@/lib/api";

type Detection = {
  id: string;
  title: string;
  platform: string;
  account?: string;
  confidence: number;
  threat: string;
  time: string;
  region?: string;
  status: "active" | "removed" | "appealed";
  contentID: string;
  uploadDate: string;
};

const threatColor = (t: string): string =>
  t === "HIGH" ? "#E74C3C" : t === "MEDIUM" ? "#F39C12" : "#2E86DE";

const statusColor = (s: string): string =>
  s === "active" ? "#39FF14" : s === "removed" ? "#2E86DE" : "#F39C12";

const statusLabel = (s: string): string =>
  s === "active" ? "Monitoring" : s === "removed" ? "Removed" : "Appealed";

const platformIcon = (p: string): string => ({
  YouTube: "▶",
  youtube: "▶",
  Instagram: "◉",
  instagram: "◉",
  Reddit: "●",
  reddit: "●",
  Twitter: "✦",
  twitter: "✦",
  TikTok: "♪",
  tiktok: "♪",
  Facebook: "f",
  facebook: "f",
  Telegram: "✈",
  telegram: "✈",
  Other: "◈",
} as Record<string, string>)[p] ?? "◈";

export default function DetectionsPage() {
  const [sortBy, setSortBy] = useState<"recent" | "threat" | "confidence">("recent");
  const [filterThreat, setFilterThreat] = useState<"all" | "HIGH" | "MEDIUM" | "LOW">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "removed" | "appealed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch detections on mount
  useEffect(() => {
    const fetchDetections = async () => {
      try {
        setLoading(true);
        const response = await getAllDetections();
        
        if (response.status === "error") {
          setError(response.error || "Failed to fetch detections");
          setDetections([]);
        } else {
          // Map backend response to frontend format
          const mapped = (response.detections || []).map((d: any) => ({
            id: d.id || "",
            title: d.title || "Unknown",
            platform: d.platform || "Unknown",
            account: d.account || d.source || "Unknown",
            confidence: d.confidence || 0,
            threat: (d.threat || "MEDIUM").toUpperCase(),
            time: d.time || "Unknown",
            region: d.region || "Unknown",
            status: d.status || "active",
            contentID: d.id || "",
            uploadDate: d.uploadDate || new Date().toISOString(),
          }));
          setDetections(mapped);
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch detections");
        setDetections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDetections();
  }, []);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = detections.filter(d => {
      const matchesSearch = 
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (d.account || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesThreat = filterThreat === "all" || d.threat === filterThreat;
      const matchesStatus = filterStatus === "all" || d.status === filterStatus;
      return matchesSearch && matchesThreat && matchesStatus;
    });

    if (sortBy === "threat") {
      const threatOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      result.sort((a, b) => threatOrder[a.threat as keyof typeof threatOrder] - threatOrder[b.threat as keyof typeof threatOrder]);
    } else if (sortBy === "confidence") {
      result.sort((a, b) => b.confidence - a.confidence);
    } else {
      result.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    }

    return result;
  }, [sortBy, filterThreat, filterStatus, searchQuery, detections]);

  return (
    <main style={{ minHeight: "100vh", background: "#0d0500", fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.85)", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        .detection-row { transition: all 0.2s; cursor: pointer; }
        .detection-row:hover { background: rgba(255,107,43,0.08) !important; border-color: rgba(255,107,43,0.2) !important; }

        .filter-btn { transition: all 0.2s; }
        .filter-btn.active { color: #FF6B2B !important; border-color: #FF6B2B !important; background: rgba(255,107,43,0.1) !important; }

        input::placeholder { color: rgba(255,255,255,0.15); }
        input:focus { outline: none; border-color: #FF6B2B !important; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,107,43,0.2); border-radius: 2px; }
      `}</style>

      {/* BG image slot */}
      <img src="/el.jpg" alt="" className="absolute inset-0 w-full h-full object-cover scale-105" style={{ zIndex: 0 }} />

      {/* Grid overlay */}
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
            <Link key={label} href={href} style={{ color: label === "Detections" ? "#FF6B2B" : "rgba(255,255,255,0.35)", textDecoration: "none", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {label}
            </Link>
          ))}
          <button style={{ background: "transparent", border: "1px solid rgba(255,107,43,0.2)", color: "rgba(255,255,255,0.4)", padding: "0.45rem 1.2rem", borderRadius: "999px", fontSize: "0.72rem", cursor: "pointer", letterSpacing: "0.08em", fontFamily: "'DM Sans', sans-serif" }}>
            Sign In
          </button>
        </div>
      </nav>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, padding: "2rem 3rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "#6d4635", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.3rem", fontWeight: "800" }}>forensic intelligence</p>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", color: "#fff", lineHeight: 1, letterSpacing: "0.02em" }}>
              EVIDENCE <span style={{ color: "#FF6B2B" }}>LOCKER</span>
            </h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1rem", color: "#170e0a", letterSpacing: "0.1em", marginBottom: "0.25rem", fontWeight: "900" }}>Total Cases</p>
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", color: "#FF6B2B", lineHeight: 1 }}>{filtered.length}</p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{ background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: "8px", padding: "1rem", color: "#E74C3C", fontFamily: "'DM Mono', monospace", fontSize: "0.85rem" }}>
            ⚠️ {error}
            <button onClick={() => window.location.reload()} style={{ marginLeft: "1rem", background: "#E74C3C", color: "#fff", border: "none", padding: "0.4rem 0.8rem", borderRadius: "4px", cursor: "pointer" }}>
              Retry
            </button>
          </div>
        )}

        {/* Search & Filters */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem", background: "rgba(16,8,2,0.9)", border: "1px solid rgba(255,107,43,0.15)", borderRadius: "12px" }}>
          
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search by content title, account, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(22,11,2,0.8)",
                border: "1px solid rgba(255,107,43,0.15)",
                borderRadius: "8px",
                padding: "0.8rem 1rem",
                color: "#fff",
                fontSize: "0.85rem",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>

          {/* Filter Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            
            {/* Sort */}
            <div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Sort By</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {["recent", "threat", "confidence"].map(v => (
                  <button
                    key={v}
                    className={`filter-btn ${sortBy === v ? "active" : ""}`}
                    onClick={() => setSortBy(v as typeof sortBy)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${sortBy === v ? "#FF6B2B" : "rgba(255,107,43,0.15)"}`,
                      color: sortBy === v ? "#FF6B2B" : "rgba(255,255,255,0.4)",
                      padding: "0.4rem 0.8rem",
                      borderRadius: "6px",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "0.7rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    {v === "recent" ? "Recent" : v === "threat" ? "Threat" : "Confidence"}
                  </button>
                ))}
              </div>
            </div>

            {/* Threat Filter */}
            <div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Threat Level</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {["all", "HIGH", "MEDIUM", "LOW"].map(v => (
                  <button
                    key={v}
                    className={`filter-btn ${filterThreat === v ? "active" : ""}`}
                    onClick={() => setFilterThreat(v as typeof filterThreat)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${filterThreat === v ? "#FF6B2B" : "rgba(255,107,43,0.15)"}`,
                      color: filterThreat === v ? "#FF6B2B" : "rgba(255,255,255,0.4)",
                      padding: "0.4rem 0.8rem",
                      borderRadius: "6px",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "0.8rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    {v === "all" ? "All" : v}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Status</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {["all", "active", "removed", "appealed"].map(v => (
                  <button
                    key={v}
                    className={`filter-btn ${filterStatus === v ? "active" : ""}`}
                    onClick={() => setFilterStatus(v as typeof filterStatus)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${filterStatus === v ? "#FF6B2B" : "rgba(255,107,43,0.15)"}`,
                      color: filterStatus === v ? "#FF6B2B" : "rgba(255,255,255,0.4)",
                      padding: "0.4rem 0.8rem",
                      borderRadius: "6px",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "0.7rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    {v === "all" ? "All" : statusLabel(v)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>
            ⏳ Loading detections...
          </div>
        )}

        {/* Detections Table */}
        {!loading && (
          <div style={{ background: "rgba(16,8,2,0.9)", border: "1px solid rgba(255,107,43,0.15)", borderRadius: "12px", overflow: "hidden" }}>
            
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.9fr 0.9fr 0.9fr 0.8fr", gap: "0.75rem", padding: "1rem 1.5rem", background: "rgba(22,11,2,0.8)", borderBottom: "1px solid rgba(255,107,43,0.15)" }}>
              {["Content", "Platform", "Account", "Confidence", "Threat", "Status", "Action"].map(h => (
                <span key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            <div style={{ maxHeight: "600px", overflowY: "auto" }}>
              {filtered.length > 0 ? (
                filtered.map((detection, i) => (
                  <div
                    key={detection.id}
                    className="detection-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 0.9fr 0.9fr 0.9fr 0.8fr",
                      gap: "0.75rem",
                      padding: "1rem 1.5rem",
                      borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,107,43,0.08)" : "none",
                      background: i % 2 === 0 ? "rgba(255,107,43,0.02)" : "transparent",
                      alignItems: "center",
                    }}
                  >
                    {/* Content Title */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 }}>
                      <span style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {detection.title}
                      </span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "rgba(255,255,255,0.25)" }}>
                        {detection.contentID}
                      </span>
                    </div>

                    {/* Platform */}
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
                      {platformIcon(detection.platform)} {detection.platform}
                    </span>

                    {/* Account */}
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {detection.account || "—"}
                    </span>

                    {/* Confidence */}
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "#FF6B2B", textAlign: "center", whiteSpace: "nowrap" }}>
                      {detection.confidence}%
                    </span>

                    {/* Threat */}
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.7rem",
                        color: threatColor(detection.threat),
                        background: `${threatColor(detection.threat)}15`,
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        textAlign: "center",
                        border: `1px solid ${threatColor(detection.threat)}30`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {detection.threat}
                    </span>

                    {/* Status */}
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.7rem",
                        color: statusColor(detection.status),
                        background: `${statusColor(detection.status)}15`,
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        textAlign: "center",
                        border: `1px solid ${statusColor(detection.status)}30`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {statusLabel(detection.status)}
                    </span>

                    {/* Action */}
                    <Link
                      href={`/detections/${detection.id}`}
                      style={{
                        display: "block",
                        textAlign: "center",
                        padding: "0.35rem 0.65rem",
                        background: "rgba(255,107,43,0.1)",
                        color: "#FF6B2B",
                        border: "1px solid rgba(255,107,43,0.3)",
                        borderRadius: "6px",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "0.7rem",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        textDecoration: "none",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#FF6B2B";
                        e.currentTarget.style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,107,43,0.1)";
                        e.currentTarget.style.color = "#FF6B2B";
                      }}
                    >
                      View
                    </Link>
                  </div>
                ))
              ) : (
                <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem" }}>No detections match your filters</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", background: "rgba(22,11,2,0.5)", borderRadius: "8px", border: "1px solid rgba(255,107,43,0.1)" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: "rgba(255,255,255,0.3)" }}>
            Showing <span style={{ color: "#FF6B2B" }}>{filtered.length}</span> of <span style={{ color: "#FF6B2B" }}>{detections.length}</span> cases
          </p>
          <div style={{ display: "flex", gap: "1rem" }}>
            <Link href="/dashboard" style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: "#FF6B2B", textDecoration: "none" }}>← Back to Dashboard</Link>
            <Link href="/strike" style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: "#FF6B2B", textDecoration: "none" }}>File Strike →</Link>
          </div>
        </div>

      </div>
    </main>
  );
}
