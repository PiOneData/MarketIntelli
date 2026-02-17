import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  usePowerMarketOverview,
  useRenewableCapacity,
  usePowerGeneration,
  useTransmissionLines,
  usePowerConsumption,
  useRETariffs,
  useInvestmentGuidelines,
  useDataRepository,
} from "../hooks/usePowerMarket";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function PowerDataPage() {
  const { section } = useParams<{ section: string }>();
  const activeSection = section || "overview";
  const [stateFilter, setStateFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  return (
    <div className="pm-page">
      <header className="pm-header">
        <h2>Power Market Intelligence</h2>
        <p>Comprehensive renewable energy capacity, generation, transmission, and market data across India</p>
      </header>

      <div className="pm-content">
        {activeSection === "overview" && <OverviewSection />}
        {activeSection === "renewable-capacity" && (
          <CapacitySection
            stateFilter={stateFilter}
            setStateFilter={setStateFilter}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
          />
        )}
        {activeSection === "power-generation" && (
          <GenerationSection
            stateFilter={stateFilter}
            setStateFilter={setStateFilter}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
          />
        )}
        {activeSection === "transmission" && <TransmissionSection />}
        {activeSection === "consumption" && (
          <ConsumptionSection
            stateFilter={stateFilter}
            setStateFilter={setStateFilter}
          />
        )}
        {activeSection === "re-tariffs" && <TariffSection />}
        {activeSection === "investment-guidelines" && <InvestmentSection />}
        {activeSection === "data-repository" && <RepositorySection />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview Section                                                   */
/* ------------------------------------------------------------------ */

function OverviewSection() {
  const { data: overview, isLoading, error } = usePowerMarketOverview();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load overview data" />;
  if (!overview) return null;

  const stats = [
    { label: "Total RE Capacity", value: `${formatNumber(overview.total_installed_re_mw)} MW`, accent: true },
    { label: "Solar Installed", value: `${formatNumber(overview.total_solar_mw)} MW` },
    { label: "Wind Installed", value: `${formatNumber(overview.total_wind_mw)} MW` },
    { label: "Small Hydro", value: `${formatNumber(overview.total_small_hydro_mw)} MW` },
    { label: "Biomass", value: `${formatNumber(overview.total_biomass_mw)} MW` },
    { label: "Total RE Generation", value: `${formatNumber(overview.total_generation_mu/10)} MU`, accent: true },
  ];

  return (
    <section id="overview" className="pm-section">
      <h3>Renewable Power Market Overview — {overview.data_year}</h3>
      <div className="pm-stats-grid">
        {stats.map((s) => (
          <div key={s.label} className={`pm-stat-card ${s.accent ? "pm-stat-card--accent" : ""}`}>
            <span className="pm-stat-label">{s.label}</span>
            <span className="pm-stat-value">{s.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Renewable Capacity Section                                         */
/* ------------------------------------------------------------------ */

function CapacitySection({
  stateFilter,
  setStateFilter,
  sourceFilter,
  setSourceFilter,
}: {
  stateFilter: string;
  setStateFilter: (v: string) => void;
  sourceFilter: string;
  setSourceFilter: (v: string) => void;
}) {
  const { data: records = [], isLoading, error } = useRenewableCapacity();

  const states = useMemo(() => [...new Set(records.map((r) => r.state))].sort(), [records]);
  const sources = useMemo(() => [...new Set(records.map((r) => r.energy_source))].sort(), [records]);

  const filtered = useMemo(
    () =>
      records.filter(
        (r) =>
          (!stateFilter || r.state === stateFilter) &&
          (!sourceFilter || r.energy_source === sourceFilter)
      ),
    [records, stateFilter, sourceFilter]
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load capacity data" />;

  return (
    <section id="renewable-capacity" className="pm-section">
      <h3>State-wise Renewable Energy Installed Capacity</h3>
      <div className="pm-filters">
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">All States</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
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
              <th>Installed (MW)</th>
              <th>Available (MW)</th>
              <th>Potential (MW)</th>
              <th>CUF %</th>
              <th>Developer(s)</th>
              <th>PPA Rate (₹/kWh)</th>
              <th>Year</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.state}</td>
                <td>
                  <span className={`pm-source-badge pm-source-badge--${r.energy_source}`}>
                    {r.energy_source}
                  </span>
                </td>
                <td className="pm-num">{formatNumber(r.installed_capacity_mw)}</td>
                <td className="pm-num">{formatNumber(r.available_capacity_mw)}</td>
                <td className="pm-num">{formatNumber(r.potential_capacity_mw)}</td>
                <td className="pm-num">{r.cuf_percent != null ? `${r.cuf_percent}%` : "—"}</td>
                <td className="pm-dev">{r.developer || "—"}</td>
                <td className="pm-num">{r.ppa_rate_per_kwh != null ? `₹${r.ppa_rate_per_kwh}` : "—"}</td>
                <td>{r.data_year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Power Generation Section                                           */
/* ------------------------------------------------------------------ */

function GenerationSection({
  stateFilter,
  setStateFilter,
  sourceFilter,
  setSourceFilter,
}: {
  stateFilter: string;
  setStateFilter: (v: string) => void;
  sourceFilter: string;
  setSourceFilter: (v: string) => void;
}) {
  const { data: records = [], isLoading, error } = usePowerGeneration();

  const states = useMemo(() => [...new Set(records.map((r) => r.state))].sort(), [records]);
  const sources = useMemo(() => [...new Set(records.map((r) => r.energy_source))].sort(), [records]);

  const filtered = useMemo(
    () =>
      records.filter(
        (r) =>
          (!stateFilter || r.state === stateFilter) &&
          (!sourceFilter || r.energy_source === sourceFilter)
      ),
    [records, stateFilter, sourceFilter]
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load generation data" />;

  return (
    <section id="power-generation" className="pm-section">
      <h3>Power Generation by State &amp; Source</h3>
      <div className="pm-filters">
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">All States</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
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
              <th>Generation (MU)</th>
              <th>Period</th>
              <th>PLF %</th>
              <th>Year</th>
              <th>Data Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.state}</td>
                <td>
                  <span className={`pm-source-badge pm-source-badge--${r.energy_source}`}>
                    {r.energy_source}
                  </span>
                </td>
                <td className="pm-num">{formatNumber(r.generation_mu)}</td>
                <td>{r.period_type}</td>
                <td className="pm-num">{r.plant_load_factor != null ? `${r.plant_load_factor}%` : "—"}</td>
                <td>{r.data_year}</td>
                <td>{r.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Transmission Section                                               */
/* ------------------------------------------------------------------ */

function TransmissionSection() {
  const { data: lines = [], isLoading, error } = useTransmissionLines();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load transmission data" />;

  return (
    <section id="transmission" className="pm-section">
      <h3>Transmission Infrastructure for RE Evacuation</h3>
      <div className="pm-table-wrapper">
        <table className="pm-table">
          <thead>
            <tr>
              <th>Corridor Name</th>
              <th>From</th>
              <th>To</th>
              <th>Voltage (kV)</th>
              <th>Length (km)</th>
              <th>Capacity (MW)</th>
              <th>Status</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="pm-corridor-name">{l.name}</td>
                <td>{l.from_state}</td>
                <td>{l.to_state || "—"}</td>
                <td className="pm-num">{l.voltage_kv}</td>
                <td className="pm-num">{formatNumber(l.length_km)}</td>
                <td className="pm-num">{formatNumber(l.capacity_mw)}</td>
                <td>
                  <span className={`pm-status pm-status--${l.status}`}>
                    {l.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td>{l.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Consumption Section                                                */
/* ------------------------------------------------------------------ */

function ConsumptionSection({
  stateFilter,
  setStateFilter,
}: {
  stateFilter: string;
  setStateFilter: (v: string) => void;
}) {
  const { data: records = [], isLoading, error } = usePowerConsumption();

  const states = useMemo(() => [...new Set(records.map((r) => r.state))].sort(), [records]);

  const filtered = useMemo(
    () => records.filter((r) => !stateFilter || r.state === stateFilter),
    [records, stateFilter]
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load consumption data" />;

  return (
    <section id="consumption" className="pm-section">
      <h3>State-wise Power Consumption by Sector</h3>
      <div className="pm-filters">
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">All States</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="pm-filter-count">{filtered.length} records</span>
      </div>
      <div className="pm-table-wrapper">
        <table className="pm-table">
          <thead>
            <tr>
              <th>State</th>
              <th>Sector</th>
              <th>Consumption (MU)</th>
              <th>Peak Demand (MW)</th>
              <th>Year</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.state}</td>
                <td>
                  <span className={`pm-sector-badge pm-sector-badge--${r.sector}`}>
                    {r.sector}
                  </span>
                </td>
                <td className="pm-num">{formatNumber(r.consumption_mu)}</td>
                <td className="pm-num">{formatNumber(r.peak_demand_mw)}</td>
                <td>{r.data_year}</td>
                <td>{r.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Tariff Section                                                     */
/* ------------------------------------------------------------------ */

function TariffSection() {
  const { data: tariffs = [], isLoading, error } = useRETariffs();
  const [tariffTypeFilter, setTariffTypeFilter] = useState("");

  const types = useMemo(() => [...new Set(tariffs.map((t) => t.tariff_type))].sort(), [tariffs]);
  const filtered = useMemo(
    () => tariffs.filter((t) => !tariffTypeFilter || t.tariff_type === tariffTypeFilter),
    [tariffs, tariffTypeFilter]
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load tariff data" />;

  return (
    <section id="re-tariffs" className="pm-section">
      <h3>Renewable Energy Tariffs — SECI Auctions &amp; SERC Orders</h3>
      <div className="pm-filters">
        <select value={tariffTypeFilter} onChange={(e) => setTariffTypeFilter(e.target.value)}>
          <option value="">All Tariff Types</option>
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
              <th>Rate (₹/kWh)</th>
              <th>Grid Tariff (₹/kWh)</th>
              <th>Savings</th>
              <th>Authority</th>
              <th>Tender ID</th>
              <th>Effective</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const savings =
                t.grid_tariff_comparison != null
                  ? ((t.grid_tariff_comparison - t.rate_per_kwh) / t.grid_tariff_comparison) * 100
                  : null;
              return (
                <tr key={t.id}>
                  <td>{t.state}</td>
                  <td>
                    <span className={`pm-source-badge pm-source-badge--${t.energy_source}`}>
                      {t.energy_source}
                    </span>
                  </td>
                  <td>{t.tariff_type.replace(/_/g, " ")}</td>
                  <td className="pm-num pm-rate">₹{t.rate_per_kwh.toFixed(2)}</td>
                  <td className="pm-num">
                    {t.grid_tariff_comparison != null ? `₹${t.grid_tariff_comparison.toFixed(2)}` : "—"}
                  </td>
                  <td className="pm-num">
                    {savings != null ? (
                      <span className="pm-savings">{savings.toFixed(0)}% lower</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{t.ordering_authority}</td>
                  <td>{t.tender_id || "—"}</td>
                  <td>{new Date(t.effective_date).toLocaleDateString("en-IN")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Investment Section                                                 */
/* ------------------------------------------------------------------ */

function InvestmentSection() {
  const { data: guidelines = [], isLoading, error } = useInvestmentGuidelines();
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = useMemo(() => [...new Set(guidelines.map((g) => g.category))].sort(), [guidelines]);
  const filtered = useMemo(
    () => guidelines.filter((g) => !categoryFilter || g.category === categoryFilter),
    [guidelines, categoryFilter]
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load investment guidelines" />;

  return (
    <section id="investment-guidelines" className="pm-section">
      <h3>Investment &amp; Financing Guidelines</h3>
      <div className="pm-filters">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
          ))}
        </select>
        <span className="pm-filter-count">{filtered.length} guidelines</span>
      </div>
      <div className="pm-cards-grid">
        {filtered.map((g) => (
          <div key={g.id} className="pm-invest-card">
            <div className="pm-invest-card-header">
              <span className={`pm-invest-category pm-invest-category--${g.category}`}>
                {g.category.replace(/_/g, " ")}
              </span>
              <span className="pm-invest-institution">{g.institution}</span>
            </div>
            <h4>{g.title}</h4>
            <p className="pm-invest-desc">{g.description}</p>
            <div className="pm-invest-details">
              {g.interest_rate_range && (
                <div className="pm-invest-detail">
                  <span className="pm-invest-detail-label">Interest Rate</span>
                  <span className="pm-invest-detail-value">{g.interest_rate_range}</span>
                </div>
              )}
              {g.max_loan_amount && (
                <div className="pm-invest-detail">
                  <span className="pm-invest-detail-label">Max Amount</span>
                  <span className="pm-invest-detail-value">{g.max_loan_amount}</span>
                </div>
              )}
              {g.tenure_years && (
                <div className="pm-invest-detail">
                  <span className="pm-invest-detail-label">Tenure</span>
                  <span className="pm-invest-detail-value">{g.tenure_years}</span>
                </div>
              )}
            </div>
            {g.eligibility && (
              <div className="pm-invest-eligibility">
                <span className="pm-invest-detail-label">Eligibility</span>
                <p>{g.eligibility}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Data Repository Section                                            */
/* ------------------------------------------------------------------ */

function RepositorySection() {
  const { data: entries = [], isLoading, error } = useDataRepository();
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = useMemo(() => [...new Set(entries.map((e) => e.category))].sort(), [entries]);
  const filtered = useMemo(
    () => entries.filter((e) => !categoryFilter || e.category === categoryFilter),
    [entries, categoryFilter]
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load data repository" />;

  return (
    <section id="data-repository" className="pm-section">
      <h3>Official Data Sources &amp; Repository</h3>
      <div className="pm-filters">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="pm-filter-count">{filtered.length} sources</span>
      </div>
      <div className="pm-cards-grid">
        {filtered.map((entry) => (
          <div key={entry.id} className="pm-repo-card">
            <div className="pm-repo-card-header">
              <span className="pm-repo-category">{entry.category}</span>
              <span className="pm-repo-type">{entry.document_type}</span>
            </div>
            <h4>{entry.title}</h4>
            <p className="pm-repo-org">{entry.organization}</p>
            <p className="pm-repo-desc">{entry.description}</p>
            <div className="pm-repo-footer">
              {entry.last_updated && (
                <span className="pm-repo-updated">Updated: {entry.last_updated}</span>
              )}
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="pm-repo-link"
              >
                Visit Source
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PowerDataPage;
