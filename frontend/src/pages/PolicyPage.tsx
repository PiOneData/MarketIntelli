import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { usePolicies, useTariffs, useSubsidies, useComplianceAlerts } from "../hooks/usePolicy";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function recencyLabel(dateStr: string | null): { text: string; className: string } {
  if (!dateStr) return { text: "Unknown", className: "pol-recency--unknown" };
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 30) return { text: "Recent", className: "pol-recency--recent" };
  if (days < 180) return { text: `${Math.floor(days / 30)}mo ago`, className: "pol-recency--moderate" };
  return { text: `${Math.floor(days / 365)}y ago`, className: "pol-recency--old" };
}

/* ------------------------------------------------------------------ */
/*  Policy Repository Section                                          */
/* ------------------------------------------------------------------ */

function PolicyRepositorySection() {
  const [authorityFilter, setAuthorityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const { data: policies = [], isLoading, error } = usePolicies();

  const authorities = useMemo(
    () => [...new Set(policies.map((p) => p.authority))].sort(),
    [policies]
  );
  const states = useMemo(
    () => [...new Set(policies.filter((p) => p.state).map((p) => p.state!))].sort(),
    [policies]
  );
  const filtered = useMemo(
    () =>
      policies.filter(
        (p) =>
          (!authorityFilter || p.authority === authorityFilter) &&
          (!stateFilter || p.state === stateFilter)
      ),
    [policies, authorityFilter, stateFilter]
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load policies" />;

  return (
    <section className="pol-section">
      <h3>Policy Repository</h3>
      <p className="pol-section-desc">
        Centralized access to MNRE, SECI, SERC, and state-level renewable energy regulations and guidelines.
      </p>
      <div className="pol-data-source" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <span>India sources:</span>
        <a href="https://mnre.gov.in/notifications/" target="_blank" rel="noopener noreferrer" className="pol-link">MNRE</a>
        <span>·</span>
        <a href="https://powermin.gov.in/en/content/acts-rules-regulations" target="_blank" rel="noopener noreferrer" className="pol-link">MoP</a>
        <span>·</span>
        <a href="https://cercind.gov.in/orders.html" target="_blank" rel="noopener noreferrer" className="pol-link">CERC</a>
        <span>·</span>
        <a href="https://mercomindia.com/category/regulation/" target="_blank" rel="noopener noreferrer" className="pol-link">Mercom India (SERC)</a>
        <span>·</span>
        <a href="https://www.seci.co.in/" target="_blank" rel="noopener noreferrer" className="pol-link">SECI</a>
      </div>
      <div className="pm-filters">
        <select value={authorityFilter} onChange={(e) => setAuthorityFilter(e.target.value)}>
          <option value="">All Authorities</option>
          {authorities.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">All States (National)</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="pm-filter-count">{filtered.length} policies</span>
      </div>
      <div className="pol-cards-grid">
        {filtered.map((p) => {
          const recency = recencyLabel(p.effective_date);
          return (
            <div key={p.id} className="pol-card">
              <div className="pol-card-header">
                <span className={`pol-category-badge pol-category-badge--${p.category}`}>
                  {p.category}
                </span>
                <span className={`pol-recency ${recency.className}`}>{recency.text}</span>
              </div>
              <h4>{p.title}</h4>
              <div className="pol-card-meta">
                <span className="pol-authority">{p.authority}</span>
                {p.state && <span className="pol-state">{p.state}</span>}
              </div>
              <p className="pol-summary">{p.summary}</p>
              <div className="pol-card-footer">
                <span className="pol-date">Effective: {formatDate(p.effective_date)}</span>
                {p.document_url && (
                  <a
                    href={p.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pol-link"
                  >
                    View Document
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="pol-empty">No policies match the current filters.</p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Tariff Tracker Section                                             */
/* ------------------------------------------------------------------ */

function TariffTrackerSection() {
  const [stateFilter, setStateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const { data: tariffs = [], isLoading, error } = useTariffs();

  const states = useMemo(
    () => [...new Set(tariffs.map((t) => t.state))].sort(),
    [tariffs]
  );
  const types = useMemo(
    () => [...new Set(tariffs.map((t) => t.tariff_type))].sort(),
    [tariffs]
  );
  const filtered = useMemo(
    () =>
      tariffs.filter(
        (t) =>
          (!stateFilter || t.state === stateFilter) &&
          (!typeFilter || t.tariff_type === typeFilter)
      ),
    [tariffs, stateFilter, typeFilter]
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load tariff data" />;

  return (
    <section className="pol-section">
      <h3>Tariff Tracker</h3>
      <p className="pol-section-desc">
        Historical and current feed-in tariffs, SECI/NTPC auction results, and PPA rates across states.
      </p>
      <div className="pol-data-source">
        Data sources: SECI Auction Results, CERC/SERC Tariff Orders, State DISCOM Auctions
      </div>
      <div className="pm-filters">
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">All States</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>
        <span className="pm-filter-count">{filtered.length} records</span>
      </div>
      <div className="pm-table-wrapper">
        <table className="pm-table">
          <thead>
            <tr>
              <th>State</th>
              <th>Source</th>
              <th>Type</th>
              <th>Rate (INR/kWh)</th>
              <th>Effective</th>
              <th>Expiry</th>
              <th>Recency</th>
              <th>Data Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const recency = recencyLabel(t.effective_date);
              return (
                <tr key={t.id}>
                  <td>{t.state}</td>
                  <td>
                    <span className={`pm-source-badge pm-source-badge--${t.energy_source}`}>
                      {t.energy_source.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td>{t.tariff_type.replace(/_/g, " ")}</td>
                  <td className="pm-num pm-rate">{t.rate_per_kwh.toFixed(2)}</td>
                  <td>{formatDate(t.effective_date)}</td>
                  <td>{formatDate(t.expiry_date)}</td>
                  <td><span className={`pol-recency ${recency.className}`}>{recency.text}</span></td>
                  <td className="pol-source-cell">{t.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="pol-empty">No tariff records match the current filters.</p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Compliance Alerts Section                                          */
/* ------------------------------------------------------------------ */

const DATA_SOURCE_LINKS: Record<string, string> = {
  "MNRE Notifications (PIB)": "https://pib.gov.in/allRel.aspx?regid=3",
  "MoP Gazette (PIB)": "https://pib.gov.in/allRel.aspx?regid=33",
  "CERC/SERC Orders (Mercom India)": "https://mercomindia.com/category/regulation/",
  "Solar Quarter Policy": "https://solarquarter.com/category/india-policy-regulation/",
  "Economic Times Energy": "https://economictimes.indiatimes.com/industry/energy/power",
};

const AUTHORITY_LINKS: Record<string, string> = {
  "MNRE": "https://mnre.gov.in/notifications/",
  "MoP": "https://powermin.gov.in/en/content/acts-rules-regulations",
  "CERC": "https://cercind.gov.in/orders.html",
  "SERC": "https://mercomindia.com/category/regulation/",
  "MNRE/MoP": "https://pib.gov.in/allRel.aspx?regid=3",
  "CERC/SERC": "https://cercind.gov.in/orders.html",
  "SECI": "https://www.seci.co.in/",
  "MoEFCC": "https://moef.gov.in/",
  "RRECL": "https://energy.rajasthan.gov.in/",
  "GEDA": "https://geda.gujarat.gov.in/",
  "KREDL": "https://kredl.karnataka.gov.in/",
  "TEDA": "https://teda.in/",
  "MERC": "https://merc.gov.in/",
  "MoP / DAE": "https://powermin.gov.in/",
  "DAE / NITI Aayog": "https://dae.gov.in/",
  "MoF": "https://www.indiabudget.gov.in/",
};

function ComplianceAlertsSection() {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [authorityFilter, setAuthorityFilter] = useState("");
  const { data: alerts = [], isLoading, error, refetch, dataUpdatedAt } = useComplianceAlerts();

  const categories = useMemo(
    () => [...new Set(alerts.map((a) => a.category))].sort(),
    [alerts]
  );
  const authorities = useMemo(
    () => [...new Set(alerts.map((a) => a.authority))].sort(),
    [alerts]
  );
  const filtered = useMemo(
    () =>
      alerts.filter(
        (a) =>
          (!categoryFilter || a.category === categoryFilter) &&
          (!authorityFilter || a.authority === authorityFilter)
      ),
    [alerts, categoryFilter, authorityFilter]
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load compliance alerts" onRetry={() => refetch()} />;

  return (
    <section className="pol-section">
      <h3>Compliance Alerts</h3>
      <p className="pol-section-desc">
        Track new regulations, amendments, and upcoming compliance deadlines for India renewable energy projects.
        Data refreshed twice daily from official Indian regulatory portals (PIB, CERC, Mercom India).
      </p>

      {/* Real data source links — India regulatory portals */}
      <div className="pol-data-source" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <span>India sources:</span>
        <a href="https://pib.gov.in/allRel.aspx?regid=3" target="_blank" rel="noopener noreferrer" className="pol-link">
          MNRE Notifications (PIB)
        </a>
        <span>·</span>
        <a href="https://pib.gov.in/allRel.aspx?regid=33" target="_blank" rel="noopener noreferrer" className="pol-link">
          MoP Gazette (PIB)
        </a>
        <span>·</span>
        <a href="https://cercind.gov.in/orders.html" target="_blank" rel="noopener noreferrer" className="pol-link">
          CERC Orders
        </a>
        <span>·</span>
        <a href="https://mercomindia.com/category/regulation/" target="_blank" rel="noopener noreferrer" className="pol-link">
          Mercom India Regulation
        </a>
        <span>·</span>
        <a href="https://solarquarter.com/category/india-policy-regulation/" target="_blank" rel="noopener noreferrer" className="pol-link">
          Solar Quarter India Policy
        </a>
        <span>·</span>
        <a href="https://economictimes.indiatimes.com/industry/energy/power" target="_blank" rel="noopener noreferrer" className="pol-link">
          ET Energy (India)
        </a>
        {dataUpdatedAt > 0 && (
          <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--color-gray-400)" }}>
            Last fetched: {new Date(dataUpdatedAt).toLocaleString("en-IN")}
          </span>
        )}
      </div>

      <div className="pm-filters" style={{ marginTop: "0.75rem" }}>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select value={authorityFilter} onChange={(e) => setAuthorityFilter(e.target.value)}>
          <option value="">All Authorities</option>
          {authorities.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <span className="pm-filter-count">{filtered.length} alerts</span>
        <button className="news-clear-btn" onClick={() => refetch()}>
          Refresh Now
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="news-empty">
          <p>No compliance alerts loaded yet. Data is fetched on startup and refreshed every 12 hours.</p>
          <p style={{ fontSize: "0.875rem", color: "var(--color-gray-400)", marginTop: "0.5rem" }}>
            Browse live regulatory updates directly at:
          </p>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            {Object.entries(DATA_SOURCE_LINKS).map(([label, url]) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="pol-link">
                {label}
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div className="pm-table-wrapper">
          <table className="pm-table">
            <thead>
              <tr>
                <th>Regulation / Notification</th>
                <th>Authority</th>
                <th>Data Source</th>
                <th>Category</th>
                <th>Published</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const recency = recencyLabel(a.published_at);
                return (
                  <tr key={a.id}>
                    <td className="pol-title-cell">
                      <strong>{a.title}</strong>
                      {a.summary && (
                        <>
                          <br />
                          <span className="pol-summary-inline">{a.summary.slice(0, 140)}…</span>
                        </>
                      )}
                    </td>
                    <td>
                      {AUTHORITY_LINKS[a.authority] ? (
                        <a href={AUTHORITY_LINKS[a.authority]} target="_blank" rel="noopener noreferrer" className="pol-link">
                          {a.authority}
                        </a>
                      ) : (
                        a.authority
                      )}
                    </td>
                    <td>
                      <span className="pol-data-source-badge">{a.data_source}</span>
                    </td>
                    <td>
                      <span className={`pol-category-badge pol-category-badge--${a.category}`}>
                        {a.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>
                      <div>{formatDate(a.published_at)}</div>
                      <span className={`pol-recency ${recency.className}`}>{recency.text}</span>
                    </td>
                    <td>
                      <a
                        href={a.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pol-link"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Subsidy Monitor Section                                            */
/* ------------------------------------------------------------------ */

function SubsidyMonitorSection() {
  const [stateFilter, setStateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { data: subsidies = [], isLoading, error } = useSubsidies();

  const states = useMemo(
    () => [...new Set(subsidies.filter((s) => s.state).map((s) => s.state!))].sort(),
    [subsidies]
  );
  const statuses = useMemo(
    () => [...new Set(subsidies.map((s) => s.status))].sort(),
    [subsidies]
  );
  const filtered = useMemo(
    () =>
      subsidies.filter(
        (s) =>
          (!stateFilter || s.state === stateFilter) &&
          (!statusFilter || s.status === statusFilter)
      ),
    [subsidies, stateFilter, statusFilter]
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load subsidy data" />;

  return (
    <section className="pol-section">
      <h3>Subsidy Monitor</h3>
      <p className="pol-section-desc">
        Real-time tracking of central and state-level subsidy programs, disbursements, and incentive schemes.
      </p>
      <div className="pol-data-source">
        Data sources: MNRE Scheme Portal, State Nodal Agencies, MoF Notifications
      </div>
      <div className="pm-filters">
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">All States (National)</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="pm-filter-count">{filtered.length} programs</span>
      </div>
      <div className="pol-cards-grid">
        {filtered.map((s) => {
          const recency = recencyLabel(s.disbursement_date);
          return (
            <div key={s.id} className="pol-card">
              <div className="pol-card-header">
                <span className={`pol-status-badge pol-status-badge--${s.status}`}>
                  {s.status}
                </span>
                <span className={`pol-recency ${recency.className}`}>{recency.text}</span>
              </div>
              <h4>{s.name}</h4>
              <div className="pol-card-meta">
                <span className="pol-authority">{s.authority}</span>
                {s.state && <span className="pol-state">{s.state}</span>}
              </div>
              <div className="pol-subsidy-details">
                {s.amount != null && (
                  <div className="pol-subsidy-amount">
                    <span className="pol-detail-label">Amount</span>
                    <span className="pol-detail-value">{s.amount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="pol-subsidy-unit">
                  <span className="pol-detail-label">Unit</span>
                  <span className="pol-detail-value">{s.unit}</span>
                </div>
              </div>
              <div className="pol-card-footer">
                <span className="pol-date">
                  {s.disbursement_date ? `Since: ${formatDate(s.disbursement_date)}` : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="pol-empty">No subsidies match the current filters.</p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Policy Page                                                   */
/* ------------------------------------------------------------------ */

function PolicyPage() {
  const { section } = useParams<{ section: string }>();
  const activeSection = section || "policy-repository";

  return (
    <div className="policy-page">
      <h2>Policy &amp; Regulatory Intelligence</h2>

      {activeSection === "policy-repository" && <PolicyRepositorySection />}
      {activeSection === "tariff-tracker" && <TariffTrackerSection />}
      {activeSection === "compliance-alerts" && <ComplianceAlertsSection />}
      {activeSection === "subsidy-monitor" && <SubsidyMonitorSection />}
    </div>
  );
}

export default PolicyPage;
