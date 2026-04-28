// Base URL for backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============ TYPES ============

export interface UploadResponse {
  status: string;
  file_id?: string;
  filename?: string;
  file_size_mb?: number;
  file_type?: string;
  message?: string;
  error?: string;
  team?: string;
  sport?: string;
  event?: string;
  owner?: string;
}

export interface HashMatch {
  source_url:       string;
  source_title:     string | null;
  similarity:       number;
  match_type:       "exact_match" | "likely_match" | "possible_match";
  threat_level:     "high" | "medium" | "low";
  method?:          string;
  matched_segments?: object[];
}

export interface FingerprintResponse {
  status:          string;
  fingerprint_id?: string;
  content_id?:     string;
  visual_hash?:    string;
  audio_hash?:     string;
  hash_signature?: string;
  frame_count?:    number;
  video_dna?:      string;
  video_meta?:     { duration_s?: number; error_frames?: number };
  hash_matches?:   HashMatch[];
  match_count?:    number;
  error?:          string;
}

export interface BackendDetection {
  id:           string;
  platform:     string;
  url:          string;
  title:        string;
  confidence:   number;
  threat_level: string;
  thumbnail?:   string;
  source?:      string;
  detected_at?: string;
}

export interface DetectionRunResponse {
  status:            string;
  fingerprint_id?:   string;
  detections_found?: number;
  detections?:       BackendDetection[];
  message?:          string;
  error?:            string;
}

export interface DetectionsListResponse {
  status:      string;
  file_id?:    string;
  detections?: BackendDetection[];
  error?:      string;
}

export interface DashboardData {
  status:             string;
  total_content?:     number;
  total_detections?:  number;
  high_threat?:       number;
  error?:             string;
}

export interface KnownContentPayload {
  content_source:  string;
  source_url:      string;
  source_title?:   string;
  visual_hash?:    string;
  audio_hash?:     string;
  hash_signature?: string;
  content_type?:   "image" | "video" | "audio";
  threat_level?:   "high" | "medium" | "low";
}

export interface KnownContentResponse {
  status: string;
  id?:    string;
  error?: string;
}

export interface CheckHashResponse {
  query_hash:    string;
  total_matches: number;
  matches:       HashMatch[];
  error?:        string;
}

export interface AllDetectionsResponse {
  status:      string;
  detections?: BackendDetection[];
  total?:      number;
  error?:      string;
}

export interface SingleDetectionResponse {
  status:     string;
  detection?: BackendDetection;
  error?:     string;
}

// ============ API FUNCTIONS ============

// ── Upload ─────────────────────────────────────────────────────────────

export async function uploadContent(
  file: File,
  formData: { owner: string; event: string; team: string; sport: string }
): Promise<UploadResponse> {
  try {
    const fd = new FormData();
    fd.append("file",  file);
    fd.append("owner", formData.owner);
    fd.append("event", formData.event);
    fd.append("team",  formData.team);
    fd.append("sport", formData.sport);

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: "POST",
      body:   fd,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: UploadResponse = await response.json();
    if (data.status === "error") throw new Error(data.error || "Upload failed");
    return data;
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ── Fingerprint ────────────────────────────────────────────────────────

export async function generateFingerprint(fileId: string): Promise<FingerprintResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fingerprint/${fileId}`, { method: "POST" });
    return await response.json();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ── Run detection (scrape internet for matches) ────────────────────────

export async function runDetection(fingerprintId: string): Promise<DetectionRunResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/detection/${fingerprintId}`, { method: "POST" });
    return await response.json();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ── Get detections for a specific file ────────────────────────────────

export async function getDetections(fileId: string): Promise<DetectionsListResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/detections/${fileId}`);
    return await response.json();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ── Get ALL detections (for Evidence Locker page) ─────────────────────

export async function getAllDetections(): Promise<AllDetectionsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/detections`);
    return await response.json();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ── Get single detection by detection ID ──────────────────────────────

export async function getDetectionById(detectionId: string): Promise<SingleDetectionResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/detections/detail/${detectionId}`);
    return await response.json();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ── Dashboard ──────────────────────────────────────────────────────────

export async function getDashboard(): Promise<DashboardData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard`);
    return await response.json();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ── Known Content Registry ─────────────────────────────────────────────

export async function registerKnownContent(payload: KnownContentPayload): Promise<KnownContentResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/known-content`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ── Manual hash check ──────────────────────────────────────────────────

export async function checkHash(visualHash: string, topK: number = 5): Promise<CheckHashResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/check-hash`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ visual_hash: visualHash, top_k: topK }),
    });
    return await response.json();
  } catch (error) {
    return { query_hash: visualHash, total_matches: 0, matches: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ── STRIKE TYPES ─────────────────────────────────────────────────────────────
 
export interface Strike {
  id: string;
  detectionId: string;
  title: string;
  account: string;
  platform: string;
  status: "draft" | "sent" | "acknowledged" | "removed" | "appealed" | "restored";
  jurisdiction: string;
  noticeType: "DMCA" | "DSA" | "IT_ACT" | "GENERIC";
  sentDate?: string | null;
  removedDate?: string | null;
  violationCount: number;
  isRepeatOffender: boolean;
  createdAt?: string;
}
 
export interface StrikeListResponse {
  status: string;
  strikes?: Strike[];
  error?: string;
}
 
export interface StrikeCreateResponse {
  status: string;
  strike?: Strike;
  error?: string;
}
 
export interface StrikeStatusResponse {
  status: string;
  strike?: Partial<Strike>;
  error?: string;
}
 
export interface StrikeNoticeResponse {
  status: string;
  notice_type?: string;
  full_name?: string;
  citation?: string;
  deadline?: string;
  notice_body?: string;
  strike?: Partial<Strike>;
  error?: string;
}
 
export interface StrikeCreatePayload {
  detection_id?: string;
  title: string;
  account: string;
  platform: string;
  jurisdiction?: string;
  notice_type?: string;
  violation_count?: number;
  is_repeat_offender?: boolean;
}
 
// ── STRIKE API FUNCTIONS ──────────────────────────────────────────────────────
 
/** Fetch all strikes from the backend */
export async function getStrikes(): Promise<StrikeListResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/strikes`);
    return await response.json();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error", strikes: [] };
  }
}
 
/** Create a new strike from a detection */
export async function createStrike(payload: StrikeCreatePayload): Promise<StrikeCreateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/strikes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}
 
/** Update a single strike's status (sent / acknowledged / removed / appealed / restored) */
export async function updateStrikeStatus(
  strikeId: string,
  status: Strike["status"]
): Promise<StrikeStatusResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/strikes/${strikeId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return await response.json();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}
 
/** Fetch the full legal notice text + metadata for a strike (used to build the PDF) */
export async function getStrikeNotice(strikeId: string): Promise<StrikeNoticeResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/strikes/${strikeId}/notice`);
    return await response.json();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}
 
/** Batch-send multiple draft strikes at once */
export async function batchSendStrikes(strikeIds: string[]): Promise<{ status: string; updated_count?: number; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/strikes/batch/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strike_ids: strikeIds }),
    });
    return await response.json();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}
 
/** Seed demo strikes for pitch/testing — call once from the Strike page or Postman */
export async function seedDemoStrikes(): Promise<{ status: string; created?: number; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/strikes/seed-demo`, { method: "POST" });
    return await response.json();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}