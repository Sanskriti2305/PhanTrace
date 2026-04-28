# 🛡️ PhanTrace
### AI-Powered Digital Asset Protection for Sports Media

> *"Because stolen content doesn't announce itself."*

PhanTrace fingerprints official sports media and autonomously hunts unauthorized copies across platforms — alerting rights holders in real time before the damage is done.

---

## 🏗️ Project Architecture

```
phantrace/
├── frontend/          # Next.js + Tailwind CSS
├── backend/           # Python + FastAPI
├── ml/                # Fingerprinting + Matching engine
└── README.md
```
```
phantrace/                          ← ROOT
│
├── frontend/                       
│   ├── app/
│   │   ├── page.jsx                → Landing / Upload page
│   │   ├── dashboard/page.jsx      → War Room
│   │   ├── detections/page.jsx     → Evidence Locker
│   │   └── strike/page.jsx         → Strike Command
│   ├── components/
│   │   ├── ThreatMap.jsx
│   │   ├── FingerprintVisualizer.jsx
│   │   ├── DetectionCard.jsx
│   │   └── StrikePanel.jsx
│   └── lib/
│       └── api.js
│
├── backend/                        ← FastAPI 
├── ml/                             ← Fingerprinting 
└── README.md
```

---

## ✅ Progress Tracker

### 🎨 Frontend

- [x] Landing Page
- [X] Upload Page (Content DNA Studio)
- [x] Dashboard Page (War Room Threat Map)
- [x] Detections Page (Evidence Locker)
- [x] Detection Detail Page
- [x] Strike Command Page

---

### ⚙️ Backend

- [x] Project setup (FastAPI + PostgreSQL)
- [x] Content upload API endpoint
- [x] Fingerprint generation endpoint
- [ ] Detection query endpoints
- [ ] WebSocket for real-time alerts
- [ ] DMCA notice generator endpoint

---

### 🤖 ML / AI

- [ ] pHash visual fingerprinting engine
- [ ] Audio fingerprinting (Chromaprint)
- [ ] FAISS vector DB setup + similarity search
- [ ] Auto-tagging (sport, team, event)

---

### 🕷️ Scraping

- [ ] YouTube scraper (yt-dlp)
- [ ] Reddit scraper (PRAW)
- [ ] Twitter/X scraper
- [ ] Match + alert pipeline

---

### 🚀 Final

- [ ] Connect frontend to backend
- [ ] Seed demo data for pitch
- [ ] Deploy (Vercel + Railway)
- [ ] Pitch deck ready

---

*Built for Google Solutions Challenge 2026*
