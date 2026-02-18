import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useInvestmentGuidelines } from "../hooks/usePowerMarket";
import PowerTradingPage from "./PowerTradingPage";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/* ------------------------------------------------------------------ */
/*  Investment & Finance Section                                        */
/* ------------------------------------------------------------------ */

function InvestmentFinanceSection() {
  const { data: guidelines = [], isLoading, error } = useInvestmentGuidelines();
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = useMemo(
    () => [...new Set(guidelines.map((g) => g.category))].sort(),
    [guidelines]
  );
  const filtered = useMemo(
    () => guidelines.filter((g) => !categoryFilter || g.category === categoryFilter),
    [guidelines, categoryFilter]
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load investment guidelines" />;

  return (
    <section className="pm-section">
      <h3>Investment &amp; Financing Guidelines</h3>
      <p className="pol-section-desc">
        Financing instruments, loan schemes, and investment frameworks for renewable energy projects
        across India — covering IREDA, SBI, PFC, REC, multilateral agencies, and green bonds.
      </p>
      <div className="pol-data-source">
        Data sources: IREDA, SBI Green Finance, PFC, REC Limited, Ministry of Finance, ADB, World Bank
      </div>
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
                  <span className="pm-invest-detail-value">{formatNumber(parseFloat(g.max_loan_amount))}</span>
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
      {filtered.length === 0 && (
        <p className="pol-empty">No investment guidelines match the current filters.</p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Finance Page                                                   */
/* ------------------------------------------------------------------ */

function FinancePage() {
  const { section } = useParams<{ section: string }>();
  const activeSection = section || "investment-finance";

  if (activeSection === "power-trading") {
    return <PowerTradingPage />;
  }

  return (
    <div className="pm-page">
      <header className="pm-header">
        <h2>Finance &amp; Investment Intelligence</h2>
        <p>Investment frameworks, financing schemes, and power trading data for India's renewable energy sector</p>
      </header>
      <div className="pm-content">
        <InvestmentFinanceSection />
      </div>
    </div>
  );
}

export default FinancePage;
