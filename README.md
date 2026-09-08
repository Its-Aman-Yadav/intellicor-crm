# Intellicor Technologies — Sales & Funnel CRM

A lightweight, web-based CRM engineered for **Intellicor Technologies**, a local-business agency selling high-performance websites, Google Business Profile (GBP) optimization, and social media management.

Built with **Next.js 16 (Turbopack)**, **TypeScript**, **Vanilla CSS**, and **Cloud Firestore**.

---

## ⚡ Key Capabilities

### 1. Sales Funnel & Lead Qualification Pipeline
Tracks prospects across the exact 9-stage local business agency funnel:
$$\text{New} \longrightarrow \text{Called} \longrightarrow \text{Interested} \longrightarrow \text{Demo Sent} \longrightarrow \text{Discovery Call} \longrightarrow \text{Proposal Sent} \longrightarrow \text{Follow-up} \longrightarrow \text{Won / Lost}$$

### 2. Auto-Calculated Lead Scoring Matrix (0–15 pts)
Evaluates qualification signals with automated priority tagging:
- **No Website** (+3 pts)
- **Bad / Outdated Website** (+2 pts)
- **Poor Google Profile (<4.0★ / Unclaimed)** (+2 pts)
- **Inactive Instagram (>30d no posts)** (+2 pts)
- **Good Business Reputation** (+2 pts)
- **Spends on Marketing (Ads/Hoardings)** (+2 pts)
- **Multiple Branches / Locations** (+3 pts)

> **Priority Badges:** 🔥 **HOT (8+ pts)** | ⚡ **WARM (5–7 pts)** | ❄️ **COLD (0–4 pts)**

### 3. Smart Column Auto-Detection & Bulk Lead Importer
- **Self-Detecting Columns**: Automatically identifies Phone, Business Name, Owner/Contact Name, City, Website, Instagram, and Notes in **any order**.
- **Multi-Format Ingestion**: Supports raw text paste, drag-and-drop file upload, CSV (comma), TSV (tab from Excel/Google Sheets), and semicolon delimiters.
- **Auto-Formatting**: Cleans and normalizes phone numbers to standard Indian mobile formats (`+91`).

### 4. 4-Stage WhatsApp Cadence Automation
Triggered upon marking **Demo Sent**:
- **Day 1**: Demo view check
- **Day 3**: High-value competitor/SEO insight
- **Day 7**: Low-pressure check-in
- **Day 15**: Courteous loop-closure
- Direct 1-tap `wa.me` generation with custom personalization tags (`{{ownerName}}`, `{{businessName}}`, `{{city}}`, etc.).

### 5. Package Lookup & Offer Recommender
- **Starter (₹8k–₹12k setup / ₹1.5k mo)**: Website + Google Business Profile setup.
- **Growth (₹15k–₹20k setup / ₹5k mo)**: Local SEO + GBP ranking + Social media.
- **Complete (₹25k–₹30k setup / ₹9k mo)**: Full-funnel digital dominance.
- Smart recommender analyzes lead gaps and generates a tailored sales rationale.

### 6. Dual-Engine Persistence
- **Cloud Firestore**: Real-time cross-device sync with Firebase (`intellicor-crm`).
- **Local Storage Cache**: Instant sub-50ms offline loads with dual-mode fallback.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env.local` file:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=intellicor-crm.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=intellicor-crm
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=intellicor-crm.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 📱 Mobile Responsiveness
Designed with mobile-first safe-area insets, bottom action navigation, and 1-tap finger-friendly direct dial and WhatsApp action targets for sales reps on the go.

