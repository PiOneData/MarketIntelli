import { useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useInvestmentGuidelines } from "../hooks/usePowerMarket";
import { useAlerts, useNews } from "../hooks/useAlerts";
import PowerTradingPage from "./PowerTradingPage";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import apiClient from "../api/client";

/* ------------------------------------------------------------------ */
/*  Types & static data                                                 */
/* ------------------------------------------------------------------ */

type DocCategory =
  | "green_bond"
  | "ireda_re_finance"
  | "international_finance"
  | "policy_circular"
  | "annual_report";

interface FinanceDoc {
  id: string;
  title: string;
  institution: string;
  category: DocCategory;
  doc_type: "pdf" | "web" | "circular" | "report";
  description: string;
  published_date: string; // ISO date string
  url: string;
  tags: string[];
}

const FINANCE_DOCS: FinanceDoc[] = [
  // Green Bonds / ESG
  {
    id: "gb-001",
    title: "Sovereign Green Bond Framework — India",
    institution: "Ministry of Finance, GoI",
    category: "green_bond",
    doc_type: "pdf",
    description:
      "India's Sovereign Green Bond Framework outlining eligible green project categories, allocation and impact reporting for proceeds raised under sovereign green bonds.",
    published_date: "2022-11-09",
    url: "https://dea.gov.in/sites/default/files/Sovereign%20Green%20Bond%20Framework.pdf",
    tags: ["green bond", "sovereign", "MoF"],
  },
  {
    id: "gb-002",
    title: "Sovereign Green Bond Allocation & Impact Report 2023-24",
    institution: "Ministry of Finance, GoI",
    category: "green_bond",
    doc_type: "report",
    description:
      "Annual allocation and impact report detailing projects funded through India's sovereign green bonds — covers solar, wind, mass transit, and green hydrogen allocations.",
    published_date: "2024-07-15",
    url: "https://dea.gov.in",
    tags: ["green bond", "impact report", "MoF"],
  },
  {
    id: "gb-003",
    title: "SEBI Green Bond Disclosure Norms (Circular)",
    institution: "SEBI",
    category: "green_bond",
    doc_type: "circular",
    description:
      "SEBI circular on disclosure requirements for green debt securities, including eligibility criteria, utilisation reporting, and independent assessment obligations.",
    published_date: "2023-02-06",
    url: "https://www.sebi.gov.in/legal/circulars/feb-2023/business-responsibility-and-sustainability-reporting-by-listed-entities_68507.html",
    tags: ["SEBI", "ESG", "disclosure", "green bond"],
  },
  {
    id: "gb-004",
    title: "RBI Framework for Acceptance of Green Deposits",
    institution: "Reserve Bank of India",
    category: "green_bond",
    doc_type: "circular",
    description:
      "RBI circular mandating regulated entities to disclose use-of-proceeds for green deposits; covers eligible green categories aligned with India's taxonomy.",
    published_date: "2023-04-11",
    url: "https://www.rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx?Id=12511",
    tags: ["RBI", "green deposits", "banking"],
  },

  // IREDA / RE Finance
  {
    id: "ir-001",
    title: "IREDA Annual Report 2023–24",
    institution: "IREDA",
    category: "annual_report",
    doc_type: "pdf",
    description:
      "India's nodal RE lending institution annual report covering loan disbursements, sector-wise portfolio, NPA levels, and upcoming green bond issuances.",
    published_date: "2024-09-10",
    url: "https://www.ireda.in/images/pdf/Annual_Report_2023-24.pdf",
    tags: ["IREDA", "annual report", "RE finance"],
  },
  {
    id: "ir-002",
    title: "IREDA Loan Product Catalogue — Solar & Wind",
    institution: "IREDA",
    category: "ireda_re_finance",
    doc_type: "web",
    description:
      "Comprehensive list of IREDA's loan products for solar, wind, hydro, and emerging RE technologies — covering interest rates, tenure, moratorium, and security requirements.",
    published_date: "2024-01-01",
    url: "https://www.ireda.in/ireda_products.html",
    tags: ["IREDA", "loan", "solar", "wind"],
  },
  {
    id: "ir-003",
    title: "PFC RE Sector Lending Policy 2024",
    institution: "Power Finance Corporation (PFC)",
    category: "ireda_re_finance",
    doc_type: "web",
    description:
      "Updated PFC lending guidelines for renewable energy projects — large-scale solar parks, hybrid RE, green hydrogen electrolyser projects, and transmission infrastructure.",
    published_date: "2024-03-15",
    url: "https://www.pfcindia.com",
    tags: ["PFC", "RE lending", "policy"],
  },
  {
    id: "ir-004",
    title: "REC Limited — Green Bond Prospectus 2024",
    institution: "REC Limited",
    category: "green_bond",
    doc_type: "pdf",
    description:
      "REC Limited green bond offering circular for international investors — USD 500 million 5-year green bond for refinancing RE sector loans.",
    published_date: "2024-04-22",
    url: "https://www.recindia.nic.in",
    tags: ["REC", "green bond", "international"],
  },
  {
    id: "ir-005",
    title: "SBI Green Car Loan & RE Project Finance Scheme",
    institution: "State Bank of India",
    category: "ireda_re_finance",
    doc_type: "web",
    description:
      "SBI's dedicated green finance products including rooftop solar loans, RE project finance for C&I customers, and working capital lines for RE developers.",
    published_date: "2023-10-01",
    url: "https://sbi.co.in",
    tags: ["SBI", "rooftop solar", "green finance"],
  },

  // International Finance
  {
    id: "if-001",
    title: "ADB India Clean Energy Programme — Project Fact Sheet",
    institution: "Asian Development Bank (ADB)",
    category: "international_finance",
    doc_type: "web",
    description:
      "ADB's multi-tranche financing facility for India's clean energy sector — USD 1.5 billion committed for solar parks, transmission, and off-grid RE.",
    published_date: "2023-12-05",
    url: "https://www.adb.org/countries/india/energy",
    tags: ["ADB", "multilateral", "clean energy"],
  },
  {
    id: "if-002",
    title: "World Bank India Renewable Energy Financing Report 2024",
    institution: "World Bank",
    category: "international_finance",
    doc_type: "report",
    description:
      "World Bank assessment of India's RE financing landscape, identifying gaps in long-term debt availability, grid infrastructure investment needs, and blended finance opportunities.",
    published_date: "2024-02-20",
    url: "https://www.worldbank.org/en/country/india/publication/india-energy",
    tags: ["World Bank", "blended finance", "RE"],
  },
  {
    id: "if-003",
    title: "IFC Climate Finance India — FY 2024 Overview",
    institution: "IFC (World Bank Group)",
    category: "international_finance",
    doc_type: "report",
    description:
      "IFC's annual climate finance summary for India covering equity investments, green bonds, and project loans across solar, wind, EV, and green buildings.",
    published_date: "2024-06-30",
    url: "https://www.ifc.org/en/where-we-work/south-asia/india",
    tags: ["IFC", "climate finance", "equity"],
  },
  {
    id: "if-004",
    title: "GCF India Country Programme — Green Climate Fund",
    institution: "Green Climate Fund (GCF)",
    category: "international_finance",
    doc_type: "web",
    description:
      "India's accredited entities and funded activities under the Green Climate Fund — renewable energy, adaptation, and resilience projects approved for India.",
    published_date: "2023-09-15",
    url: "https://www.greenclimate.fund/countries/india",
    tags: ["GCF", "climate finance", "adaptation"],
  },

  // Policy Circulars
  {
    id: "pc-001",
    title: "MNRE Guidelines for RPO & REC Compliance 2024-25",
    institution: "MNRE",
    category: "policy_circular",
    doc_type: "circular",
    description:
      "Updated Renewable Purchase Obligation (RPO) targets and Renewable Energy Certificate (REC) compliance guidelines for FY 2024-25, including solar-specific RPO trajectory.",
    published_date: "2024-04-01",
    url: "https://mnre.gov.in/img/documents/uploads/file_f-1705643148434.pdf",
    tags: ["MNRE", "RPO", "REC", "compliance"],
  },
  {
    id: "pc-002",
    title: "PLI Scheme for High-Efficiency Solar PV Modules — Tranche II",
    institution: "MNRE / MoF",
    category: "policy_circular",
    doc_type: "pdf",
    description:
      "Production Linked Incentive scheme for solar PV modules — Tranche II guidelines covering module efficiency thresholds, incentive slabs, eligible manufacturers, and disbursement schedule.",
    published_date: "2022-09-29",
    url: "https://mnre.gov.in/img/documents/uploads/file_f-1664353584295.pdf",
    tags: ["PLI", "solar", "manufacturing", "MNRE"],
  },
  {
    id: "pc-003",
    title: "CEA Technical Standards for Connectivity of RE Sources 2023",
    institution: "Central Electricity Authority (CEA)",
    category: "policy_circular",
    doc_type: "circular",
    description:
      "CEA updated technical standards for grid connectivity of renewable energy sources — inverter specifications, grid code compliance, and SCADA/metering requirements.",
    published_date: "2023-07-12",
    url: "https://cea.nic.in",
    tags: ["CEA", "grid code", "technical standards"],
  },
  {
    id: "pc-004",
    title: "CERC Green Tariff Regulations 2024",
    institution: "Central Electricity Regulatory Commission (CERC)",
    category: "policy_circular",
    doc_type: "circular",
    description:
      "CERC regulations on green open access charges, banking, and wheeling provisions under Green Energy Open Access Rules, effective from April 2024.",
    published_date: "2024-03-28",
    url: "https://cercind.gov.in",
    tags: ["CERC", "green tariff", "open access"],
  },
];

const CATEGORY_META: Record<DocCategory, { label: string; color: string }> = {
  green_bond: { label: "Green Bond", color: "finint-badge--green-bond" },
  ireda_re_finance: { label: "RE Finance", color: "finint-badge--re-finance" },
  international_finance: { label: "International", color: "finint-badge--international" },
  policy_circular: { label: "Policy Circular", color: "finint-badge--policy" },
  annual_report: { label: "Annual Report", color: "finint-badge--annual" },
};

const DOC_TYPE_ICON: Record<string, string> = {
  pdf: "PDF",
  web: "WEB",
  circular: "CIR",
  report: "RPT",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatPubDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isSpecificPage(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return pathname.length > 1 && pathname !== "/";
  } catch {
    return false;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/* ------------------------------------------------------------------ */
/*  Safe External Link — checks URL before opening; shows in-app error */
/* ------------------------------------------------------------------ */

type LinkState = "idle" | "checking" | "ok" | "broken";

function useLinkChecker() {
  const [states, setStates] = useState<Record<string, LinkState>>({});

  const openSafe = useCallback(
    async (url: string, e: { preventDefault(): void }) => {
      e.preventDefault();

      // Already known broken — show error without re-checking
      if (states[url] === "broken") return;

      setStates((prev: Record<string, LinkState>) => ({ ...prev, [url]: "checking" }));

      try {
        const { data } = await apiClient.get<{ accessible: boolean; status_code: number }>(
          "/finance/check-link",
          { params: { url } },
        );
        if (data.accessible) {
          setStates((prev: Record<string, LinkState>) => ({ ...prev, [url]: "ok" }));
          window.open(url, "_blank", "noopener,noreferrer");
          // Reset to idle after a moment so button reverts
          setTimeout(() => setStates((prev: Record<string, LinkState>) => ({ ...prev, [url]: "idle" })), 2000);
        } else {
          setStates((prev: Record<string, LinkState>) => ({ ...prev, [url]: "broken" }));
        }
      } catch {
        // Network error checking — fall back to just opening
        setStates((prev: Record<string, LinkState>) => ({ ...prev, [url]: "idle" }));
        window.open(url, "_blank", "noopener,noreferrer");
      }
    },
    [states],
  );

  const reset = useCallback((url: string) => {
    setStates((prev: Record<string, LinkState>) => ({ ...prev, [url]: "idle" }));
  }, []);

  return { states, openSafe, reset };
}

interface SafeExternalLinkProps {
  href: string;
  className?: string;
  children: unknown;
  linkState: LinkState;
  onOpen: (url: string, e: { preventDefault(): void }) => void;
}

function SafeExternalLink({ href, className, children, linkState, onOpen }: SafeExternalLinkProps) {
  if (linkState === "broken") {
    return (
      <span
        className={`${className ?? ""} finint-link-broken`}
        title="This resource appears to be unavailable at the linked URL"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
        </svg>
        Resource Unavailable
      </span>
    );
  }

  return (
    <a
      href={href}
      className={`${className ?? ""}${linkState === "checking" ? " finint-link-checking" : ""}`}
      onClick={(e: { preventDefault(): void }) => onOpen(href, e)}
      rel="noopener noreferrer"
    >
      {linkState === "checking" ? (
        <span className="finint-link-spinner" />
      ) : null}
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Broken-link inline notice                                           */
/* ------------------------------------------------------------------ */

function BrokenLinkNotice({ url, onRetry }: { url: string; onRetry: () => void }) {
  return (
    <div className="finint-broken-notice">
      <div className="finint-broken-notice-icon">
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd"/>
        </svg>
      </div>
      <div className="finint-broken-notice-body">
        <strong>Resource not available</strong>
        <p>
          The linked document could not be reached at{" "}
          <span className="finint-broken-domain">{getHostname(url)}</span>.
          It may have moved or been taken offline. Try searching for it
          directly on the institution's website.
        </p>
      </div>
      <button className="finint-broken-retry" onClick={onRetry} title="Try again">
        ↺ Retry
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Finance Intelligence Section                                        */
/* ------------------------------------------------------------------ */

const ALERT_CATEGORY_MAP: Record<string, DocCategory[]> = {
  solar: ["ireda_re_finance", "policy_circular"],
  wind: ["ireda_re_finance", "policy_circular"],
  policy: ["policy_circular", "green_bond"],
  renewable_energy: ["ireda_re_finance", "green_bond", "international_finance"],
  data_center: ["international_finance", "ireda_re_finance"],
};

function FinanceIntelligenceSection() {
  const [activeCategory, setActiveCategory] = useState<DocCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { states: linkStates, openSafe, reset: resetLink } = useLinkChecker();

  // Pull live finance/policy alerts from backend
  const { data: alerts = [] } = useAlerts({ active_only: true });
  // Pull finance-related news
  const { data: financeNews = [] } = useNews({ category: "renewable_energy", limit: 5 });

  // Determine which alert IDs map to our docs
  const alertsByDocCategory = useMemo(() => {
    const map: Record<DocCategory, typeof alerts> = {
      green_bond: [],
      ireda_re_finance: [],
      international_finance: [],
      policy_circular: [],
      annual_report: [],
    };
    alerts.forEach((alert) => {
      const relatedCategories = ALERT_CATEGORY_MAP[alert.alert_type] ?? [];
      relatedCategories.forEach((cat) => {
        if (!map[cat].find((a) => a.id === alert.id)) {
          map[cat].push(alert);
        }
      });
    });
    return map;
  }, [alerts]);

  const filteredDocs = useMemo(() => {
    return FINANCE_DOCS.filter((doc) => {
      const matchCat = activeCategory === "all" || doc.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.institution.toLowerCase().includes(q) ||
        doc.tags.some((t) => t.includes(q)) ||
        doc.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    }).sort(
      (a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
    );
  }, [activeCategory, searchQuery]);

  const allCategories: (DocCategory | "all")[] = [
    "all",
    "green_bond",
    "ireda_re_finance",
    "international_finance",
    "policy_circular",
    "annual_report",
  ];

  return (
    <section className="finint-section">
      <div className="finint-header">
        <div>
          <h3>Finance &amp; Investment Intelligence</h3>
          <p className="finint-desc">
            Curated policy circulars, regulatory guidelines, green bond frameworks, and
            international finance documents — each linked to its authoritative source with
            publication date. Live alerts from the notification engine are surfaced alongside
            relevant documents.
          </p>
        </div>
      </div>

      {/* Live Alerts Banner */}
      {alerts.length > 0 && (
        <div className="finint-alerts-banner">
          <div className="finint-alerts-banner-title">
            <span className="finint-alert-dot" />
            {alerts.length} Active Finance / Policy Alert{alerts.length !== 1 ? "s" : ""}
          </div>
          <div className="finint-alerts-list">
            {alerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className={`finint-alert-item finint-alert--${alert.severity}`}>
                <div className="finint-alert-content">
                  <span className={`finint-alert-severity finint-sev--${alert.severity}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="finint-alert-title">{alert.title}</span>
                  {alert.state && (
                    <span className="finint-alert-state">{alert.state}</span>
                  )}
                </div>
                <span className="finint-alert-date">
                  {new Date(alert.created_at).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + Tabs */}
      <div className="finint-toolbar">
        <div className="finint-search-wrapper">
          <svg className="finint-search-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            className="finint-search-input"
            placeholder="Search documents, institutions, tags…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="finint-search-clear" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>
        <span className="finint-doc-count">{filteredDocs.length} document{filteredDocs.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="finint-category-tabs">
        {allCategories.map((cat) => {
          const meta = cat === "all" ? { label: "All Documents" } : CATEGORY_META[cat];
          const count = cat === "all" ? FINANCE_DOCS.length : FINANCE_DOCS.filter((d) => d.category === cat).length;
          return (
            <button
              key={cat}
              className={`finint-tab ${activeCategory === cat ? "finint-tab--active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {meta.label}
              <span className="finint-tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Document cards */}
      {filteredDocs.length === 0 ? (
        <p className="pol-empty">No documents match the current filters.</p>
      ) : (
        <div className="finint-docs-grid">
          {filteredDocs.map((doc) => {
            const catMeta = CATEGORY_META[doc.category];
            const relatedAlerts = alertsByDocCategory[doc.category] ?? [];
            return (
              <div key={doc.id} className="finint-doc-card">
                {/* Card header */}
                <div className="finint-doc-card-header">
                  <div className="finint-doc-badges">
                    <span className={`finint-badge ${catMeta.color}`}>{catMeta.label}</span>
                    <span className="finint-doc-type-badge">{DOC_TYPE_ICON[doc.doc_type]}</span>
                  </div>
                  <div className="finint-doc-dates">
                    <span className="finint-pub-date" title="Publication date">
                      <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      {formatPubDate(doc.published_date)}
                    </span>
                    <span className="finint-time-ago">{timeAgo(doc.published_date)}</span>
                  </div>
                </div>

                {/* Card body */}
                <div className="finint-doc-institution">{doc.institution}</div>
                <h4 className="finint-doc-title">
                  <SafeExternalLink
                    href={doc.url}
                    linkState={linkStates[doc.url] ?? "idle"}
                    onOpen={openSafe}
                  >
                    {doc.title}
                    <svg viewBox="0 0 20 20" fill="currentColor" width="11" height="11" className="finint-ext-icon">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                  </SafeExternalLink>
                </h4>
                {(linkStates[doc.url] === "broken") && (
                  <BrokenLinkNotice url={doc.url} onRetry={() => resetLink(doc.url)} />
                )}
                <p className="finint-doc-desc">{doc.description}</p>

                {/* Tags */}
                <div className="finint-doc-tags">
                  {doc.tags.map((tag) => (
                    <span key={tag} className="finint-tag">{tag}</span>
                  ))}
                </div>

                {/* Related active alerts */}
                {relatedAlerts.length > 0 && (
                  <div className="finint-related-alerts">
                    <div className="finint-related-alerts-title">
                      <span className="finint-alert-dot finint-alert-dot--sm" />
                      {relatedAlerts.length} related alert{relatedAlerts.length !== 1 ? "s" : ""}
                    </div>
                    {relatedAlerts.slice(0, 2).map((alert) => (
                      <div key={alert.id} className="finint-related-alert-row">
                        <span className={`finint-sev--${alert.severity} finint-sev-inline`}>
                          {alert.severity}
                        </span>
                        <span className="finint-related-alert-text">{alert.title}</span>
                        <span className="finint-related-alert-date">
                          {new Date(alert.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Open link */}
                <div className="finint-doc-footer">
                  <div className="finint-source-info">
                    <span className="finint-source-domain">
                      <svg viewBox="0 0 20 20" fill="currentColor" width="11" height="11">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd"/>
                      </svg>
                      {getHostname(doc.url)}
                    </span>
                    {!isSpecificPage(doc.url) && (
                      <span className="finint-homepage-note" title="This link goes to the institution's homepage">Homepage</span>
                    )}
                  </div>
                  <SafeExternalLink
                    href={doc.url}
                    className="finint-open-btn"
                    linkState={linkStates[doc.url] ?? "idle"}
                    onOpen={openSafe}
                  >
                    {doc.doc_type === "pdf" ? (
                      <>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                        Download PDF ↗
                      </>
                    ) : doc.doc_type === "circular" ? (
                      <>View Circular ↗</>
                    ) : (
                      <>Open Source ↗</>
                    )}
                  </SafeExternalLink>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Finance News sidebar / bottom */}
      {financeNews.length > 0 && (
        <div className="finint-news-strip">
          <div className="finint-news-strip-header">
            <h4 className="finint-news-strip-title">Latest Finance &amp; RE News</h4>
            <span className="finint-news-strip-desc">Live articles from market sources — click to read at original publisher</span>
          </div>
          <div className="finint-news-items">
            {financeNews.map((article) => (
              <div key={article.id} className="finint-news-item">
                <div className="finint-news-item-meta">
                  <span className="finint-news-source">{article.source}</span>
                  <span className="finint-news-date">
                    {article.published_at
                      ? new Date(article.published_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                  {article.url && (
                    <span className="finint-news-domain">
                      {getHostname(article.url)}
                    </span>
                  )}
                </div>
                <div className="finint-news-item-body">
                  <SafeExternalLink
                    href={article.url}
                    className="finint-news-title"
                    linkState={linkStates[article.url] ?? "idle"}
                    onOpen={openSafe}
                  >
                    {article.title}
                  </SafeExternalLink>
                  {(linkStates[article.url] === "broken") && (
                    <BrokenLinkNotice url={article.url} onRetry={() => resetLink(article.url)} />
                  )}
                  {article.summary && (
                    <p className="finint-news-summary">{article.summary}</p>
                  )}
                </div>
                <div className="finint-news-item-footer">
                  <SafeExternalLink
                    href={article.url}
                    className="finint-news-read-btn"
                    linkState={linkStates[article.url] ?? "idle"}
                    onOpen={openSafe}
                  >
                    Read Full Article ↗
                  </SafeExternalLink>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Investment & Finance Section (existing)                             */
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
  const activeSection = section || "finance-intelligence";

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
        {activeSection === "finance-intelligence" && <FinanceIntelligenceSection />}
        {activeSection === "investment-finance" && <InvestmentFinanceSection />}
      </div>
    </div>
  );
}

export default FinancePage;
