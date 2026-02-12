import { useMemo, useState } from "react";
import StateSelector from "./StateSelector";
import SubstationMap from "./SubstationMap";
import substationData from "../substation.json";

interface Substation {
  name: string;
  sector: string;
  voltageRatio: string;
  agency: string;
  capacityMW: number;
  monthOfCompletion: string;
  yearOfCompletion: string;
  state: string;
}

interface StateStats {
  state: string;
  count: number;
  totalCapacityMW: number;
  agencies: string[];
  sectors: {
    Central: number;
    State: number;
    Private: number;
  };
}

const NON_GEOGRAPHIC = ["Other", "Private", "Central (Multi-State)"];

export default function SubstationView() {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"count" | "capacity">("count");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showList, setShowList] = useState(false);

  const substations = substationData.substations as Substation[];
  const stateStats = substationData.stateStats as StateStats[];

  const allStateNames = useMemo(
    () => stateStats.map((s) => s.state),
    [stateStats]
  );

  const filteredSubstations = useMemo(() => {
    let filtered = substations;

    if (selectedState) {
      filtered = filtered.filter((s) => s.state === selectedState);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.agency.toLowerCase().includes(query) ||
          s.voltageRatio.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [substations, selectedState, searchQuery]);

  const selectedStateStats = useMemo(() => {
    if (!selectedState) return null;
    return stateStats.find((s) => s.state === selectedState) || null;
  }, [stateStats, selectedState]);

  const sortedStateStats = useMemo(() => {
    const sorted = [...stateStats].filter(
      (s) => !NON_GEOGRAPHIC.includes(s.state)
    );
    sorted.sort((a, b) => {
      const valueA = sortBy === "count" ? a.count : a.totalCapacityMW;
      const valueB = sortBy === "count" ? b.count : b.totalCapacityMW;
      return sortOrder === "desc" ? valueB - valueA : valueA - valueB;
    });
    return sorted;
  }, [stateStats, sortBy, sortOrder]);

  const agencyStats = useMemo(() => {
    const agencies: Record<string, { count: number; capacity: number }> = {};
    const subset = selectedState ? filteredSubstations : substations;

    subset.forEach((s) => {
      if (!agencies[s.agency]) {
        agencies[s.agency] = { count: 0, capacity: 0 };
      }
      agencies[s.agency].count++;
      agencies[s.agency].capacity += s.capacityMW;
    });

    return Object.entries(agencies)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredSubstations, substations, selectedState]);

  const toggleSort = (field: "count" | "capacity") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="sub-view">
      {/* Map Section */}
      <div className="sub-view-map-section">
        <div className="sub-map-overlay-tl">
          <StateSelector
            states={allStateNames}
            selectedState={selectedState}
            onSelectState={setSelectedState}
          />
          {selectedState && (
            <button
              className="sub-btn sub-btn--sm sub-btn--outline"
              onClick={() => setSelectedState(null)}
            >
              &times; Clear
            </button>
          )}
        </div>

        <div className="sub-map-overlay-tr">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span>Substation Infrastructure</span>
        </div>

        {selectedState && selectedStateStats && (
          <div className="sub-info-panel">
            <div className="sub-info-panel-title">{selectedState}</div>
            <div className="sub-info-panel-stats">
              <div className="sub-info-panel-row">
                <span className="sub-info-panel-label">Substations:</span>
                <span className="sub-info-panel-value">
                  {selectedStateStats.count}
                </span>
              </div>
              <div className="sub-info-panel-row">
                <span className="sub-info-panel-label">Capacity:</span>
                <span className="sub-info-panel-value">
                  {selectedStateStats.totalCapacityMW >= 1000
                    ? `${(selectedStateStats.totalCapacityMW / 1000).toFixed(1)} GW`
                    : `${selectedStateStats.totalCapacityMW} MW`}
                </span>
              </div>
              <div className="sub-info-panel-row">
                <span className="sub-info-panel-label">Agencies:</span>
                <span className="sub-info-panel-value">
                  {selectedStateStats.agencies.length}
                </span>
              </div>
              <div className="sub-info-panel-badges">
                {selectedStateStats.sectors.Central > 0 && (
                  <span className="sub-badge sub-badge--outline">
                    Central: {selectedStateStats.sectors.Central}
                  </span>
                )}
                {selectedStateStats.sectors.State > 0 && (
                  <span className="sub-badge sub-badge--outline">
                    State: {selectedStateStats.sectors.State}
                  </span>
                )}
                {selectedStateStats.sectors.Private > 0 && (
                  <span className="sub-badge sub-badge--primary">
                    Private: {selectedStateStats.sectors.Private}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="sub-map-container">
          <SubstationMap
            stateStats={stateStats}
            selectedState={selectedState}
            onSelectState={setSelectedState}
          />
        </div>
      </div>

      {/* Two-column grid: Rankings + Agencies */}
      <div className="sub-view-grid">
        {/* States Ranking */}
        <div className="sub-card">
          <div className="sub-card-header">
            <h3>States Ranking</h3>
            <div className="sub-card-header-actions">
              <button
                className={`sub-btn sub-btn--sm ${sortBy === "count" ? "sub-btn--active" : "sub-btn--outline"}`}
                onClick={() => toggleSort("count")}
              >
                Count
                {sortBy === "count" && (
                  <span className="sub-sort-arrow">
                    {sortOrder === "desc" ? " \u25BC" : " \u25B2"}
                  </span>
                )}
              </button>
              <button
                className={`sub-btn sub-btn--sm ${sortBy === "capacity" ? "sub-btn--active" : "sub-btn--outline"}`}
                onClick={() => toggleSort("capacity")}
              >
                Capacity
                {sortBy === "capacity" && (
                  <span className="sub-sort-arrow">
                    {sortOrder === "desc" ? " \u25BC" : " \u25B2"}
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className="sub-card-body">
            <div className="sub-rank-list">
              {sortedStateStats.slice(0, 15).map((stat, index) => {
                const maxCount = sortedStateStats[0]?.count || 1;
                const maxCapacity = sortedStateStats.reduce(
                  (max, s) => Math.max(max, s.totalCapacityMW),
                  1
                );
                const barWidth =
                  sortBy === "count"
                    ? (stat.count / maxCount) * 100
                    : (stat.totalCapacityMW / maxCapacity) * 100;
                const isSelected = selectedState === stat.state;

                return (
                  <div
                    key={stat.state}
                    className={`sub-rank-item ${isSelected ? "sub-rank-item--selected" : ""}`}
                    onClick={() =>
                      setSelectedState(isSelected ? null : stat.state)
                    }
                  >
                    <div
                      className="sub-rank-bar"
                      style={{ width: `${barWidth}%` }}
                    />
                    <div className="sub-rank-content">
                      <div className="sub-rank-left">
                        <span className="sub-rank-number">{index + 1}</span>
                        <span className="sub-rank-name">{stat.state}</span>
                      </div>
                      <span className="sub-badge sub-badge--primary">
                        {sortBy === "count"
                          ? stat.count
                          : stat.totalCapacityMW >= 1000
                            ? `${(stat.totalCapacityMW / 1000).toFixed(1)} GW`
                            : `${stat.totalCapacityMW} MW`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Agencies */}
        <div className="sub-card">
          <div className="sub-card-header">
            <h3>
              Top Agencies
              {selectedState && (
                <span className="sub-card-header-sub">
                  {" "}
                  in {selectedState}
                </span>
              )}
            </h3>
          </div>
          <div className="sub-card-body">
            <div className="sub-agency-list">
              {agencyStats.slice(0, 8).map((agency, index) => (
                <div key={agency.name} className="sub-agency-item">
                  <div className="sub-agency-left">
                    <span className="sub-rank-number">{index + 1}</span>
                    <span className="sub-agency-name">{agency.name}</span>
                  </div>
                  <div className="sub-agency-right">
                    <span className="sub-agency-count">{agency.count}</span>
                    <span className="sub-agency-capacity">
                      (
                      {agency.capacity >= 1000
                        ? `${(agency.capacity / 1000).toFixed(1)}GW`
                        : `${agency.capacity}MW`}
                      )
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Substation List */}
      <div className="sub-card">
        <div className="sub-card-header">
          <h3>
            Substation List
            {selectedState && (
              <span className="sub-card-header-sub">
                {" "}
                - {selectedState}
              </span>
            )}
            <span className="sub-card-header-count">
              ({filteredSubstations.length})
            </span>
          </h3>
          <div className="sub-card-header-actions">
            <div className="sub-search-wrapper">
              <svg
                className="sub-search-icon"
                viewBox="0 0 20 20"
                fill="currentColor"
                width="14"
                height="14"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                type="text"
                className="sub-search-input"
                placeholder="Search substations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="sub-btn sub-btn--sm sub-btn--outline"
              onClick={() => setShowList(!showList)}
            >
              {showList ? "Hide" : "Show"} List
            </button>
          </div>
        </div>
        {showList && (
          <div className="sub-card-body">
            <div className="sub-list-scroll">
              {filteredSubstations.slice(0, 100).map((sub, index) => (
                <div key={`${sub.name}-${index}`} className="sub-list-item">
                  <div className="sub-list-item-left">
                    <div className="sub-list-item-name">{sub.name}</div>
                    <div className="sub-list-item-details">
                      {sub.agency} | {sub.voltageRatio} |{" "}
                      {sub.yearOfCompletion}
                    </div>
                  </div>
                  <div className="sub-list-item-right">
                    <span className="sub-badge sub-badge--outline">
                      {sub.sector}
                    </span>
                    <span className="sub-badge sub-badge--primary">
                      {sub.capacityMW} MW
                    </span>
                  </div>
                </div>
              ))}
              {filteredSubstations.length > 100 && (
                <div className="sub-list-overflow">
                  Showing 100 of {filteredSubstations.length} substations
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
