import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { usePolicies, useTariffs, useSubsidies } from "../hooks/usePolicy";
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
      <div className="pol-data-source">
        Data sources: MNRE, MoP, CERC, SERC, State Nodal Agencies
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

function ComplianceAlertsSection() {
  const [categoryFilter, setCategoryFilter] = useState("");
  const { data: policies = [], isLoading, error } = usePolicies();

  const categories = useMemo(
    () => [...new Set(policies.map((p) => p.category))].sort(),
    [policies]
  );
  const filtered = useMemo(
    () =>
      policies
        .filter((p) => !categoryFilter || p.category === categoryFilter)
        .sort((a, b) => {
          const da = a.effective_date ? new Date(a.effective_date).getTime() : 0;
          const db = b.effective_date ? new Date(b.effective_date).getTime() : 0;
          return db - da;
        }),
    [policies, categoryFilter]
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load compliance data" />;

  return (
    <section className="pol-section">
      <h3>Compliance Alerts</h3>
      <p className="pol-section-desc">
        Track new regulations, amendments, and upcoming compliance deadlines for renewable energy projects.
      </p>
      <div className="pol-data-source">
        Data sources: MNRE Notifications, MoP Gazette, CERC/SERC Orders
      </div>
      <div className="pm-filters">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="pm-filter-count">{filtered.length} items</span>
      </div>
      <div className="pm-table-wrapper">
        <table className="pm-table">
          <thead>
            <tr>
              <th>Policy / Regulation</th>
              <th>Authority</th>
              <th>Category</th>
              <th>Scope</th>
              <th>Effective Date</th>
              <th>Recency</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const recency = recencyLabel(p.effective_date);
              return (
                <tr key={p.id}>
                  <td className="pol-title-cell">
                    <strong>{p.title}</strong>
                    <br />
                    <span className="pol-summary-inline">{p.summary.slice(0, 120)}...</span>
                  </td>
                  <td>{p.authority}</td>
                  <td>
                    <span className={`pol-category-badge pol-category-badge--${p.category}`}>
                      {p.category}
                    </span>
                  </td>
                  <td>{p.state || "National"}</td>
                  <td>{formatDate(p.effective_date)}</td>
                  <td><span className={`pol-recency ${recency.className}`}>{recency.text}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="pol-empty">No compliance items match the current filters.</p>
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
