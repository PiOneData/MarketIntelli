import { useState } from "react";

interface UserProfile {
  name: string;
  role: string;
  organization: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  bio: string;
  expertise: string[];
  avatarInitials: string;
}

interface SavedReport {
  id: string;
  title: string;
  location: string;
  date: string;
  type: string;
  status: "completed" | "draft" | "processing";
  rating: string;
}

interface Activity {
  id: string;
  action: string;
  target: string;
  timestamp: string;
  icon: string;
  type: "report" | "analysis" | "download" | "update";
}

const USER: UserProfile = {
  name: "Arjun Sharma",
  role: "Senior Solar Analyst",
  organization: "Refex Energy Intelligence",
  email: "arjun.sharma@refex.in",
  phone: "+91 98765 43210",
  location: "Chennai, Tamil Nadu",
  joinDate: "March 2022",
  bio:
    "Specialising in solar resource assessment, site feasibility studies, and renewable energy project development across India. Over 8 years of experience in the RE sector with expertise in GIS analysis and financial modelling.",
  expertise: ["Solar Resource Assessment", "GIS & Remote Sensing", "Financial Modelling", "EPC Project Management", "Grid Integration"],
  avatarInitials: "AS",
};

const SAVED_REPORTS: SavedReport[] = [
  {
    id: "1",
    title: "Atmakur Solar Farm — Full Assessment",
    location: "Atmakur, Andhra Pradesh",
    date: "19 Feb 2026",
    type: "Detailed Assessment",
    status: "completed",
    rating: "HIGHLY SUITABLE",
  },
  {
    id: "2",
    title: "Jodhpur Industrial Zone — Feasibility",
    location: "Jodhpur, Rajasthan",
    date: "14 Feb 2026",
    type: "Feasibility Study",
    status: "completed",
    rating: "SUITABLE",
  },
  {
    id: "3",
    title: "Jaisalmer Ultra-Mega Solar — Phase 2",
    location: "Jaisalmer, Rajasthan",
    date: "08 Feb 2026",
    type: "Investment Grade",
    status: "processing",
    rating: "—",
  },
  {
    id: "4",
    title: "Nellore Coastal Grid Analysis",
    location: "Nellore, Andhra Pradesh",
    date: "01 Feb 2026",
    type: "Environmental Impact",
    status: "draft",
    rating: "—",
  },
];

const ACTIVITIES: Activity[] = [
  { id: "1", action: "Generated report for", target: "Atmakur Solar Farm", timestamp: "Today, 10:35 AM", icon: "📊", type: "report" },
  { id: "2", action: "Started analysis wizard for", target: "Jaisalmer Ultra-Mega Solar", timestamp: "Today, 09:12 AM", icon: "🌞", type: "analysis" },
  { id: "3", action: "Downloaded PDF report for", target: "Jodhpur Industrial Zone", timestamp: "Yesterday, 4:48 PM", icon: "⬇️", type: "download" },
  { id: "4", action: "Updated site parameters for", target: "Nellore Coastal Grid Analysis", timestamp: "Yesterday, 2:20 PM", icon: "✏️", type: "update" },
  { id: "5", action: "Completed feasibility study for", target: "Jodhpur Industrial Zone", timestamp: "14 Feb 2026", icon: "✅", type: "report" },
  { id: "6", action: "Created new analysis for", target: "Nellore Coastal Grid Analysis", timestamp: "01 Feb 2026", icon: "➕", type: "analysis" },
];

const STATS = [
  { label: "Reports Generated", value: "24", icon: "📋", color: "#0f766e" },
  { label: "Sites Analysed", value: "17", icon: "📍", color: "#2563eb" },
  { label: "States Covered", value: "8", icon: "🗺️", color: "#7c3aed" },
  { label: "MW Capacity Studied", value: "4,820", icon: "⚡", color: "#f59e0b" },
];

type ProfileTab = "overview" | "reports" | "activity" | "settings";

function StatusBadge({ status }: { status: SavedReport["status"] }) {
  const config = {
    completed: { label: "Completed", color: "#16a34a", bg: "#dcfce7" },
    draft: { label: "Draft", color: "#64748b", bg: "#f1f5f9" },
    processing: { label: "Processing", color: "#d97706", bg: "#fef3c7" },
  }[status];
  return (
    <span
      className="profile-report-status"
      style={{ color: config.color, background: config.bg }}
    >
      {config.label}
    </span>
  );
}

function RatingBadge({ rating }: { rating: string }) {
  if (rating === "—") return <span style={{ color: "var(--color-gray-400)" }}>—</span>;
  const color = rating === "HIGHLY SUITABLE" ? "#16a34a" : rating === "SUITABLE" ? "#0f766e" : "#f59e0b";
  return (
    <span className="profile-rating-badge" style={{ background: color }}>
      {rating}
    </span>
  );
}

function AtmakurReport({ onClose }: { onClose: () => void }) {
  return (
    <div className="sr-overlay">
      <div className="sr-container">
        {/* Back button */}
        <button className="sr-back-btn" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Saved Reports
        </button>

        {/* Cover Header */}
        <div className="sr-header">
          <div className="sr-header-badge">Solar Site Analysis Report</div>
          <h1 className="sr-title">Atmakur Solar Farm</h1>
          <p className="sr-subtitle">Full Assessment — Andhra Pradesh, India</p>
          <div className="sr-meta-row">
            <span className="sr-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              14° 37′ N, 79° 40′ E · 121 m ASL
            </span>
            <span className="sr-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              January 2023 – January 2025 (2 years)
            </span>
            <span className="sr-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Nearly flat · 2.5° slope · South-facing
            </span>
          </div>
          <div className="sr-rating-pill">HIGHLY SUITABLE</div>
        </div>

        {/* Executive Summary */}
        <section className="sr-section">
          <h2 className="sr-section-title">
            <span className="sr-section-icon">📋</span>
            Executive Summary
          </h2>
          <div className="sr-summary-box">
            This location demonstrates strong solar potential with very good irradiance levels (5.25 kWh/m²/day) and optimal terrain characteristics. The site faces typical inland peninsular challenges including high temperatures, seasonal monsoons, and elevated dust levels, but these are manageable with appropriate system design. Standard-grade equipment with bi-weekly cleaning protocols will perform well here.
          </div>

          <div className="sr-kpi-grid">
            <div className="sr-kpi">
              <div className="sr-kpi-value">5.25</div>
              <div className="sr-kpi-unit">kWh/m²/day</div>
              <div className="sr-kpi-label">Daily Avg. Irradiance</div>
            </div>
            <div className="sr-kpi">
              <div className="sr-kpi-value">1,916</div>
              <div className="sr-kpi-unit">kWh/m²/yr</div>
              <div className="sr-kpi-label">Global Horizontal Irradiance</div>
            </div>
            <div className="sr-kpi">
              <div className="sr-kpi-value">0.50%</div>
              <div className="sr-kpi-unit">per year</div>
              <div className="sr-kpi-label">Degradation Rate</div>
            </div>
            <div className="sr-kpi">
              <div className="sr-kpi-value">1,750</div>
              <div className="sr-kpi-unit">kWh/kWp/yr</div>
              <div className="sr-kpi-label">Expected Energy Yield</div>
            </div>
          </div>
        </section>

        {/* Solar Resource Assessment */}
        <section className="sr-section">
          <h2 className="sr-section-title">
            <span className="sr-section-icon">☀️</span>
            Solar Resource Assessment
          </h2>

          <h3 className="sr-subsection-title">Irradiance Profile</h3>
          <p className="sr-body">
            The site receives <strong>1,916 kWh/m²/year</strong> of global horizontal irradiance, placing it in the <strong>"Very Good"</strong> category for solar development. The daily average of 5.25 kWh/m²/day is excellent for commercial viability, comparable to India's better solar zones.
          </p>
          <div className="sr-highlight-box sr-highlight-box--green">
            <strong>Key strength:</strong> South-southeast aspect (157°) on nearly flat terrain creates optimal tilt conditions for year-round energy capture. This natural orientation eliminates the need for extensive grading or specialised mounting systems.
          </div>

          <h3 className="sr-subsection-title" style={{ marginTop: "1.5rem" }}>Cloud Cover Impact</h3>
          <p className="sr-body">
            Mean cloud cover of <strong>56%</strong> (median 66%) indicates moderate atmospheric attenuation, typical for this climatic zone. The higher median suggests occasional clear-sky periods interspersed with cloudy days, particularly during monsoon months. Despite this, the annual irradiance remains strong due to high sun angles and clear winter/summer months.
          </p>
        </section>

        {/* Environmental Challenges */}
        <section className="sr-section">
          <h2 className="sr-section-title">
            <span className="sr-section-icon">🌡️</span>
            Environmental Challenges &amp; Mitigation
          </h2>

          <h3 className="sr-subsection-title">Temperature Management</h3>
          <div className="sr-highlight-box sr-highlight-box--amber">
            <strong>Critical consideration:</strong> Absolute maximum of 46.3°C with 38 days/year exceeding 40°C presents significant thermal stress.
          </div>
          <div className="sr-bullet-list">
            <div className="sr-bullet-item"><span className="sr-bullet-dot" />Estimated output loss: ~8.5% during peak temperature periods (March–May)</div>
            <div className="sr-bullet-item"><span className="sr-bullet-dot" />Module selection: Temperature coefficient becomes crucial; opt for modules with ≤−0.35%/°C power degradation</div>
            <div className="sr-bullet-item"><span className="sr-bullet-dot" />Mounting design: Ensure adequate rear ventilation (minimum 150 mm clearance) to enhance convective cooling</div>
            <div className="sr-bullet-item"><span className="sr-bullet-dot" />Seasonal pattern: Summer peak (38.4°C avg, Mar–May) vs winter low (20.3°C, Nov–Feb) — 18°C seasonal swing</div>
          </div>

          <div className="sr-temp-row">
            <div className="sr-temp-card sr-temp-card--hot">
              <div className="sr-temp-label">Summer Peak (Mar–May)</div>
              <div className="sr-temp-value">38.4°C</div>
              <div className="sr-temp-sub">Max: 46.3°C</div>
            </div>
            <div className="sr-temp-card sr-temp-card--mild">
              <div className="sr-temp-label">Annual Average</div>
              <div className="sr-temp-value">28.6°C</div>
              <div className="sr-temp-sub">Daily swing: 9.9°C</div>
            </div>
            <div className="sr-temp-card sr-temp-card--cool">
              <div className="sr-temp-label">Winter (Nov–Feb)</div>
              <div className="sr-temp-value">20.3°C</div>
              <div className="sr-temp-sub">Optimal for output</div>
            </div>
          </div>

          <h3 className="sr-subsection-title" style={{ marginTop: "1.75rem" }}>Soiling &amp; Aerosol Loading</h3>
          <p className="sr-body">High AOD of <strong>0.513</strong> indicates substantial atmospheric particulate matter from agricultural dust, seasonal biomass burning, and regional industrial emissions. Soiling losses estimated at 2–4% with bi-weekly cleaning.</p>
          <div className="sr-bullet-list">
            <div className="sr-bullet-item"><span className="sr-bullet-dot" />108 high-dust days annually concentrated in dry summer months</div>
            <div className="sr-bullet-item"><span className="sr-bullet-dot" />Implement automated dry-cleaning systems or manual washing (bi-weekly minimum, weekly during Mar–May)</div>
            <div className="sr-bullet-item"><span className="sr-bullet-dot" />Consider hydrophobic anti-soiling coatings to reduce cleaning frequency</div>
          </div>

          <h3 className="sr-subsection-title" style={{ marginTop: "1.75rem" }}>Precipitation Patterns</h3>
          <p className="sr-body">Monsoon-dominated regime: <strong>95% of annual rainfall (818 mm)</strong> occurs June–September.</p>
          <div className="sr-bullet-list">
            <div className="sr-bullet-item"><span className="sr-bullet-dot" />Natural panel cleaning during monsoon reduces maintenance costs Q3–Q4</div>
            <div className="sr-bullet-item"><span className="sr-bullet-dot" />Heavy events (up to 128 mm/day, ~2/year) require robust drainage design</div>
            <div className="sr-bullet-item"><span className="sr-bullet-dot" />Only 46 mm across the 8 non-monsoon months — active cleaning protocols essential</div>
          </div>

          <h3 className="sr-subsection-title" style={{ marginTop: "1.75rem" }}>Humidity &amp; PID Risk</h3>
          <div className="sr-highlight-box sr-highlight-box--green">
            Mean relative humidity of <strong>63%</strong> (range 28–96%). PID conditions confirmed <strong>Favourable</strong> — standard PV modules are acceptable; no premium PID-resistant materials required.
          </div>

          <h3 className="sr-subsection-title" style={{ marginTop: "1.75rem" }}>Wind &amp; Structural Considerations</h3>
          <p className="sr-body">Moderate wind regime: mean 3.07 m/s, max observed 9.55 m/s. Zero days exceeding 15 m/s during the monitoring period. Standard IEC 61215 certification is adequate; lower-cost fixed-tilt racking systems are appropriate.</p>
        </section>

        {/* Seasonal Performance */}
        <section className="sr-section">
          <h2 className="sr-section-title">
            <span className="sr-section-icon">📅</span>
            Seasonal Performance Modelling
          </h2>
          <div className="sr-season-grid">
            <div className="sr-season-card">
              <div className="sr-season-label">Winter</div>
              <div className="sr-season-months">Nov – Feb</div>
              <div className="sr-season-perf sr-season-perf--excellent">95–100%</div>
              <p className="sr-season-note">Low temperatures (20.3°C avg), minimal soiling, low cloud cover</p>
            </div>
            <div className="sr-season-card">
              <div className="sr-season-label">Summer</div>
              <div className="sr-season-months">Mar – May</div>
              <div className="sr-season-perf sr-season-perf--good">85–92%</div>
              <p className="sr-season-note">Max irradiance but peak temperatures (38.4°C avg, 46.3°C max) and high dust</p>
            </div>
            <div className="sr-season-card">
              <div className="sr-season-label">Monsoon</div>
              <div className="sr-season-months">Jun – Sep</div>
              <div className="sr-season-perf sr-season-perf--moderate">70–80%</div>
              <p className="sr-season-note">Natural cleaning but 66%+ cloud cover and 818 mm rainfall</p>
            </div>
            <div className="sr-season-card">
              <div className="sr-season-label">Post-Monsoon</div>
              <div className="sr-season-months">October</div>
              <div className="sr-season-perf sr-season-perf--excellent">90–95%</div>
              <p className="sr-season-note">Clean panels, moderate temperatures, improving weather</p>
            </div>
          </div>
        </section>

        {/* Degradation */}
        <section className="sr-section">
          <h2 className="sr-section-title">
            <span className="sr-section-icon">📉</span>
            Degradation &amp; Longevity Outlook
          </h2>
          <div className="sr-degrade-row">
            <div className="sr-degrade-card">
              <div className="sr-degrade-year">Year 10</div>
              <div className="sr-degrade-pct">~95%</div>
              <div className="sr-degrade-sub">of initial capacity</div>
            </div>
            <div className="sr-degrade-card">
              <div className="sr-degrade-year">Year 25</div>
              <div className="sr-degrade-pct">~87.5%</div>
              <div className="sr-degrade-sub">of initial capacity</div>
            </div>
          </div>
          <p className="sr-body">Environmental Stress Index: <strong>0.50%/year</strong> — a conservative estimate based on UV exposure and thermal cycling. The inland location eliminates salt corrosion concerns, and favourable PID conditions prevent accelerated degradation.</p>
          <div className="sr-highlight-box sr-highlight-box--blue">
            Actual degradation may vary ±0.15%/year based on specific equipment selection and O&amp;M practices. Projections assume Tier-1 modules, proper installation, and adherence to recommended cleaning schedules.
          </div>
        </section>

        {/* System Design Recommendations */}
        <section className="sr-section">
          <h2 className="sr-section-title">
            <span className="sr-section-icon">⚙️</span>
            System Design Recommendations
          </h2>

          <div className="sr-rec-grid">
            <div className="sr-rec-card">
              <h4 className="sr-rec-title">Module Selection</h4>
              <div className="sr-numbered-list">
                <div className="sr-numbered-item"><span className="sr-num">1</span>Low temperature coefficient (≤−0.35%/°C)</div>
                <div className="sr-numbered-item"><span className="sr-num">2</span>Anti-soiling glass coatings</div>
                <div className="sr-numbered-item"><span className="sr-num">3</span>Standard PID resistance (not enhanced)</div>
                <div className="sr-numbered-item"><span className="sr-num">4</span>Robust junction boxes for high-temperature environments</div>
              </div>
            </div>
            <div className="sr-rec-card">
              <h4 className="sr-rec-title">Mounting &amp; Racking</h4>
              <div className="sr-bullet-list">
                <div className="sr-bullet-item"><span className="sr-bullet-dot" />Tilt angle: 15° (≈ latitude), Azimuth: 180° (south)</div>
                <div className="sr-bullet-item"><span className="sr-bullet-dot" />Row spacing: zero shading at 9 am/3 pm on winter solstice</div>
                <div className="sr-bullet-item"><span className="sr-bullet-dot" />Ground clearance: min 500 mm for airflow and monsoon splash-back prevention</div>
              </div>
            </div>
            <div className="sr-rec-card">
              <h4 className="sr-rec-title">Electrical Infrastructure</h4>
              <div className="sr-bullet-list">
                <div className="sr-bullet-item"><span className="sr-bullet-dot" />Inverter derating: size for 40°C+ ambient with adequate ventilation</div>
                <div className="sr-bullet-item"><span className="sr-bullet-dot" />String config: account for 46.3°C max in Voc calculations</div>
                <div className="sr-bullet-item"><span className="sr-bullet-dot" />DC cable sizing: uprate by 25% for high-temperature resistance increases</div>
              </div>
            </div>
            <div className="sr-rec-card">
              <h4 className="sr-rec-title">Cleaning Schedule (O&amp;M)</h4>
              <div className="sr-bullet-list">
                <div className="sr-bullet-item"><span className="sr-bullet-dot" /><strong>Bi-weekly:</strong> Jan–May, Oct–Dec</div>
                <div className="sr-bullet-item"><span className="sr-bullet-dot" /><strong>Weekly:</strong> Mar–May (peak dust)</div>
                <div className="sr-bullet-item"><span className="sr-bullet-dot" /><strong>Monthly:</strong> Jun–Sep (monsoon, natural cleaning)</div>
                <div className="sr-bullet-item"><span className="sr-bullet-dot" />Real-time soiling loss monitoring for optimal dispatch</div>
              </div>
            </div>
          </div>
        </section>

        {/* Risk Assessment Table */}
        <section className="sr-section">
          <h2 className="sr-section-title">
            <span className="sr-section-icon">⚠️</span>
            Risk Assessment &amp; Mitigation
          </h2>
          <div className="sr-table-wrap">
            <table className="sr-table">
              <thead>
                <tr>
                  <th>Risk Factor</th>
                  <th>Severity</th>
                  <th>Mitigation Strategy</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { risk: "High temperature losses", severity: "Moderate", sev: "moderate", mitigation: "Low-temp-coefficient modules, enhanced ventilation" },
                  { risk: "Soiling from dust", severity: "Moderate–High", sev: "high", mitigation: "Automated/scheduled cleaning, anti-soiling coatings" },
                  { risk: "Monsoon flooding", severity: "Low", sev: "low", mitigation: "Proper site grading, elevated equipment pads" },
                  { risk: "Equipment overheating", severity: "Moderate", sev: "moderate", mitigation: "Derating, active/passive cooling for inverters" },
                  { risk: "PID degradation", severity: "Low", sev: "low", mitigation: "Standard modules sufficient per site conditions" },
                  { risk: "Wind damage", severity: "Very Low", sev: "vlow", mitigation: "Standard IEC 61215 adequate" },
                  { risk: "Hail damage", severity: "Low", sev: "low", mitigation: "No hail days recorded; standard glass sufficient" },
                ].map((row) => (
                  <tr key={row.risk}>
                    <td>{row.risk}</td>
                    <td><span className={`sr-severity sr-severity--${row.sev}`}>{row.severity}</span></td>
                    <td>{row.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Economic Performance */}
        <section className="sr-section">
          <h2 className="sr-section-title">
            <span className="sr-section-icon">💰</span>
            Economic Performance Indicators
          </h2>
          <div className="sr-yield-grid">
            <div className="sr-yield-card sr-yield-card--conservative">
              <div className="sr-yield-label">Conservative</div>
              <div className="sr-yield-value">1,650</div>
              <div className="sr-yield-unit">kWh/kWp/year</div>
              <div className="sr-yield-note">Accounting for all losses</div>
            </div>
            <div className="sr-yield-card sr-yield-card--expected">
              <div className="sr-yield-label">Expected</div>
              <div className="sr-yield-value">1,750</div>
              <div className="sr-yield-unit">kWh/kWp/year</div>
              <div className="sr-yield-note">Realistic scenario</div>
            </div>
            <div className="sr-yield-card sr-yield-card--optimistic">
              <div className="sr-yield-label">Optimistic</div>
              <div className="sr-yield-value">1,850</div>
              <div className="sr-yield-unit">kWh/kWp/year</div>
              <div className="sr-yield-note">Best-case O&amp;M execution</div>
            </div>
          </div>
          <p className="sr-body" style={{ marginTop: "1.25rem" }}>Performance ratio assumptions: <strong>75–80%</strong> (industry-standard for inland India installations). Key value drivers include excellent baseline irradiance, optimal terrain requiring minimal civil work, and standard equipment requirements that reduce CAPEX.</p>
        </section>

        {/* Conclusions */}
        <section className="sr-section">
          <h2 className="sr-section-title">
            <span className="sr-section-icon">✅</span>
            Conclusions &amp; Site Suitability
          </h2>
          <div className="sr-conclusion-banner">
            <div className="sr-conclusion-rating">HIGHLY SUITABLE</div>
            <div className="sr-conclusion-sub">for commercial solar development</div>
          </div>
          <div className="sr-pros-cons-row">
            <div className="sr-pros-card">
              <h4 className="sr-pros-title">Strengths</h4>
              <div className="sr-check-list">
                {[
                  "Outstanding solar resource (top 25% in India)",
                  "Ideal topography and orientation",
                  "Manageable environmental stressors",
                  "Standard equipment requirements reduce CAPEX",
                  "Inland location eliminates corrosion concerns",
                  "100% data completeness across all metrics",
                ].map((s) => (
                  <div key={s} className="sr-check-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div className="sr-cons-card">
              <h4 className="sr-cons-title">Active Management Required</h4>
              <div className="sr-warn-list">
                {[
                  "Temperature-induced losses during summer peak",
                  "Dust accumulation requiring regular cleaning",
                  "Monsoon drainage planning needed",
                ].map((s) => (
                  <div key={s} className="sr-warn-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="sr-final-note">
            <strong>Bottom line:</strong> This site will deliver reliable, above-average solar performance with conventional technology and disciplined O&amp;M practices. The 2-year dataset (100% completeness across all eight environmental parameters) provides exceptional confidence in these projections. Proceed with detailed engineering design and financial modelling.
          </div>
        </section>

        {/* Footer */}
        <div className="sr-footer">
          <div className="sr-footer-meta">
            <span>Analysis Period: January 2023 – January 2025</span>
            <span>·</span>
            <span>Data Completeness: 100%</span>
            <span>·</span>
            <span>Generated: 19 Feb 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: USER.name,
    role: USER.role,
    organization: USER.organization,
    email: USER.email,
    phone: USER.phone,
    location: USER.location,
    bio: USER.bio,
  });
  const [notifications, setNotifications] = useState({
    reportReady: true,
    weeklyDigest: true,
    policyAlerts: false,
    marketUpdates: true,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setSaveSuccess(true);
    setEditMode(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const tabs: { id: ProfileTab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "👤" },
    { id: "reports", label: "Saved Reports", icon: "📋" },
    { id: "activity", label: "Recent Activity", icon: "🕐" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  if (viewingReportId === "1") {
    return <AtmakurReport onClose={() => setViewingReportId(null)} />;
  }

  return (
    <div className="profile-page">
      {/* Hero / Cover */}
      <div className="profile-hero">
        <div className="profile-hero-cover" />
        <div className="profile-hero-body">
          <div className="profile-avatar">
            <div className="profile-avatar-circle">
              {USER.avatarInitials}
            </div>
            <div className="profile-avatar-online" />
          </div>
          <div className="profile-hero-info">
            <h1 className="profile-name">{profileForm.name}</h1>
            <p className="profile-role">{profileForm.role}</p>
            <p className="profile-org">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              {profileForm.organization}
            </p>
            <p className="profile-location-text">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {profileForm.location}
            </p>
          </div>
          <div className="profile-hero-actions">
            <button
              className={`profile-edit-btn${editMode ? " profile-edit-btn--cancel" : ""}`}
              onClick={() => setEditMode((e) => !e)}
            >
              {editMode ? "Cancel" : "Edit Profile"}
            </button>
            {saveSuccess && (
              <span className="profile-save-success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                Saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="profile-stats-bar">
        {STATS.map((s) => (
          <div key={s.label} className="profile-stat">
            <span className="profile-stat-icon">{s.icon}</span>
            <span className="profile-stat-value" style={{ color: s.color }}>{s.value}</span>
            <span className="profile-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`profile-tab${activeTab === t.id ? " profile-tab--active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="profile-tab-content">
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="profile-overview">
            <div className="profile-overview-left">
              {/* About Card */}
              <div className="profile-card">
                <div className="profile-card-header">
                  <h3>About</h3>
                  {editMode && (
                    <button className="profile-save-btn" onClick={handleSave}>Save Changes</button>
                  )}
                </div>
                {editMode ? (
                  <div className="profile-edit-form">
                    <div className="profile-form-row">
                      <div className="profile-form-field">
                        <label>Full Name</label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                        />
                      </div>
                      <div className="profile-form-field">
                        <label>Role / Title</label>
                        <input
                          type="text"
                          value={profileForm.role}
                          onChange={(e) => setProfileForm((p) => ({ ...p, role: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="profile-form-row">
                      <div className="profile-form-field">
                        <label>Organization</label>
                        <input
                          type="text"
                          value={profileForm.organization}
                          onChange={(e) => setProfileForm((p) => ({ ...p, organization: e.target.value }))}
                        />
                      </div>
                      <div className="profile-form-field">
                        <label>Location</label>
                        <input
                          type="text"
                          value={profileForm.location}
                          onChange={(e) => setProfileForm((p) => ({ ...p, location: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="profile-form-row">
                      <div className="profile-form-field">
                        <label>Email</label>
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                        />
                      </div>
                      <div className="profile-form-field">
                        <label>Phone</label>
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="profile-form-field profile-form-field--full">
                      <label>Bio</label>
                      <textarea
                        rows={4}
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="profile-bio">{profileForm.bio}</p>
                    <div className="profile-contact-list">
                      <div className="profile-contact-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        <span>{profileForm.email}</span>
                      </div>
                      <div className="profile-contact-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.21 12a19.79 19.79 0 01-3.07-8.67A2 2 0 013.12 1.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 8.09a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.02z"/></svg>
                        <span>{profileForm.phone}</span>
                      </div>
                      <div className="profile-contact-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
                        <span>Member since {USER.joinDate}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Expertise Card */}
              <div className="profile-card">
                <h3>Areas of Expertise</h3>
                <div className="profile-expertise-tags">
                  {USER.expertise.map((e) => (
                    <span key={e} className="profile-expertise-tag">{e}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="profile-overview-right">
              {/* Recent Reports */}
              <div className="profile-card">
                <div className="profile-card-header">
                  <h3>Recent Reports</h3>
                  <button className="profile-link-btn" onClick={() => setActiveTab("reports")}>
                    View all →
                  </button>
                </div>
                <div className="profile-recent-reports">
                  {SAVED_REPORTS.slice(0, 3).map((r) => (
                    <div key={r.id} className="profile-recent-report-item">
                      <div className="profile-report-icon">
                        {r.status === "completed" ? "📊" : r.status === "processing" ? "⏳" : "📝"}
                      </div>
                      <div className="profile-report-info">
                        <span className="profile-report-title">{r.title}</span>
                        <span className="profile-report-meta">{r.location} · {r.date}</span>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Summary */}
              <div className="profile-card">
                <div className="profile-card-header">
                  <h3>Recent Activity</h3>
                  <button className="profile-link-btn" onClick={() => setActiveTab("activity")}>
                    View all →
                  </button>
                </div>
                <div className="profile-activity-mini">
                  {ACTIVITIES.slice(0, 4).map((a) => (
                    <div key={a.id} className="profile-activity-mini-item">
                      <span className="profile-activity-mini-icon">{a.icon}</span>
                      <div>
                        <span>{a.action} </span>
                        <strong>{a.target}</strong>
                      </div>
                      <span className="profile-activity-time">{a.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SAVED REPORTS */}
        {activeTab === "reports" && (
          <div className="profile-reports-section">
            <div className="profile-section-header">
              <h3>Saved Reports ({SAVED_REPORTS.length})</h3>
              <div className="profile-filter-row">
                <select className="profile-filter-select">
                  <option>All Types</option>
                  <option>Feasibility Study</option>
                  <option>Detailed Assessment</option>
                  <option>Investment Grade</option>
                  <option>Environmental Impact</option>
                </select>
                <select className="profile-filter-select">
                  <option>All Statuses</option>
                  <option>Completed</option>
                  <option>Draft</option>
                  <option>Processing</option>
                </select>
              </div>
            </div>
            <div className="profile-reports-table-wrap">
              <table className="profile-reports-table">
                <thead>
                  <tr>
                    <th>Report Title</th>
                    <th>Location</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {SAVED_REPORTS.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="profile-report-title-cell">
                          <span className="profile-report-icon-sm">
                            {r.status === "completed" ? "📊" : r.status === "processing" ? "⏳" : "📝"}
                          </span>
                          {r.title}
                        </div>
                      </td>
                      <td>
                        <span className="profile-location-cell">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {r.location}
                        </span>
                      </td>
                      <td><span className="profile-type-badge">{r.type}</span></td>
                      <td style={{ fontSize: "var(--font-size-sm)", color: "var(--color-gray-500)" }}>{r.date}</td>
                      <td><RatingBadge rating={r.rating} /></td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>
                        <div className="profile-report-actions">
                          {r.status === "completed" && (
                            <>
                              <button
                                className="profile-action-icon"
                                title="View Report"
                                onClick={() => setViewingReportId(r.id)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              </button>
                              <button className="profile-action-icon" title="Download PDF">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                              </button>
                            </>
                          )}
                          {r.status === "draft" && (
                            <button className="profile-action-icon profile-action-icon--edit" title="Continue editing">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                          )}
                          <button className="profile-action-icon profile-action-icon--delete" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ACTIVITY */}
        {activeTab === "activity" && (
          <div className="profile-activity-section">
            <div className="profile-section-header">
              <h3>Recent Activity</h3>
              <select className="profile-filter-select">
                <option>All Activity</option>
                <option>Reports</option>
                <option>Analysis</option>
                <option>Downloads</option>
              </select>
            </div>
            <div className="profile-activity-timeline">
              {ACTIVITIES.map((a, idx) => (
                <div key={a.id} className="profile-timeline-item">
                  <div className="profile-timeline-icon-wrap">
                    <div className={`profile-timeline-icon profile-timeline-icon--${a.type}`}>
                      {a.icon}
                    </div>
                    {idx < ACTIVITIES.length - 1 && <div className="profile-timeline-line" />}
                  </div>
                  <div className="profile-timeline-body">
                    <p>
                      {a.action} <strong>{a.target}</strong>
                    </p>
                    <span className="profile-timeline-time">{a.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div className="profile-settings-section">
            <div className="profile-settings-grid">
              {/* Notifications */}
              <div className="profile-card">
                <h3>Notification Preferences</h3>
                <p className="profile-settings-desc">Choose what alerts and updates you receive</p>
                <div className="profile-notification-list">
                  {[
                    { key: "reportReady" as const, label: "Report Ready", desc: "Get notified when a solar analysis report is completed" },
                    { key: "weeklyDigest" as const, label: "Weekly Market Digest", desc: "Weekly summary of renewable energy market movements" },
                    { key: "policyAlerts" as const, label: "Policy & Regulatory Alerts", desc: "Instant alerts on policy changes affecting solar projects" },
                    { key: "marketUpdates" as const, label: "Market Updates", desc: "Real-time alerts on tariff and capacity changes" },
                  ].map((n) => (
                    <div key={n.key} className="profile-notification-item">
                      <div>
                        <strong>{n.label}</strong>
                        <p>{n.desc}</p>
                      </div>
                      <label className="profile-toggle">
                        <input
                          type="checkbox"
                          checked={notifications[n.key]}
                          onChange={(e) =>
                            setNotifications((prev) => ({ ...prev, [n.key]: e.target.checked }))
                          }
                        />
                        <span className="profile-toggle-track">
                          <span className="profile-toggle-thumb" />
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Account Security */}
              <div className="profile-card">
                <h3>Account & Security</h3>
                <p className="profile-settings-desc">Manage your account credentials and security settings</p>
                <div className="profile-security-list">
                  <div className="profile-security-item">
                    <div>
                      <strong>Change Password</strong>
                      <p>Last changed 3 months ago</p>
                    </div>
                    <button className="profile-settings-btn">Update</button>
                  </div>
                  <div className="profile-security-item">
                    <div>
                      <strong>Two-Factor Authentication</strong>
                      <p>Add an extra layer of security</p>
                    </div>
                    <button className="profile-settings-btn">Enable</button>
                  </div>
                  <div className="profile-security-item">
                    <div>
                      <strong>Active Sessions</strong>
                      <p>2 sessions across 2 devices</p>
                    </div>
                    <button className="profile-settings-btn profile-settings-btn--danger">Manage</button>
                  </div>
                </div>
              </div>

              {/* Data & Reports */}
              <div className="profile-card">
                <h3>Data & Reports</h3>
                <p className="profile-settings-desc">Manage your analysis data and export preferences</p>
                <div className="profile-data-options">
                  <div className="profile-data-option">
                    <div>
                      <strong>Default Report Format</strong>
                    </div>
                    <select className="profile-filter-select">
                      <option>PDF</option>
                      <option>Excel</option>
                      <option>Both</option>
                    </select>
                  </div>
                  <div className="profile-data-option">
                    <div>
                      <strong>Auto-save Drafts</strong>
                    </div>
                    <label className="profile-toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="profile-toggle-track">
                        <span className="profile-toggle-thumb" />
                      </span>
                    </label>
                  </div>
                  <div className="profile-data-option profile-data-option--danger">
                    <div>
                      <strong>Export All Data</strong>
                      <p>Download all your saved reports and analyses</p>
                    </div>
                    <button className="profile-settings-btn">Export</button>
                  </div>
                  <div className="profile-data-option profile-data-option--danger">
                    <div>
                      <strong style={{ color: "var(--color-error)" }}>Delete Account</strong>
                      <p>Permanently remove your account and all data</p>
                    </div>
                    <button className="profile-settings-btn profile-settings-btn--danger">Delete</button>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="profile-card">
                <h3>Display Preferences</h3>
                <p className="profile-settings-desc">Customise your MarketIntelli experience</p>
                <div className="profile-data-options">
                  <div className="profile-data-option">
                    <div>
                      <strong>Units System</strong>
                    </div>
                    <select className="profile-filter-select">
                      <option>Metric (kWh, MW, km)</option>
                      <option>Imperial</option>
                    </select>
                  </div>
                  <div className="profile-data-option">
                    <div>
                      <strong>Currency</strong>
                    </div>
                    <select className="profile-filter-select">
                      <option>INR (₹)</option>
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                    </select>
                  </div>
                  <div className="profile-data-option">
                    <div>
                      <strong>Default Analysis Type</strong>
                    </div>
                    <select className="profile-filter-select">
                      <option>Detailed Assessment</option>
                      <option>Feasibility Study</option>
                      <option>Investment Grade</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
