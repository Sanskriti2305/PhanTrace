<div align="center">

# 🛡️ PhanTrace

### AI-Powered Digital Asset Protection for Sports Media

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-blueviolet?style=for-the-badge&logo=vercel)](https://phantrace-05.vercel.app/)

> *"Because stolen content doesn't announce itself."*

PhanTrace fingerprints official sports media and autonomously hunts unauthorized copies across platforms — alerting rights holders in real time before the damage is done.

</div>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
- [Usage](#-usage)

---

## 🔍 Overview

Sports media — match highlights, broadcast clips, player footage — is stolen and redistributed every day without authorization. PhanTrace is an end-to-end AI platform that:

- **Fingerprints** your official content using visual (pHash) and audio (Chromaprint) signatures
- **Hunts** for unauthorized copies across YouTube, Reddit, Twitter/X, and more
- **Alerts** rights holders in real time via WebSocket notifications
- **Acts** with one-click DMCA notice generation and strike commands

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧬 Content DNA Studio | Upload and fingerprint your media assets |
| 🗺️ War Room Threat Map | Live dashboard of active infringements worldwide |
| 🔒 Evidence Locker | Browse and filter all detected unauthorized copies |
| ⚡ Strike Command | Trigger DMCA takedowns directly from the platform |
| 🔔 Real-Time Alerts | WebSocket-powered instant notifications |
| 🤖 Auto-Tagging | AI-powered sport, team, and event classification |

---

## 🛠 Tech Stack

**Frontend**
- [Next.js](https://nextjs.org/) — React framework
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first styling

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — High-performance Python API
- [PostgreSQL](https://www.postgresql.org/) — Relational database
- WebSockets — Real-time alert delivery

**ML / AI**
- [pHash](http://phash.org/) — Perceptual visual fingerprinting
- [Chromaprint](https://acoustid.org/chromaprint) — Audio fingerprinting
- [FAISS](https://faiss.ai/) — Vector similarity search

**Scrapers**
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — YouTube
- [PRAW](https://praw.readthedocs.io/) — Reddit
- Twitter/X scraper

**Deployment**
- [Vercel](https://vercel.com/) — Frontend hosting
- [Railway](https://railway.app/) — Backend hosting

---

## 🏗 Project Architecture

```
phantrace/
├── Frontend/               # Next.js + Tailwind CSS
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
├── Backend/                # FastAPI + PostgreSQL
│
├── ML/                     # Fingerprinting & Matching Engine
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL

### 1. Clone the Repository

```bash
git clone https://github.com/Sanskriti2305/PhanTrace.git
cd PhanTrace
```

### 2. Frontend Setup

```bash
cd Frontend
npm install
npm run dev
```

### 3. Backend Setup

```bash
cd Backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 4. ML Engine Setup

```bash
cd ML
pip install -r requirements.txt
```

### 5. Environment Variables

Create a `.env` file in the `Backend/` directory:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/phantrace
SECRET_KEY=your_secret_key
```

---

## 💡 Usage

1. **Upload** your official media on the Content DNA Studio page
2. PhanTrace generates a unique **fingerprint** for your content
3. The **scraper pipeline** monitors platforms for matching content
4. View active infringements on the **War Room** dashboard
5. Browse evidence in the **Evidence Locker**
6. Issue takedowns via the **Strike Command** panel

---

<div align="center">



</div>
