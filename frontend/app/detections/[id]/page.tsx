"use client";
import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import { createStrike } from "@/lib/api";
import { useRouter } from "next/navigation";

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
  url?: string;
  detectionSource?: string;
};

const threatColor = (t: string): string =>
  t === "HIGH" ? "#E74C3C" : t === "MEDIUM" ? "#F39C12" : "#2E86DE";

const statusColor = (s: string): string =>
  s === "active" ? "#39FF14" : s === "removed" ? "#2E86DE" : "#F39C12";

const statusLabel = (s: string): string =>
  s === "active" ? "Monitoring" : s === "removed" ? "Removed" : "Appealed";

const platformIcon = (p: string): string =>
  ({
    youtube: "▶",
    instagram: "◉",
    reddit: "●",
    twitter: "✦",
    tiktok: "♪",
    facebook: "f",
    telegram: "✈",
    web: "◈",
  } as Record<string, string>)[p?.toLowerCase()] ?? "◈";

function formatTitle(title: string) {
  if (!title) return "Unknown Content";
  if (title.length > 40) return title.substring(0, 40) + "...";
  return title;
}

export default function DetectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "chain" | "confidence" | "profile">("overview");
  const [showStrikeModal, setShowStrikeModal] = useState(false);
  const router = useRouter();

  async function handleFileStrike() {
    if (!detection) return;
    try {
      const res = await createStrike({
        detection_id: detection.id,
        title: detection.title || "Infringing Content",
        account: detection.account || "Unknown",
        platform: detection.platform,
        jurisdiction: "IN",
      });
      if (res.status === "success") {
        setShowStrikeModal(true);
      } else {
        alert(res.error || "❌ Failed to create strike");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating strike");
    }
  }

  useEffect(() => {
    const fetchDetection = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/detections/detail/${id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: Detection not found`);
        const data = await res.json();
        if (data.status === "success" && data.detection) {
          setDetection(data.detection);
        } else {
          throw new Error(data.error || "Failed to load detection");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setDetection(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetection();
  }, [id]);

  function cleanText(text: string) {
    if (!text) return "Unknown";
    return text.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim();
  }

  // ── PDF — matches Strike page dark style exactly ─────────────────────────
  const downloadForensicReport = () => {
    if (!detection) return;
    const pdf = new jsPDF("p", "mm", "a4");

    // ── Dark background ──────────────────────────────────────────────────
    pdf.setFillColor(13, 5, 0);
    pdf.rect(0, 0, 210, 297, "F");

    // ── Left red bar + top line (matches strike page) ────────────────────
    pdf.setFillColor(231, 76, 60);
    pdf.rect(0, 0, 4, 297, "F");
    pdf.rect(4, 0, 206, 2, "F");

    // ── Branding top-right ───────────────────────────────────────────────
    pdf.setFontSize(9);
    pdf.setTextColor(231, 76, 60);
    pdf.text("PHANTRACE FORENSICS", 195, 15, { align: "right" });

    // ── Title ────────────────────────────────────────────────────────────
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(255, 255, 255);
    pdf.text("FORENSIC REPORT", 15, 28);

    // ── Badge ────────────────────────────────────────────────────────────
    pdf.setDrawColor(231, 76, 60);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(15, 33, 70, 6, 2, 2, "D");
    pdf.setFontSize(8);
    pdf.setTextColor(231, 76, 60);
    pdf.text("EVIDENCE LOCKER", 50, 37.5, { align: "center" });

    // ── Divider ──────────────────────────────────────────────────────────
    pdf.setDrawColor(231, 76, 60);
    pdf.setLineWidth(0.4);
    pdf.line(15, 45, 195, 45);

    // ── Subtitle (detection ID) ───────────────────────────────────────────
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(200, 200, 200);
    pdf.text(`Detection ID: ${detection.id}`, 15, 55);

    // ── Case fields ───────────────────────────────────────────────────────
    let y = 70;
    const caseDetails: [string, string][] = [
      ["CONTENT TITLE",     cleanText(detection.title)],
      ["PLATFORM DETECTED", detection.platform],
      ["INFRINGING ACCOUNT",detection.account || "Unknown"],
      ["THREAT LEVEL",      detection.threat],
      ["CONFIDENCE SCORE",  `${detection.confidence}%`],
      ["DETECTED AT",       detection.time],
      ["REGION",            detection.region || "Unknown"],
      ["STATUS",            statusLabel(detection.status)],
      ["DETECTION SOURCE",  detection.detectionSource || "Automated Scan"],
    ];

    caseDetails.forEach(([label, value]) => {
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(120, 120, 120);
      pdf.text(label, 15, y);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      const cleaned    = cleanText(value);
      const wrapped    = pdf.splitTextToSize(cleaned, 90);
      pdf.text(wrapped, 100, y);

      y += Math.max(wrapped.length * 6, 8);
      if (y > 260) { pdf.addPage(); y = 20; }
    });

    // ── Divider before body ───────────────────────────────────────────────
    y += 4;
    pdf.setDrawColor(231, 76, 60);
    pdf.setLineWidth(0.4);
    pdf.line(15, y, 195, y);
    y += 8;

    // ── Forensic summary body ─────────────────────────────────────────────
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(200, 200, 200);

    const bodyText = `This forensic report documents an instance of suspected copyright infringement detected by the PhanTrace AI-powered monitoring system.

Content fingerprinting was performed using perceptual hash (pHash) analysis across visual, audio, and metadata layers. The infringing content was matched against registered assets in the PhanTrace content registry with a confidence score of ${detection.confidence}%.

Platform: The infringing content was detected on ${detection.platform}. The rights holder is advised to pursue a takedown notice under the applicable jurisdiction.

Detection Method: ${detection.detectionSource || "Automated multi-platform scan"}. The match was identified through hash comparison and cross-platform monitoring pipelines.

This document serves as evidence for legal enforcement proceedings and may be submitted alongside a formal DMCA, DSA, or IT Act takedown notice.`;

    const splitBody = pdf.splitTextToSize(bodyText, 170);
    pdf.text(splitBody, 15, y);

    // ── Footer ────────────────────────────────────────────────────────────
    pdf.setDrawColor(231, 76, 60);
    pdf.setLineWidth(0.4);
    pdf.line(15, 260, 195, 260);

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text("Generated by PhanTrace — Hunt. Detect. Protect.", 15, 270);
    pdf.setTextColor(231, 76, 60);
    pdf.text(new Date().toLocaleDateString(), 195, 270, { align: "right" });

    pdf.save(`forensic-${detection.id}.pdf`);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#0d0500", fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.85)", position: "relative", overflow: "hidden" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`}</style>
        <img src="/el.jpg" alt="" className="absolute inset-0 w-full h-full object-cover scale-105" style={{ zIndex: 0 }} />
        <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,107,43,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,43,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", zIndex: 0, pointerEvents: "none" }} />
        <nav style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.4rem 3rem", borderBottom: "1px solid rgba(255,107,43,0.15)", background: "rgba(13,5,0,0.8)", backdropFilter: "blur(12px)" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img src="/logo.png" alt="" style={{ height: "28px", width: "28px" }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.5rem", fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>Phan<span style={{ color: "#FF6B2B" }}>Trace</span></span>
          </Link>
        </nav>
        <div style={{ position: "relative", zIndex: 1, padding: "2rem 3rem", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 80px)" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9rem", color: "#FF6B2B", letterSpacing: "0.15em", textTransform: "uppercase" }}>LOADING DETECTION DATA...</p>
        </div>
      </main>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error || !detection) {
    return (
      <main style={{ minHeight: "100vh", background: "#0d0500", fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.85)", position: "relative", overflow: "hidden" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`}</style>
        <img src="/el.jpg" alt="" className="absolute inset-0 w-full h-full object-cover scale-105" style={{ zIndex: 0 }} />
        <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,107,43,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,43,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", zIndex: 0, pointerEvents: "none" }} />
        <nav style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.4rem 3rem", borderBottom: "1px solid rgba(255,107,43,0.15)", background: "rgba(13,5,0,0.8)", backdropFilter: "blur(12px)" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img src="/logo.png" alt="" style={{ height: "28px", width: "28px" }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.5rem", fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>Phan<span style={{ color: "#FF6B2B" }}>Trace</span></span>
          </Link>
        </nav>
        <div style={{ position: "relative", zIndex: 1, padding: "2rem 3rem" }}>
          <div style={{ background: "rgba(231,76,60,0.15)", border: "1px solid #E74C3C", borderRadius: "8px", padding: "1.5rem", marginBottom: "2rem" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.85rem", color: "#E74C3C", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>ERROR</p>
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>{error || "Detection not found"}</p>
            <Link href="/detections" style={{ marginTop: "1rem", display: "inline-block", color: "#FF6B2B", textDecoration: "none", fontSize: "0.8rem", fontFamily: "'DM Mono', monospace" }}>← Back to Detections</Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: "100vh", background: "#0d0500", fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.85)", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        .tab-btn { transition: all 0.2s; }
        .tab-btn.active { color: #FF6B2B !important; border-bottom-color: #FF6B2B !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,107,43,0.2); border-radius: 2px; }
      `}</style>

      <img src="/el.jpg" alt="" className="absolute inset-0 w-full h-full object-cover scale-105" style={{ zIndex: 0 }} />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,107,43,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,43,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", zIndex: 0, pointerEvents: "none" }} />

      {/* Navbar */}
      <nav style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.4rem 3rem", borderBottom: "1px solid rgba(255,107,43,0.15)", background: "rgba(13,5,0,0.8)", backdropFilter: "blur(12px)" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src="/logo.png" alt="" style={{ height: "28px", width: "28px" }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.5rem", fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>Phan<span style={{ color: "#FF6B2B" }}>Trace</span></span>
        </Link>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {[["Home", "/"], ["Upload", "/upload"], ["Dashboard", "/dashboard"], ["Detections", "/detections"], ["Strike", "/strike"]].map(([label, href]) => (
            <Link key={label} href={href} style={{ color: label === "Detections" ? "#FF6B2B" : "rgba(255,255,255,0.35)", textDecoration: "none", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</Link>
          ))}
          <button style={{ background: "transparent", border: "1px solid rgba(255,107,43,0.2)", color: "rgba(255,255,255,0.4)", padding: "0.45rem 1.2rem", borderRadius: "999px", fontSize: "0.72rem", cursor: "pointer", letterSpacing: "0.08em", fontFamily: "'DM Sans', sans-serif" }}>Sign In</button>
        </div>
      </nav>

      <div style={{ position: "relative", zIndex: 1, padding: "2rem 3rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "#6d4635", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.3rem", fontWeight: "800" }}>forensic intelligence</p>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", color: "#fff", lineHeight: 1, letterSpacing: "0.02em" }}>
              DETECTION <span style={{ color: "#FF6B2B" }}>DETAILS</span>
            </h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "1rem", color: "#27150e", letterSpacing: "0.1em", marginBottom: "0.8rem", fontWeight: "900" }}>Detection ID</p>
            <div style={{ background: "rgba(16,8,2,0.9)", border: "1px solid rgba(255,107,43,0.15)", borderRadius: "8px", padding: "0.75rem 1rem" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "#FF6B2B", lineHeight: 1, wordBreak: "break-all" }}>{detection.id}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {[
            { label: "PLATFORM",     value: detection.platform },
            { label: "THREAT LEVEL", value: detection.threat,            color: threatColor(detection.threat) },
            { label: "CONFIDENCE",   value: `${detection.confidence}%`,  color: "#FF6B2B" },
            { label: "STATUS",       value: statusLabel(detection.status), color: statusColor(detection.status) },
          ].map((stat, i) => (
            <div key={i} style={{ background: "rgba(16,8,2,0.9)", border: "1px solid rgba(255,107,43,0.15)", borderRadius: "8px", padding: "1rem", textAlign: "center" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>{stat.label}</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "1rem", color: stat.color || "#fff", fontWeight: 600 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ background: "rgba(16,8,2,0.9)", border: "1px solid rgba(255,107,43,0.15)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ display: "flex", gap: "2rem", padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,107,43,0.15)", background: "rgba(22,11,2,0.8)" }}>
            {["overview", "chain", "confidence", "profile"].map((tab) => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                style={{ background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === tab ? "#FF6B2B" : "transparent"}`, color: activeTab === tab ? "#FF6B2B" : "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", padding: "0", paddingBottom: "0.5rem" }}
              >
                {tab === "overview" && "Overview"}
                {tab === "chain" && "Chain of Custody"}
                {tab === "confidence" && "Confidence"}
                {tab === "profile" && "Account Profile"}
              </button>
            ))}
          </div>

          <div style={{ padding: "1.5rem" }}>
            {activeTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {[
                    { label: "CONTENT TITLE", value: detection.title },
                    { label: "PLATFORM",       value: detection.platform },
                    { label: "ACCOUNT",        value: detection.account || "Unknown" },
                    { label: "SOURCE",         value: detection.detectionSource || "Unknown" },
                    { label: "DETECTED AT",    value: detection.time },
                    { label: "REGION",         value: detection.region || "Unknown" },
                  ].map((item, i) => (
                    <div key={i}>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>{item.label}</p>
                      <p style={{ fontSize: "0.9rem", color: "#fff" }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "chain" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.5rem" }}>Detection verified through:</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {["Initial upload and fingerprinting", `Platform scanning (${detection.platform})`, "Hash comparison analysis", "Detection logged and stored"].map((step) => (
                    <li key={step} style={{ padding: "0.75rem", background: "rgba(255,107,43,0.05)", borderLeft: "2px solid #FF6B2B", marginBottom: "0.5rem", fontFamily: "'DM Mono', monospace", fontSize: "0.85rem", color: "#fff" }}>✓ {step}</li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === "confidence" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: "8px", background: "rgba(255,107,43,0.1)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${detection.confidence}%`, background: "#FF6B2B", borderRadius: "4px" }} />
                    </div>
                  </div>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.2rem", color: "#FF6B2B", fontWeight: "bold", minWidth: "60px" }}>{detection.confidence}%</p>
                </div>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginTop: "0.5rem" }}>
                  {detection.confidence >= 90 ? "Very High Confidence - Definite match" : detection.confidence >= 80 ? "High Confidence - Strong match" : detection.confidence >= 70 ? "Medium Confidence - Likely match" : "Low Confidence - Possible match"}
                </p>
              </div>
            )}

            {activeTab === "profile" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  { label: "ACCOUNT",  value: detection.account || "Unknown" },
                  { label: "PLATFORM", value: `${platformIcon(detection.platform)} ${detection.platform}` },
                  { label: "REGION",   value: detection.region || "Unknown" },
                ].map((item) => (
                  <div key={item.label}>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>{item.label}</p>
                    <p style={{ fontSize: "0.9rem", color: "#fff" }}>{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "space-between" }}>
          <Link href="/detections" style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: "#FF6B2B", textDecoration: "none", padding: "0.6rem 1.2rem", background: "rgba(255,107,43,0.1)", border: "1px solid rgba(255,107,43,0.3)", borderRadius: "6px", cursor: "pointer" }}>
            ← Back to Detections
          </Link>
          <button
            onClick={downloadForensicReport}
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: "#fff", padding: "0.6rem 1.2rem", background: "#FF6B2B", border: "none", borderRadius: "6px", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Download Report PDF
          </button>
          <button
            onClick={handleFileStrike}
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: "#fff", padding: "0.6rem 1.2rem", background: "#E74C3C", border: "none", borderRadius: "6px", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            File Strike
          </button>
        </div>
      </div>

      {/* Strike Modal */}
      {showStrikeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "rgba(16,8,2,0.95)", border: "1px solid rgba(255,107,43,0.3)", borderRadius: "12px", padding: "2rem", width: "320px", textAlign: "center", boxShadow: "0 0 40px rgba(255,107,43,0.2)" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "#FF6B2B", letterSpacing: "0.2em", marginBottom: "0.5rem", textTransform: "uppercase" }}>Strike Logged</p>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "#fff", marginBottom: "1rem" }}>Strike Created</h2>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginBottom: "1.5rem" }}>The infringement has been registered and is ready for enforcement.</p>
            <button
              onClick={() => router.push("/strike")}
              style={{ width: "100%", padding: "0.7rem", background: "#FF6B2B", border: "none", borderRadius: "6px", color: "#fff", fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", letterSpacing: "0.1em", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Command Strike →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}