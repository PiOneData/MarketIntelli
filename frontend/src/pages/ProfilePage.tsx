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

function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
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
                              <button className="profile-action-icon" title="View Report">
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
