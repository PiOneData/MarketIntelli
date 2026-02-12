import { STATE_COORDINATES } from "../utils/stateCoordinates";

interface StateSelectorProps {
  states: string[];
  selectedState: string | null;
  onSelectState: (state: string | null) => void;
}

function StateSelector({ states, selectedState, onSelectState }: StateSelectorProps) {
  const geographicStates = states
    .filter((s) => s in STATE_COORDINATES)
    .sort();
  const nonGeographic = states
    .filter((s) => !(s in STATE_COORDINATES))
    .sort();

  return (
    <div className="sub-state-selector">
      <select
        value={selectedState || ""}
        onChange={(e) => onSelectState(e.target.value || null)}
        aria-label="Select a state"
      >
        <option value="">All States</option>
        {geographicStates.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
        {nonGeographic.length > 0 && (
          <optgroup label="Other">
            {nonGeographic.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}

export default StateSelector;
