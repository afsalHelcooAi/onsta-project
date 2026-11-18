# ONSTA – Clinic Partner Portal & Management Dashboard

A presentation-ready web application demonstrating the **ONSTA Clinic Partner Portal**, onboarding registration wizard, autonomous rule-based verification engine, and live customer profile preview.

---

## 🌟 Key Highlights & Design Identity

- **Design Reference Match**: Dark forest green sidebar (`#0d281e`), warm cream background (`#F7F4EE`), crisp white cards with beige borders (`#e7e1d7`), elegant serif page titles, and clean sans-serif forms.
- **Unified Profile Philosophy**: ONSTA controls the design, typography, and structure. Clinics maintain their verified data, documents, services, prices, and offers.
- **Autonomous Rule Engine**: Routine service updates, price changes, and offers are verified immediately by rules (V01–V12). Valid updates publish instantly; invalid updates are blocked with actionable feedback.
- **Presentation Controller Bar**: A top navigation bar enabling 1-click jumps between all 5 presentation scenarios.

---

## 🚀 How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the local Vite development server
npm run dev
```

Open your browser at `http://localhost:3000`.

---

## 🎬 5 Guided Presentation Scenarios

### **Scenario 1 – Clinic Registration Wizard**
- Navigate to `/register` or click **"Scenario 1: Clinic Registration Wizard"** in the top controller bar.
- **Tab 1 (Basic Details)**: See real-time validation. Click *"Simulate 'Best' Claim"* to see DHA ST-21 compliance blocking "Best" claims. Click *"Auto-Fix Valid"* to resolve.
- **Tab 2 (Licence Details)**: Click **"Read by AI"** on any licence to see the simulated AI OCR reading and field comparison table.
- **Tab 3 (Medical Director)**: Review Dr. Fatima Al Mansoori's DHA registration and AI credential report.
- **Tab 4 (Advertising & Services)**: Declare clinic treatments and verify MOHAP advertising permit compliance.
- **Tab 5 (Review and Submit)**: Inspect the AI verification report table, check both declarations, and click **"Submit for approval"** to watch the simulated onboarding approval flow transition to the dashboard.

### **Scenario 2 – Service Management & Scope Rules**
- Navigate to **Services & Prices** (`/dashboard/services`).
- Click **"Test Scope Failure (Hair Transplant)"**: Demonstrates rule **V06** failure because Hair Transplant requires a Day Surgery Unit licence not present on the general clinic licence.
- Add or edit normal services like *Hydrafacial MD* or *Laser Hair Removal* to demonstrate instant rule verification passing.

### **Scenario 3 – Multiple Active Offers & Wording Rules**
- Navigate to **Offers** (`/dashboard/offers`).
- Observe multiple simultaneous active offers (*Laser Hair Removal AED 599*, *Hydrafacial AED 299*, *Skin Rejuvenation AED 399*, *Chemical Peel AED 249*).
- **Independent Active / Inactive Toggle**: Toggle any offer on/off without affecting other offers.
- Click **"Test 'Best' Claim Wording Warning"** to demonstrate the real-time wording checker matching screenshot 1.

### **Scenario 4 – Common Clinic Profile**
- Navigate to **Clinic Profile** (`/dashboard/profile`).
- Edit clinic contact details or description. Click **"Save & Verify"**.
- Click **"Customer App Preview"** to view how the verified profile appears to patients on desktop and mobile. Notice how inactive offers and unverified edits are safely hidden.

### **Scenario 5 – Compliance & Licence Expiry**
- Navigate to **Compliance Centre** (`/dashboard/compliance`).
- Review licence statuses, including the warning for the DHA facility licence expiring in 38 days.
- Click **"Upload Renewal Certificate"** or **"Re-upload & AI Scan"** to run simulated AI OCR extraction and update the licence status to *Valid*.

---

## 🛠️ Tech Stack

- **React 18** with functional components and hooks
- **Vite** for fast HMR and building
- **Tailwind CSS** with custom forest and cream color palettes
- **React Router v6**
- **Lucide React** icons
- **LocalStorage** persistence for state retention across demo refreshes
