# Wind Site Intelligence Portal 🌪️🇮🇳

A professional-grade wind resource analysis and financial yield simulator designed for modern renewable energy site assessment.

## 🚀 Quick Start Guide

### 1. Backend Setup (API & Data Engine)
1. Open a terminal in the `backend/` directory.
2. Install the required Python libraries:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the server:
   ```bash
   python server.py
   ```
   *The backend runs on `http://localhost:8000`*

### 2. Frontend Setup (Intelligence UI)
1. Open a new terminal in the `frontend/` directory.
2. Install the necessary Node packages:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The application will be accessible at `http://localhost:5173`*

---

## 📊 Core Features

*   **Live Operational Matrix**: Real-time atmospheric monitoring at 80m, 120m, and 180m hub heights using Open-Meteo API.
*   **15-Year Historical Baseline**: Deep-dive reanalysis norms for wind speed, power density, and air density profiles.
*   **Yield Simulator (₹)**: Interactive financial forecasting tool with support for Turbine Count, Capacity sizing, and ROI projections in **Crores (Cr)**.
*   **Vertical Shear Analysis**: Automatic calculation of wind shear exponents (Alpha) to detect mechanical operational risks.
*   **Satellite Data Matrix**: Verified direct extraction stream from GWA v3 datasets.

---

## 🛠️ Tech Stack
- **Frontend**: React, Tailwind CSS, Framer Motion (Animations), Recharts (Data Viz), Lucide (Icons).
- **Backend**: Python (Flask/FastAPI), GWA v3 Spec, Open-Meteo Integration.
- **Data Layers**: Global Wind Atlas v3, Satellite Climatology.

---

## 📂 Codebase Structure & File Explanations

### 🐍 Backend (Python)
*   **`server.py`**: The "Heart" of the application. This is the Flask/FastAPI server that handles API requests, coordinates wind data extraction, and serves the analysis results to the frontend.
*   **`inspect_meteo.py`**: A technical utility used to audit and verify the Open-Meteo API response structure to ensure data integrity for multi-hub heights.
*   **`test_meteo_heights.py`**: Specifically used to validate the vertical wind profile calculations (interpolation between 80m, 120m, and 180m).
*   **`requirements.txt`**: Lists all Python libraries required (Flask, Requests, CORS, etc.) to recreate the server environment.

### ⚛️ Frontend (React/Vite)
*   **`src/App.jsx`**: The main application controller. It manages the global state, coordinate selection, and the primary layout transitions.
*   **`src/components/ReportView.jsx`**: The most complex component. Contains the logic for the **Yield Simulator**, the **History Charts**, and the **Live Matrix**. It handles all the ₹ Crore financial math and physics calculations.
*   **`src/components/Map.jsx`**: The interactive visual interface. Uses Leaflet to allow users to pick precise coordinates on a satellite map.
*   **`src/App.css` / `index.css`**: Contains the premium design system, including glassmorphism effects, custom gradients, and animated backgrounds.
*   **`package.json`**: The manifest for Node.js. It defines all dependencies like `framer-motion` (for animations) and `recharts` (for the wind profile graphs).

---
*Created for professional wind resource assessment and investment decision support.*
