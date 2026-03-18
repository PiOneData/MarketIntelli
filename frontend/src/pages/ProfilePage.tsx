import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  listSavedAssessments,
  deleteAssessment,
  getAssessmentStats,
  downloadReport,
} from "../api/dcAssessment";
import type { ReportResponse, AssessmentStats } from "../api/dcAssessment";
import SolarWindReport from "../components/solar-wind-assessment/SolarWindReport";
import { DEFAULT_LIVE_WEATHER } from "../api/solarWindAssessment";
import type { AnalysisResult } from "../api/solarWindAssessment";

// ── Static profile info ────────────────────────────────────────────────────
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

const USER: UserProfile = {
  name: "Arjun Sharma",
  role: "Senior Solar Analyst",
  organization: "Refex Energy Intelligence",
  email: "arjun.sharma@refex.in",
  phone: "+91 98765 43210",
  location: "Chennai, Tamil Nadu",
  joinDate: "March 2022",
  bio: "Specialising in solar resource assessment, site feasibility studies, and renewable energy project development across India. Over 8 years of experience in the RE sector with expertise in GIS analysis and financial modelling.",
  expertise: ["Solar Resource Assessment", "GIS & Remote Sensing", "Financial Modelling", "EPC Project Management", "Grid Integration"],
  avatarInitials: "AS",
};

// ── Helpers ────────────────────────────────────────────────────────────────
function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    const m = date.getMinutes().toString().padStart(2, "0");
    const ampm = date.getHours() >= 12 ? "PM" : "AM";
    const h12 = date.getHours() % 12 || 12;
    return `Today, ${h12}:${m} ${ampm}`;
  }
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function assetIcon(type: string): string {
  if (type === "datacenter") return "🖥️";
  if (type === "airport") return "✈️";
  return "📊";
}

function ratingColor(rating: string | null | undefined): string {
  if (!rating || rating === "—" || rating === "N/A") return "#64748b";
  if (rating === "PREMIUM SITE" || rating === "HIGHLY SUITABLE" || rating === "EXCELLENT") return "#16a34a";
  if (rating === "OPTIMAL" || rating === "SUITABLE" || rating === "GOOD") return "#0f766e";
  if (rating === "VIABLE" || rating === "MODERATE") return "#ca8a04";
  return "#64748b";
}

function fmtMw(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)}GW`;
  return `${mw.toFixed(0)}MW`;
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-IN");
}

// ── Types ──────────────────────────────────────────────────────────────────
type ProfileTab = "overview" | "reports" | "activity" | "settings";
type ReportSubTab = "all" | "datacenter" | "airport";

// ── Sub-components ─────────────────────────────────────────────────────────

/** Viewer for the saved HTML/text report (when analysis_json is unavailable) */
function HtmlReportViewer({ report, onClose }: { report: ReportResponse; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: "860px", borderRadius: "4px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f766e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Environmental Assessment Report</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{report.asset_name}</div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => downloadReport(report)}
              style={{ padding: "6px 14px", background: "#0f766e", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", borderRadius: "3px" }}
            >
              Download
            </button>
            <button
              onClick={onClose}
              style={{ padding: "6px 10px", background: "#f1f5f9", color: "#475569", border: "none", fontSize: "18px", fontWeight: 700, cursor: "pointer", borderRadius: "3px", lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        </div>
        <div
          style={{ padding: "32px 40px", fontSize: "14px", lineHeight: 1.7, color: "#374151" }}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: report.html_content || "<p style='color:#94a3b8'>No report content available.</p>" }}
        />
      </div>
    </div>
  );
}

/** Single report card in the Reports grid */
function ReportCard({
  report,
  onView,
  onDelete,
}: {
  report: ReportResponse;
  onView: (r: ReportResponse) => void;
  onDelete: (key: string) => void;
}) {
  const hasScores = report.overall_score != null;
  const hasContent = Boolean(report.html_content) || Boolean(report.analysis_json);

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", borderRadius: "4px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span style={{ fontSize: "14px" }}>{assetIcon(report.asset_type)}</span>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {report.asset_type === "datacenter" ? "Data Center" : report.asset_type === "airport" ? "Airport" : "Custom Site"}
            </span>
          </div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", lineHeight: 1.3, marginBottom: "3px" }}>
            {report.asset_name}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
            {[report.city, report.state].filter(Boolean).join(", ") || `${report.lat.toFixed(2)}°N, ${report.lon.toFixed(2)}°E`}
          </div>
          {report.power_mw != null && (
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
              ⚡ {report.power_mw} MW capacity
            </div>
          )}
        </div>
        <span style={{ padding: "3px 10px", fontSize: "10px", fontWeight: 800, background: ratingColor(report.rating), color: "#fff", flexShrink: 0, borderRadius: "3px" }}>
          {report.rating && report.rating !== "—" ? report.rating : hasScores ? "SCORED" : "GENERATED"}
        </span>
      </div>

      {/* Score bars — only when scores are saved */}
      {hasScores ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
          {([
            { label: "Solar", score: report.solar_score ?? 0, color: "#f59e0b" },
            { label: "Wind", score: report.wind_score ?? 0, color: "#0ea5e9" },
            { label: "Water", score: report.water_score ?? 0, color: "#06b6d4" },
          ] as const).map(({ label, score, color }) => (
            <div key={label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "8px 10px", borderRadius: "3px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontSize: "16px", fontWeight: 800, color, lineHeight: 1 }}>{score > 0 ? score.toFixed(0) : "—"}</div>
              {score > 0 && (
                <div style={{ marginTop: "4px", height: "3px", background: "#e2e8f0", borderRadius: "2px" }}>
                  <div style={{ width: `${Math.min(score, 100)}%`, height: "100%", background: color, borderRadius: "2px" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", padding: "8px 12px", borderRadius: "3px", fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
          RE scores not yet computed — open the RE Assessment to score this site
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "10px", color: "#94a3b8" }}>
          {formatRelativeTime(report.generated_at)}
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          {hasContent && (
            <button
              onClick={() => onView(report)}
              style={{ padding: "5px 10px", background: "#0f766e", color: "#fff", border: "none", fontSize: "11px", fontWeight: 600, cursor: "pointer", borderRadius: "3px" }}
            >
              View
            </button>
          )}
          <button
            onClick={() => downloadReport(report)}
            disabled={!report.html_content}
            style={{ padding: "5px 8px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: 600, cursor: report.html_content ? "pointer" : "not-allowed", borderRadius: "3px", opacity: report.html_content ? 1 : 0.4 }}
            title="Download HTML report"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
          </button>
          <button
            onClick={() => onDelete(report.asset_key)}
            style={{ padding: "5px 8px", background: "#fff", color: "#ef4444", border: "1px solid #fecaca", fontSize: "11px", fontWeight: 600, cursor: "pointer", borderRadius: "3px" }}
            title="Remove report"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [reportSubTab, setReportSubTab] = useState<ReportSubTab>("all");
  const [viewingAssessment, setViewingAssessment] = useState<ReportResponse | null>(null);
  const [viewingHtml, setViewingHtml] = useState<ReportResponse | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [savedAssessments, setSavedAssessments] = useState<ReportResponse[]>([]);
  const [stats, setStats] = useState<AssessmentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const navigate = useNavigate();

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

  // Load saved assessments + stats from DB
  const refreshAssessments = useCallback(() => {
    listSavedAssessments()
      .then(setSavedAssessments)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshAssessments();
  }, [refreshAssessments]);

  useEffect(() => {
    setStatsLoading(true);
    getAssessmentStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [savedAssessments]);

  const handleDeleteAssessment = (assetKey: string) => {
    deleteAssessment(assetKey).then(refreshAssessments).catch(() => {});
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setEditMode(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Derive unique states from saved reports for the filter dropdown
  const uniqueStates = useMemo(() => {
    const s = new Set(savedAssessments.map((r) => r.state).filter(Boolean));
    return Array.from(s).sort();
  }, [savedAssessments]);

  // Filter reports based on sub-tab, search text, and state
  const filteredReports = useMemo(() => {
    return savedAssessments.filter((r) => {
      if (reportSubTab === "datacenter" && r.asset_type !== "datacenter") return false;
      if (reportSubTab === "airport" && r.asset_type !== "airport") return false;
      if (stateFilter && r.state !== stateFilter) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        if (
          !r.asset_name.toLowerCase().includes(q) &&
          !r.city.toLowerCase().includes(q) &&
          !r.state.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [savedAssessments, reportSubTab, searchText, stateFilter]);

  // Dynamic activity derived from saved assessments
  const activityItems = useMemo(() => {
    return savedAssessments.slice(0, 20).map((r) => ({
      id: r.asset_key,
      icon: assetIcon(r.asset_type),
      action: r.overall_score != null ? "Scored & saved report for" : "Generated report for",
      target: r.asset_name,
      location: [r.city, r.state].filter(Boolean).join(", "),
      timestamp: formatRelativeTime(r.generated_at),
      type: r.overall_score != null ? "report" : "analysis",
    }));
  }, [savedAssessments]);

  // Dynamic KPI stats
  const kpiStats = useMemo(() => {
    const total = stats?.total_reports ?? savedAssessments.length;
    const sites = (stats?.datacenters ?? 0) + (stats?.airports ?? 0) || savedAssessments.length;
    const states = stats?.states_covered ?? uniqueStates.length;
    const mw = stats?.total_mw ?? savedAssessments.reduce((sum, r) => sum + (r.power_mw ?? 0), 0);
    return [
      { label: "Reports Generated", value: fmtNum(total), icon: "📋", color: "#2e7d32" },
      { label: "Sites Analysed", value: fmtNum(sites), icon: "📍", color: "#1565c0" },
      { label: "States Covered", value: fmtNum(states), icon: "🗺️", color: "#6a1b9a" },
      { label: "MW Capacity Studied", value: mw > 0 ? fmtMw(mw) : "—", icon: "⚡", color: "#e65100" },
    ];
  }, [stats, savedAssessments, uniqueStates]);

  const tabs: { id: ProfileTab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "👤" },
    { id: "reports", label: "Saved Reports", icon: "📋" },
    { id: "activity", label: "Recent Activity", icon: "🕐" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  // ── Report viewer: analysis charts ────────────────────────────────────────
  if (viewingAssessment) {
    let parsedAnalysis: AnalysisResult | null = null;
    if (viewingAssessment.analysis_json) {
      try {
        parsedAnalysis = JSON.parse(viewingAssessment.analysis_json) as AnalysisResult;
      } catch {
        parsedAnalysis = null;
      }
    }
    if (parsedAnalysis) {
      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
          <SolarWindReport
            analysis={parsedAnalysis}
            live={DEFAULT_LIVE_WEATHER}
            lat={viewingAssessment.lat}
            lng={viewingAssessment.lon}
            datacenter={null}
            onClose={() => setViewingAssessment(null)}
          />
        </div>
      );
    }
    // Fall through to HTML viewer if analysis_json is invalid
    return <HtmlReportViewer report={viewingAssessment} onClose={() => setViewingAssessment(null)} />;
  }

  // Handle view button click: prefer analysis_json, fall back to HTML report viewer
  const handleViewReport = (r: ReportResponse) => {
    if (r.analysis_json) {
      setViewingAssessment(r);
    } else if (r.html_content) {
      setViewingHtml(r);
    } else {
      navigate("/geo-analytics/assessment");
    }
  };

  return (
    <div className="profile-page">
      {/* HTML report overlay */}
      {viewingHtml && <HtmlReportViewer report={viewingHtml} onClose={() => setViewingHtml(null)} />}

      {/* Hero / Cover */}
      <div className="profile-hero">
        <div
          className="profile-hero-cover"
          style={{ background: "linear-gradient(135deg, #1a5e26 0%, #2e7d32 45%, #1b5e20 70%, #4caf50 100%)" }}
        >
          <img
            src="/refex-logo.png"
            alt=""
            aria-hidden="true"
            style={{ position: "absolute", right: "2rem", top: "50%", transform: "translateY(-50%)", height: "48px", opacity: 0.18, filter: "brightness(0) invert(1)", pointerEvents: "none" }}
          />
        </div>
        <div className="profile-hero-body">
          <div className="profile-avatar">
            <div className="profile-avatar-circle" style={{ background: "#2e7d32", color: "#fff", border: "3px solid #fff" }}>
              {USER.avatarInitials}
            </div>
            <div className="profile-avatar-online" />
          </div>
          <div className="profile-hero-info">
            <h1 className="profile-name">{profileForm.name}</h1>
            <p className="profile-role">{profileForm.role}</p>
            <p className="profile-org" style={{ color: "#2e7d32" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              {profileForm.organization}
            </p>
            <p className="profile-location-text">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
              {profileForm.location}
            </p>
          </div>
          <div className="profile-hero-actions">
            <button
              className={`profile-edit-btn${editMode ? " profile-edit-btn--cancel" : ""}`}
              onClick={() => setEditMode((e) => !e)}
              style={editMode ? {} : { background: "#2e7d32", borderColor: "#2e7d32", color: "#fff" }}
            >
              {editMode ? "Cancel" : "Edit Profile"}
            </button>
            {saveSuccess && (
              <span className="profile-save-success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                Saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Stats Bar */}
      <div className="profile-stats-bar">
        {kpiStats.map((s) => (
          <div key={s.label} className="profile-stat">
            <span className="profile-stat-icon">{s.icon}</span>
            <span className="profile-stat-value" style={{ color: statsLoading ? "#cbd5e1" : s.color }}>
              {statsLoading ? "—" : s.value}
            </span>
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
        {/* ── OVERVIEW ── */}
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
                        <input type="text" value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div className="profile-form-field">
                        <label>Role / Title</label>
                        <input type="text" value={profileForm.role} onChange={(e) => setProfileForm((p) => ({ ...p, role: e.target.value }))} />
                      </div>
                    </div>
                    <div className="profile-form-row">
                      <div className="profile-form-field">
                        <label>Organization</label>
                        <input type="text" value={profileForm.organization} onChange={(e) => setProfileForm((p) => ({ ...p, organization: e.target.value }))} />
                      </div>
                      <div className="profile-form-field">
                        <label>Location</label>
                        <input type="text" value={profileForm.location} onChange={(e) => setProfileForm((p) => ({ ...p, location: e.target.value }))} />
                      </div>
                    </div>
                    <div className="profile-form-row">
                      <div className="profile-form-field">
                        <label>Email</label>
                        <input type="email" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} />
                      </div>
                      <div className="profile-form-field">
                        <label>Phone</label>
                        <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
                      </div>
                    </div>
                    <div className="profile-form-field profile-form-field--full">
                      <label>Bio</label>
                      <textarea rows={4} value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="profile-bio">{profileForm.bio}</p>
                    <div className="profile-contact-list">
                      <div className="profile-contact-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                        <span>{profileForm.email}</span>
                      </div>
                      <div className="profile-contact-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.21 12a19.79 19.79 0 01-3.07-8.67A2 2 0 013.12 1.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 8.09a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.02z" /></svg>
                        <span>{profileForm.phone}</span>
                      </div>
                      <div className="profile-contact-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>
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
              {/* Recent Assessment Reports */}
              <div className="profile-card">
                <div className="profile-card-header">
                  <h3>Recent Assessment Reports</h3>
                  <button className="profile-link-btn" onClick={() => setActiveTab("reports")}>View all →</button>
                </div>
                <div className="profile-recent-reports">
                  {savedAssessments.length > 0 ? (
                    savedAssessments.slice(0, 3).map((r) => (
                      <div
                        key={r.asset_key}
                        className="profile-recent-report-item"
                        style={{ cursor: "pointer" }}
                        onClick={() => handleViewReport(r)}
                      >
                        <div className="profile-report-icon">{assetIcon(r.asset_type)}</div>
                        <div className="profile-report-info">
                          <span className="profile-report-title">{r.asset_name}</span>
                          <span className="profile-report-meta">
                            {[r.city, r.state].filter(Boolean).join(", ") || `${r.lat.toFixed(2)}°N, ${r.lon.toFixed(2)}°E`}
                            {" · "}{new Date(r.generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <span style={{ padding: "2px 8px", fontSize: "9px", fontWeight: 800, background: ratingColor(r.rating), color: "#fff", borderRadius: "3px" }}>
                          {r.rating && r.rating !== "—" ? r.rating : r.overall_score != null ? "SCORED" : "GENERATED"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: "center", padding: "24px 16px" }}>
                      <div style={{ fontSize: "28px", marginBottom: "8px" }}>🛰️</div>
                      <div style={{ fontSize: "13px", color: "#475569", fontWeight: 600, marginBottom: "4px" }}>No reports yet</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>Run a RE Site Assessment to get started</div>
                      <button
                        onClick={() => navigate("/geo-analytics/assessment")}
                        style={{ padding: "6px 16px", background: "#0f766e", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", borderRadius: "3px" }}
                      >
                        Go to RE Assessment
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="profile-card">
                <div className="profile-card-header">
                  <h3>Recent Activity</h3>
                  <button className="profile-link-btn" onClick={() => setActiveTab("activity")}>View all →</button>
                </div>
                <div className="profile-activity-mini">
                  {activityItems.length > 0 ? (
                    activityItems.slice(0, 4).map((a) => (
                      <div key={a.id} className="profile-activity-mini-item">
                        <span className="profile-activity-mini-icon">{a.icon}</span>
                        <div>
                          <span>{a.action} </span>
                          <strong>{a.target}</strong>
                          {a.location && <span style={{ color: "#94a3b8", fontSize: "11px" }}> · {a.location}</span>}
                        </div>
                        <span className="profile-activity-time">{a.timestamp}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: "center", padding: "16px", color: "#94a3b8", fontSize: "12px" }}>
                      No activity yet — run your first assessment
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SAVED REPORTS ── */}
        {activeTab === "reports" && (
          <div className="profile-reports-section">
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                  Assessment Reports
                  <span style={{ marginLeft: "8px", background: "#0f766e", color: "#fff", padding: "2px 8px", fontSize: "11px", fontWeight: 700, borderRadius: "3px" }}>
                    {filteredReports.length}
                  </span>
                </h3>
                <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>
                  All reports are persisted in the database — accessible from any device
                </p>
              </div>
              <button
                onClick={() => navigate("/geo-analytics/assessment")}
                style={{ padding: "8px 16px", background: "#0f766e", color: "#fff", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer", borderRadius: "3px" }}
              >
                + Run New Assessment
              </button>
            </div>

            {/* Sub-tabs: All / Data Centers / Airports */}
            <div style={{ display: "flex", gap: "0", marginBottom: "16px", borderBottom: "2px solid #e2e8f0" }}>
              {(["all", "datacenter", "airport"] as const).map((tab) => {
                const label = tab === "all" ? `All (${savedAssessments.length})` : tab === "datacenter" ? `Data Centers (${savedAssessments.filter((r) => r.asset_type === "datacenter").length})` : `Airports (${savedAssessments.filter((r) => r.asset_type === "airport").length})`;
                return (
                  <button
                    key={tab}
                    onClick={() => setReportSubTab(tab)}
                    style={{
                      padding: "10px 18px",
                      border: "none",
                      background: "transparent",
                      fontSize: "13px",
                      fontWeight: reportSubTab === tab ? 700 : 500,
                      color: reportSubTab === tab ? "#0f766e" : "#64748b",
                      borderBottom: reportSubTab === tab ? "2px solid #0f766e" : "2px solid transparent",
                      cursor: "pointer",
                      marginBottom: "-2px",
                    }}
                  >
                    {tab === "all" ? "🗂️ " : tab === "datacenter" ? "🖥️ " : "✈️ "}
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
                <svg style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  type="text"
                  placeholder="Search by name, city, or state..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px 8px 32px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#0f172a", background: "#fff", borderRadius: "3px", boxSizing: "border-box" }}
                />
              </div>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="profile-filter-select"
                style={{ minWidth: "160px" }}
              >
                <option value="">All States</option>
                {uniqueStates.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {(searchText || stateFilter) && (
                <button
                  onClick={() => { setSearchText(""); setStateFilter(""); }}
                  style={{ padding: "8px 12px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", fontSize: "12px", cursor: "pointer", borderRadius: "3px" }}
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Report Cards Grid */}
            {filteredReports.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                {filteredReports.map((r) => (
                  <ReportCard
                    key={r.asset_key}
                    report={r}
                    onView={handleViewReport}
                    onDelete={handleDeleteAssessment}
                  />
                ))}
              </div>
            ) : savedAssessments.length === 0 ? (
              <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", padding: "48px 32px", textAlign: "center", borderRadius: "4px" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🛰️</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>No assessment reports saved yet</div>
                <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>
                  Run a RE Site Assessment on a Data Center or Airport — reports are automatically saved to the database
                </div>
                <button
                  onClick={() => navigate("/geo-analytics/assessment")}
                  style={{ padding: "10px 24px", background: "#0f766e", color: "#fff", border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer", borderRadius: "3px" }}
                >
                  Go to RE Site Assessment
                </button>
              </div>
            ) : (
              <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", padding: "32px", textAlign: "center", borderRadius: "4px" }}>
                <div style={{ fontSize: "14px", color: "#64748b" }}>No reports match your current filters</div>
                <button
                  onClick={() => { setSearchText(""); setStateFilter(""); setReportSubTab("all"); }}
                  style={{ marginTop: "12px", padding: "6px 16px", background: "#0f766e", color: "#fff", border: "none", fontSize: "12px", cursor: "pointer", borderRadius: "3px" }}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITY ── */}
        {activeTab === "activity" && (
          <div className="profile-activity-section">
            <div className="profile-section-header">
              <h3>Recent Activity</h3>
              <select className="profile-filter-select">
                <option>All Activity</option>
                <option>Reports</option>
                <option>Analysis</option>
              </select>
            </div>
            {activityItems.length > 0 ? (
              <div className="profile-activity-timeline">
                {activityItems.map((a, idx) => (
                  <div key={a.id} className="profile-timeline-item">
                    <div className="profile-timeline-icon-wrap">
                      <div className={`profile-timeline-icon profile-timeline-icon--${a.type}`}>
                        {a.icon}
                      </div>
                      {idx < activityItems.length - 1 && <div className="profile-timeline-line" />}
                    </div>
                    <div className="profile-timeline-body">
                      <p>
                        {a.action} <strong>{a.target}</strong>
                        {a.location && <span style={{ color: "#94a3b8", fontWeight: 400 }}> — {a.location}</span>}
                      </p>
                      <span className="profile-timeline-time">{a.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "48px 32px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "4px" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>🕐</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>No activity yet</div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>Your assessment history will appear here</div>
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS ── */}
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
                          onChange={(e) => setNotifications((prev) => ({ ...prev, [n.key]: e.target.checked }))}
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
                    <div><strong>Default Report Format</strong></div>
                    <select className="profile-filter-select">
                      <option>PDF</option>
                      <option>Excel</option>
                      <option>Both</option>
                    </select>
                  </div>
                  <div className="profile-data-option">
                    <div><strong>Auto-save Drafts</strong></div>
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
                    <div><strong>Units System</strong></div>
                    <select className="profile-filter-select">
                      <option>Metric (kWh, MW, km)</option>
                      <option>Imperial</option>
                    </select>
                  </div>
                  <div className="profile-data-option">
                    <div><strong>Currency</strong></div>
                    <select className="profile-filter-select">
                      <option>INR (₹)</option>
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                    </select>
                  </div>
                  <div className="profile-data-option">
                    <div><strong>Default Analysis Type</strong></div>
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
