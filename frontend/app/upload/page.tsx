"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import { uploadContent, generateFingerprint, type HashMatch } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────
type FormFields = { team: string; sport: string; event: string; owner: string };
type FormErrors = { [key: string]: string | null };
type Stage = "idle" | "processing" | "done" | "error";
type Passport = {
  id: string;
  hash: string;
  time: string;
  owner: string;
  event: string;
  team: string;
  sport: string;
  filename: string;
  fileSize: string;
  hashMatches: HashMatch[];
  matchCount: number;
};

// ── Helpers ──────────────────────────────────────────────────
const STEP_LABELS = [
  "Extracting keyframes",
  "Generating visual hash",
  "Processing audio layer",
  "Sealing Content Passport",
];

const STEP_DELAYS = [0, 2200, 4200, 6000];
const STEP_DURATIONS = [2000, 1800, 1600, 1400];

// ── Component ────────────────────────────────────────────────
export default function UploadPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [steps, setSteps] = useState<number[]>([0, 0, 0, 0]);
  const [passport, setPassport] = useState<Passport | null>(null);
  const [form, setForm] = useState<FormFields>({ team: "", sport: "", event: "", owner: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const passportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File select ──────────────────────────────────────────
  function handleFileSelect(file: File | null | undefined) {
    if (!file) return;
    setSelectedFile(file);
    setFileError(false);
    setFileType(file.type);
    setUploadError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  // ── Form field update ────────────────────────────────────
  function updateField(key: keyof FormFields, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  }

  // ── Validate ─────────────────────────────────────────────
  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!selectedFile) { setFileError(true); return false; }
    if (!form.team.trim()) newErrors.team = "Required";
    if (!form.sport.trim()) newErrors.sport = "Required";
    if (!form.event.trim()) newErrors.event = "Required";
    if (!form.owner.trim()) newErrors.owner = "Required";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return false; }
    return true;
  }

  // ── Step animation ───────────────────────────────────────
  function runSteps(onDone: () => void) {
    setSteps([0, 0, 0, 0]);
    STEP_DELAYS.forEach((delay, i) => {
      setTimeout(() => setSteps(prev => { const n = [...prev]; n[i] = 1; return n; }), delay);
      setTimeout(() => setSteps(prev => { const n = [...prev]; n[i] = 2; return n; }), delay + STEP_DURATIONS[i] + 100);
    });
    setTimeout(onDone, 8000);
  }

  // ── Main submit ──────────────────────────────────────────
  const startFingerprint = async () => {
    if (!selectedFile || !form.team || !form.sport) {
      setUploadError("Please fill in all required fields");
      return;
    }

    setStage("processing");
    setUploadError(null);

    try {
      const uploadResponse = await uploadContent(selectedFile, form);

      console.log("Upload Response:", uploadResponse);
      console.log("Response Status:", uploadResponse.status);
      console.log("File ID:", uploadResponse.file_id);

      if (uploadResponse.status === "error") {
        setStage("error");
        setUploadError(uploadResponse.error ?? "Upload failed. Please try again.");
        return;
      }

      const fingerprintResponse = await generateFingerprint(uploadResponse.file_id ?? "");

      if (fingerprintResponse.status === "error") {
        setStage("error");
        setUploadError(fingerprintResponse.error ?? "Fingerprint generation failed.");
        return;
      }

      console.log("Fingerprint Response:", fingerprintResponse);

      runSteps(() => {
        const now = new Date();
        setPassport({
          id:          fingerprintResponse.fingerprint_id ?? `PHT-${Date.now()}`,
          hash:        fingerprintResponse.hash_signature ?? "unknown",
          time:        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) + " · " + now.toLocaleDateString(),
          owner:       uploadResponse.owner  || form.owner  || "Unspecified",
          event:       uploadResponse.event  || form.event  || "Untagged Event",
          team:        uploadResponse.team   || form.team,
          sport:       uploadResponse.sport  || form.sport,
          filename:    uploadResponse.filename ?? selectedFile.name,
          fileSize:    uploadResponse.file_size_mb ? `${uploadResponse.file_size_mb} MB` : `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
          // ── Phase 1: carry hash match results into passport ──
          hashMatches: fingerprintResponse.hash_matches ?? [],
          matchCount:  fingerprintResponse.match_count  ?? 0,
        });
        setStage("done");
      });
    } catch (error) {
      setStage("error");
      setUploadError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  };

  // ── PDF download ─────────────────────────────────────────
  async function downloadPassport() {
    if (!passport) return;
    const pdf = new jsPDF("p", "mm", "a4");

    pdf.setFillColor(13, 5, 0);
    pdf.rect(0, 0, 210, 297, "F");

    pdf.setFillColor(255, 107, 43);
    pdf.rect(0, 0, 4, 297, "F");
    pdf.rect(4, 0, 206, 1.5, "F");

    pdf.setFontSize(9);
    pdf.setTextColor(255, 107, 43);
    pdf.text("PHANTRACE", 195, 12, { align: "right" });

    if (fileType?.startsWith("image/") && previewUrl) {
      try {
        const img = new Image();
        img.src = previewUrl;
        await new Promise<void>(resolve => { img.onload = () => resolve(); });
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.8), "JPEG", 120, 15, 75, 50);
      } catch (e) { console.warn("Image embed failed", e); }
    }

    if (fileType?.startsWith("video/")) {
      pdf.setFillColor(30, 10, 0);
      pdf.rect(120, 15, 75, 50, "F");
      pdf.setDrawColor(255, 107, 43);
      pdf.setLineWidth(0.3);
      pdf.rect(120, 15, 75, 50);
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text("VIDEO ASSET", 157.5, 36, { align: "center" });
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      const n = passport.filename;
      pdf.text(n.length > 22 ? n.slice(0, 22) + "..." : n, 157.5, 44, { align: "center" });
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(28);
    pdf.setTextColor(255, 255, 255);
    pdf.text("CONTENT PASSPORT", 15, 28);
    pdf.setDrawColor(57, 255, 20);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(15, 32, 52, 7, 2, 2, "D");
    pdf.setFontSize(7);
    pdf.setTextColor(57, 255, 20);
    pdf.text("PROTECTED", 41, 36.5, { align: "center" });

    // Threat flag in PDF if matches found
    if (passport.matchCount > 0) {
      pdf.setDrawColor(231, 76, 60);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(72, 32, 60, 7, 2, 2, "D");
      pdf.setFontSize(7);
      pdf.setTextColor(231, 76, 60);
      pdf.text(`⚠ ${passport.matchCount} HASH MATCH${passport.matchCount > 1 ? "ES" : ""} FOUND`, 102, 36.5, { align: "center" });
    }

    pdf.setDrawColor(255, 107, 43);
    pdf.setLineWidth(0.4);
    pdf.line(15, 70, 195, 70);

    const fields: [string, string, string][] = [
      ["CONTENT ID",     passport.id,               "white"],
      ["STATUS",         passport.matchCount > 0 ? "⚠ Threat Detected" : "Monitoring Active", passport.matchCount > 0 ? "red" : "green"],
      ["HASH SIGNATURE", passport.hash,              "orange"],
      ["REGISTERED",     passport.time,              "white"],
      ["OWNER",          passport.owner,             "white"],
      ["EVENT",          passport.event,             "white"],
      ["TEAM",           passport.team  || "—",      "white"],
      ["SPORT",          passport.sport || "—",      "white"],
      ["FILE",           passport.filename,          "white"],
      ["SIZE",           passport.fileSize,          "white"],
    ];

    let y = 85;
    fields.forEach(([label, value, color], i) => {
      const x = i % 2 === 0 ? 15 : 110;
      if (i % 2 === 0 && i !== 0) y += 26;
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(120, 120, 120);
      pdf.text(label, x, y);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      if (color === "orange")     pdf.setTextColor(255, 107, 43);
      else if (color === "green") pdf.setTextColor(57, 255, 20);
      else if (color === "red")   pdf.setTextColor(231, 76, 60);
      else                        pdf.setTextColor(255, 255, 255);
      const truncated = value.length > 28 ? value.slice(0, 28) + "..." : value;
      pdf.text(truncated, x, y + 7);
    });

    y += 34;
    pdf.setDrawColor(255, 107, 43);
    pdf.setLineWidth(0.4);
    pdf.line(15, y, 195, y);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(80, 80, 80);
    pdf.text("Generated by PhanTrace — Hunt. Detect. Protect.", 15, y + 10);
    pdf.setTextColor(255, 107, 43);
    pdf.text("phantrace.ai", 195, y + 10, { align: "right" });

    pdf.save(`passport-${passport.id}.pdf`);
  }

  // ── Inline field list ────────────────────────────────────
  const formRows: [keyof FormFields, string, string][] = [
    ["team",  "Team",                 "e.g. Mumbai Indians"],
    ["sport", "Sport",                "e.g. Cricket"],
    ["event", "Event Name",           "e.g. IPL 2024 — MI vs CSK"],
    ["owner", "Rights Holder / Owner","e.g. Star Sports India"],
  ];

  // ── Render ───────────────────────────────────────────────
  return (
    <main
      className="min-h-screen"
      style={{ background: "#0d0500", fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.85)" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        .passport-anim { animation: fadeUp 0.5s ease forwards; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        input::placeholder { color: rgba(255,255,255,0.18); }
        input:focus { outline: none; border-color: #FF6B2B !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,107,43,0.15); border-radius: 2px; }
        .dl-btn:hover { background: #FF6B2B !important; color: #fff !important; }
        .dropzone:hover { border-color: #FF6B2B !important; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, backgroundImage: "url('/uploadBG.webp')", backgroundSize: "cover", opacity: 0.05, zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(255,107,43,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,43,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", zIndex: 0, pointerEvents: "none" }} />

      {/* Navbar */}
      <nav style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.4rem 3rem", borderBottom: "1px solid rgba(255,107,43,0.15)", background: "rgba(13,5,0,0.8)", backdropFilter: "blur(12px)" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src="/logo.png" alt="PhanTrace" style={{ height: "28px", width: "28px" }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.5rem", fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>
            Phan<span style={{ color: "#FF6B2B" }}>Trace</span>
          </span>
        </Link>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {([["Home", "/"], ["Upload", "/upload"], ["Dashboard", "/dashboard"], ["Detections", "/detections"], ["Strike", "/strike"]] as [string, string][]).map(([label, href]) => (
            <Link key={label} href={href} style={{ color: label === "Upload" ? "#FF6B2B" : "rgba(255,255,255,0.35)", textDecoration: "none", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {label}
            </Link>
          ))}
          <button style={{ background: "transparent", border: "1px solid rgba(255,107,43,0.2)", color: "rgba(255,255,255,0.4)", padding: "0.45rem 1.2rem", borderRadius: "999px", fontSize: "0.72rem", cursor: "pointer", letterSpacing: "0.08em" }}>
            Sign In
          </button>
        </div>
      </nav>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "calc(100vh - 73px)", position: "relative", zIndex: 1 }}>

        {/* ── LEFT: Form ── */}
        <div style={{ padding: "3.5rem 3rem", borderRight: "1px solid rgba(255,107,43,0.15)", display: "flex", flexDirection: "column", gap: "1.75rem" }}>

          <div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#FF6B2B", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.4rem" }}> step 01 — ingest</p>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.5rem", color: "#fff", lineHeight: 1, letterSpacing: "0.02em" }}>
              CONTENT <span style={{ color: "#FF6B2B" }}>DNA</span> STUDIO
            </h1>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.35)", fontWeight: 300, lineHeight: 1.7, marginTop: "0.5rem", maxWidth: "400px" }}>
              Upload your asset and we generate its unique fingerprint — visual, audio, and metadata layers combined.
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="video/*,audio/*,image/*"
            style={{ display: "none" }}
            onChange={e => handleFileSelect(e.target.files?.[0])}
          />

          {/* Dropzone */}
          <div
            className="dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFileSelect(e.dataTransfer.files?.[0]); }}
            style={{
              border: fileError ? "1px dashed #E74C3C" : selectedFile ? "1px dashed #39FF14" : "1px dashed rgba(255,107,43,0.3)",
              borderRadius: "12px", padding: "2.5rem 2rem",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
              cursor: "pointer", transition: "all 0.2s",
              background: fileError ? "rgba(231,76,60,0.05)" : selectedFile ? "rgba(57,255,20,0.04)" : "rgba(255,107,43,0.05)",
            }}
          >
            <div style={{ width: "44px", height: "44px", border: `1px solid ${fileError ? "rgba(231,76,60,0.4)" : selectedFile ? "rgba(57,255,20,0.4)" : "rgba(255,107,43,0.3)"}`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: fileError ? "#E74C3C" : selectedFile ? "#39FF14" : "#FF6B2B", fontSize: "1.3rem" }}>
              {selectedFile ? "✓" : "↑"}
            </div>
            {selectedFile ? (
              <>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#39FF14" }}>{selectedFile.name}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click to change
                </span>
              </>
            ) : (
              <>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>Drop your file here</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>MP4 · MOV · AVI · MP3 · JPG · PNG</span>
              </>
            )}
          </div>

          {fileError && (
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#E74C3C", letterSpacing: "0.1em", marginTop: "-1rem" }}>
              ✕ Please upload a file before generating a fingerprint
            </p>
          )}

          {/* Form fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {formRows.slice(0, 2).map(([key, label, ph]) => (
                <div key={key}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.4rem" }}>{label}</p>
                  <input
                    value={form[key]}
                    onChange={e => updateField(key, e.target.value)}
                    placeholder={ph}
                    style={{ width: "100%", background: "#160b02", border: `1px solid ${errors[key] ? "#E74C3C" : "rgba(255,107,43,0.15)"}`, borderRadius: "8px", padding: "0.72rem 1rem", color: "#fff", fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif" }}
                  />
                  {errors[key] && <p style={{ color: "#E74C3C", fontSize: "0.58rem", marginTop: "0.3rem" }}>✕ {errors[key]}</p>}
                </div>
              ))}
            </div>
            {formRows.slice(2).map(([key, label, ph]) => (
              <div key={key}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.4rem" }}>{label}</p>
                <input
                  value={form[key]}
                  onChange={e => updateField(key, e.target.value)}
                  placeholder={ph}
                  style={{ width: "100%", background: "#160b02", border: `1px solid ${errors[key] ? "#E74C3C" : "rgba(255,107,43,0.15)"}`, borderRadius: "8px", padding: "0.72rem 1rem", color: "#fff", fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif" }}
                />
                {errors[key] && <p style={{ color: "#E74C3C", fontSize: "0.58rem", marginTop: "0.3rem" }}>✕ {errors[key]}</p>}
              </div>
            ))}
          </div>

          {/* Upload error banner */}
          {uploadError && stage === "error" && (
            <div style={{ background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: "8px", padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: "#E74C3C", letterSpacing: "0.08em" }}>✕ {uploadError}</p>
              <button
                onClick={() => { setStage("idle"); setUploadError(null); }}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "#FF6B2B", background: "transparent", border: "none", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}>Retry →</button>
            </div>
          )}

          <button
            onClick={startFingerprint}
            disabled={stage === "processing"}
            style={{ width: "100%", background: stage === "processing" ? "rgba(255,107,43,0.4)" : "#FF6B2B", color: "#fff", border: "none", borderRadius: "10px", padding: "1rem", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: "0.1em", cursor: stage === "processing" ? "not-allowed" : "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { if (stage !== "processing") { e.currentTarget.style.background = "#e55a1f"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(255,107,43,0.3)"; } }}
            onMouseLeave={e => { e.currentTarget.style.background = stage === "processing" ? "rgba(255,107,43,0.4)" : "#FF6B2B"; e.currentTarget.style.boxShadow = "none"; }}
          >
            {stage === "processing" ? "PROCESSING..." : "GENERATE FINGERPRINT →"}
          </button>
        </div>

        {/* ── RIGHT: Visualizer ── */}
        <div style={{ padding: "3.5rem 3rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", textTransform: "uppercase" }}> fingerprint visualizer</span>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: stage === "processing" || stage === "done" ? "#39FF14" : stage === "error" ? "#E74C3C" : "rgba(255,255,255,0.2)", boxShadow: stage === "processing" || stage === "done" ? "0 0 8px #39FF14" : "none", transition: "all 0.4s" }} />
          </div>

          {/* Empty state */}
          {stage === "idle" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", border: "1px solid rgba(255,107,43,0.12)", borderRadius: "16px", padding: "3rem", textAlign: "center", background: "rgba(255,107,43,0.04)" }}>
              <div style={{ fontSize: "2.5rem", opacity: 0.15 }}>◈</div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase", lineHeight: 1.8 }}>
                Your Content DNA<br />will appear here
              </p>
            </div>
          )}

          {/* Error state */}
          {stage === "error" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", border: "1px solid rgba(231,76,60,0.2)", borderRadius: "16px", padding: "3rem", textAlign: "center", background: "rgba(231,76,60,0.04)" }}>
              <div style={{ fontSize: "2.5rem", opacity: 0.4 }}>✕</div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: "#E74C3C", letterSpacing: "0.15em", textTransform: "uppercase", lineHeight: 1.8 }}>Upload Failed<br />Check your connection</p>
              <button
                onClick={() => { setStage("idle"); setUploadError(null); }}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#FF6B2B", background: "transparent", border: "1px solid rgba(255,107,43,0.3)", borderRadius: "6px", padding: "0.5rem 1rem", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}>Try Again</button>
            </div>
          )}

          {/* Processing steps */}
          {(stage === "processing" || stage === "done") && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {STEP_LABELS.map((label, i) => {
                const s = steps[i];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", borderRadius: "10px", transition: "all 0.4s", border: s === 1 ? "1px solid #FF6B2B" : s === 2 ? "1px solid rgba(57,255,20,0.2)" : "1px solid rgba(255,107,43,0.12)", background: s === 1 ? "rgba(255,107,43,0.08)" : s === 2 ? "rgba(57,255,20,0.04)" : "rgba(22,11,2,0.8)", opacity: s === 0 ? 0.35 : 1 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", letterSpacing: "0.1em", color: s === 2 ? "#39FF14" : s === 1 ? "#FF6B2B" : "rgba(255,255,255,0.3)", minWidth: "24px" }}>0{i + 1}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 500, flex: 1 }}>{label}</span>
                    <div style={{ height: "2px", background: "rgba(255,107,43,0.1)", borderRadius: "99px", overflow: "hidden", width: "60px" }}>
                      <div style={{ height: "100%", borderRadius: "99px", background: s === 2 ? "#39FF14" : "#FF6B2B", width: s >= 1 ? "100%" : "0%", transition: s === 1 ? "width 2s linear" : "none" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Content Passport */}
          {passport && stage === "done" && (
            <div ref={passportRef} className="passport-anim" style={{ border: `1px solid ${passport.matchCount > 0 ? "rgba(231,76,60,0.4)" : "rgba(255,107,43,0.25)"}`, borderRadius: "16px", padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem", background: "linear-gradient(135deg, rgba(255,107,43,0.06) 0%, rgba(255,107,43,0.02) 100%)" }}>

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "0.08em", color: "#fff" }}>CONTENT PASSPORT</span>
                {passport.matchCount > 0 ? (
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.55rem", background: "rgba(231,76,60,0.12)", color: "#E74C3C", border: "1px solid rgba(231,76,60,0.3)", padding: "0.3rem 0.75rem", borderRadius: "999px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    ⚠ Threat Detected
                  </span>
                ) : (
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.55rem", background: "rgba(57,255,20,0.1)", color: "#39FF14", border: "1px solid rgba(57,255,20,0.2)", padding: "0.3rem 0.75rem", borderRadius: "999px", letterSpacing: "0.12em", textTransform: "uppercase" }}>Protected</span>
                )}
              </div>

              {/* Asset preview */}
              {previewUrl && (
                <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,107,43,0.2)", maxHeight: "160px", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0500" }}>
                  {fileType?.startsWith("image/") ? (
                    <img src={previewUrl} alt="Asset" style={{ width: "100%", maxHeight: "160px", objectFit: "cover" }} />
                  ) : fileType?.startsWith("video/") ? (
                    <video src={previewUrl} style={{ width: "100%", maxHeight: "160px", objectFit: "cover" }} muted controls />
                  ) : (
                    <div style={{ padding: "1.5rem", width: "100%", textAlign: "center" }}>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", marginBottom: "0.75rem", letterSpacing: "0.1em" }}>AUDIO FILE</p>
                      <audio src={previewUrl} controls style={{ width: "100%" }} />
                    </div>
                  )}
                </div>
              )}

              <div style={{ height: "1px", background: "rgba(255,107,43,0.15)" }} />

              {/* ── Phase 1: Hash match threat panel (only renders when hits exist) ── */}
              {passport.matchCount > 0 && (
                <div style={{ background: "rgba(231,76,60,0.07)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: "10px", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#E74C3C", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      ⚠ {passport.matchCount} hash match{passport.matchCount > 1 ? "es" : ""} found
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.52rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
                      REGISTRY HIT
                    </span>
                  </div>
                  {passport.hashMatches.map((match, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.55rem 0.75rem", background: "rgba(231,76,60,0.05)", borderRadius: "6px", border: "1px solid rgba(231,76,60,0.12)" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {match.source_title ?? match.source_url.slice(0, 38) + "..."}
                        </span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.52rem", color: "rgba(255,255,255,0.28)", letterSpacing: "0.08em" }}>
                          {match.match_type.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0, marginLeft: "0.75rem" }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", fontWeight: 600, color: match.similarity >= 95 ? "#E74C3C" : match.similarity >= 85 ? "#FF6B2B" : "#f39c12" }}>
                          {match.similarity}%
                        </span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.5rem", background: match.threat_level === "high" ? "rgba(231,76,60,0.2)" : "rgba(255,107,43,0.2)", color: match.threat_level === "high" ? "#E74C3C" : "#FF6B2B", padding: "0.2rem 0.5rem", borderRadius: "4px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          {match.threat_level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Passport fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {([
                  ["Content ID",     passport.id,                                                        false],
                  ["Status",         passport.matchCount > 0 ? "⚠ Threat Detected" : "Monitoring Active", passport.matchCount > 0 ? "red" : "green"],
                  ["Hash Signature", passport.hash,                                                      "orange"],
                  ["Registered",     passport.time,                                                      false],
                  ["Owner",          passport.owner,                                                     false],
                  ["Event",          passport.event,                                                     false],
                  ["Team",           passport.team  || "—",                                              false],
                  ["Sport",          passport.sport || "—",                                              false],
                ] as [string, string, string | false][]).map(([label, value, accent]) => (
                  <div key={label}>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.3rem" }}>{label}</p>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", fontWeight: 500, color: accent === "green" ? "#39FF14" : accent === "orange" ? "#FF6B2B" : accent === "red" ? "#E74C3C" : "#fff", wordBreak: "break-all" }}>{value}</p>
                  </div>
                ))}
              </div>

              <div style={{ height: "1px", background: "rgba(255,107,43,0.15)" }} />

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  className="dl-btn"
                  onClick={downloadPassport}
                  style={{ flex: 1, padding: "0.7rem", border: "1px solid #FF6B2B", background: "transparent", color: "#FF6B2B", borderRadius: "8px", fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}
                >
                  Download Passport
                </button>
                <Link
                  href="/dashboard"
                  style={{ flex: 1, padding: "0.7rem", background: "#FF6B2B", color: "#fff", borderRadius: "8px", fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  View Dashboard →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}