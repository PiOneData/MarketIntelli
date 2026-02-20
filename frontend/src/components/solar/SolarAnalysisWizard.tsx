import { useState } from "react";
import SolarAssessmentReport, { SiteData } from "./SolarAssessmentReport";

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: "Site Location", description: "Define the geographic location", icon: "📍" },
  { id: 2, title: "Analysis Period", description: "Set the time frame for data analysis", icon: "📅" },
  { id: 3, title: "Site Characteristics", description: "Describe terrain and physical attributes", icon: "🏔️" },
  { id: 4, title: "System Preferences", description: "Configure the solar system parameters", icon: "⚙️" },
  { id: 5, title: "Review & Generate", description: "Confirm inputs and generate report", icon: "✅" },
];

type TerrainType = "flat" | "gentle_slope" | "moderate_slope" | "steep" | "complex";
type OrientationType = "north" | "northeast" | "east" | "southeast" | "south" | "southwest" | "west" | "northwest";
type ModuleType = "monocrystalline" | "polycrystalline" | "bifacial" | "thin_film";
type MountingType = "fixed_tilt" | "single_axis" | "dual_axis" | "rooftop";
type AnalysisType = "feasibility" | "detailed" | "investment" | "environmental";

interface FormData {
  // Step 1: Location
  locationName: string;
  stateName: string;
  latitude: string;
  longitude: string;
  elevation: string;
  // Step 2: Analysis Period
  startDate: string;
  endDate: string;
  analysisType: AnalysisType;
  // Step 3: Site Characteristics
  terrainType: TerrainType;
  slopeAngle: string;
  orientation: OrientationType;
  siteAreaHa: string;
  landUse: string;
  nearestGrid: string;
  // Step 4: System Preferences
  targetCapacityMw: string;
  moduleType: ModuleType;
  mountingType: MountingType;
  tiltAngle: string;
  includeStorage: boolean;
  storageCapacityMwh: string;
}

const INITIAL_FORM: FormData = {
  locationName: "",
  stateName: "",
  latitude: "",
  longitude: "",
  elevation: "",
  startDate: "2023-01-01",
  endDate: "2025-01-01",
  analysisType: "detailed",
  terrainType: "flat",
  slopeAngle: "",
  orientation: "south",
  siteAreaHa: "",
  landUse: "",
  nearestGrid: "",
  targetCapacityMw: "",
  moduleType: "monocrystalline",
  mountingType: "fixed_tilt",
  tiltAngle: "",
  includeStorage: false,
  storageCapacityMwh: "",
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli",
  "Daman and Diu", "Delhi", "Lakshadweep", "Puducherry", "Jammu & Kashmir", "Ladakh",
];

const SAMPLE_LOCATIONS = [
  { name: "Atmakur, Andhra Pradesh", lat: "14.62", lon: "79.67", elev: "121", state: "Andhra Pradesh" },
  { name: "Jodhpur, Rajasthan", lat: "26.29", lon: "73.03", elev: "224", state: "Rajasthan" },
  { name: "Bangalore, Karnataka", lat: "12.97", lon: "77.59", elev: "920", state: "Karnataka" },
  { name: "Jaisalmer, Rajasthan", lat: "26.91", lon: "70.90", elev: "225", state: "Rajasthan" },
];

function StepIndicator({ steps, current }: { steps: WizardStep[]; current: number }) {
  return (
    <div className="wizard-steps">
      {steps.map((step, idx) => {
        const state = step.id < current ? "done" : step.id === current ? "active" : "pending";
        return (
          <div key={step.id} className={`wizard-step wizard-step--${state}`}>
            <div className="wizard-step-bubble">
              {state === "done" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <span>{step.id}</span>
              )}
            </div>
            <div className="wizard-step-label">
              <span className="wizard-step-title">{step.title}</span>
              <span className="wizard-step-desc">{step.description}</span>
            </div>
            {idx < steps.length - 1 && <div className={`wizard-step-connector${state === "done" ? " wizard-step-connector--done" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="wizard-field">
      <label className="wizard-label">
        {label}
        {required && <span className="wizard-required">*</span>}
      </label>
      {children}
      {hint && <span className="wizard-hint">{hint}</span>}
    </div>
  );
}

function Step1Location({
  form,
  onChange,
}: {
  form: FormData;
  onChange: (f: Partial<FormData>) => void;
}) {
  return (
    <div className="wizard-step-content">
      <div className="wizard-step-header">
        <span className="wizard-step-icon">📍</span>
        <div>
          <h2>Site Location</h2>
          <p>Provide the geographic details of the solar site to be analysed</p>
        </div>
      </div>

      {/* Quick fill from samples */}
      <div className="wizard-samples">
        <span className="wizard-samples-label">Quick fill from known sites:</span>
        {SAMPLE_LOCATIONS.map((s) => (
          <button
            key={s.name}
            className="wizard-sample-btn"
            onClick={() =>
              onChange({
                locationName: s.name.split(",")[0],
                stateName: s.state,
                latitude: s.lat,
                longitude: s.lon,
                elevation: s.elev,
              })
            }
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="wizard-form-grid">
        <FormField label="Site / Location Name" required hint="Name of the village, town or landmark">
          <input
            className="wizard-input"
            type="text"
            placeholder="e.g. Atmakur Solar Farm"
            value={form.locationName}
            onChange={(e) => onChange({ locationName: e.target.value })}
          />
        </FormField>

        <FormField label="State" required>
          <select
            className="wizard-select"
            value={form.stateName}
            onChange={(e) => onChange({ stateName: e.target.value })}
          >
            <option value="">Select state…</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Latitude (°N)" required hint="Decimal degrees, e.g. 14.62">
          <input
            className="wizard-input"
            type="number"
            step="0.001"
            min="-90"
            max="90"
            placeholder="e.g. 14.62"
            value={form.latitude}
            onChange={(e) => onChange({ latitude: e.target.value })}
          />
        </FormField>

        <FormField label="Longitude (°E)" required hint="Decimal degrees, e.g. 79.67">
          <input
            className="wizard-input"
            type="number"
            step="0.001"
            min="-180"
            max="180"
            placeholder="e.g. 79.67"
            value={form.longitude}
            onChange={(e) => onChange({ longitude: e.target.value })}
          />
        </FormField>

        <FormField label="Elevation (m ASL)" hint="Above sea level in metres">
          <input
            className="wizard-input"
            type="number"
            min="0"
            max="9000"
            placeholder="e.g. 121"
            value={form.elevation}
            onChange={(e) => onChange({ elevation: e.target.value })}
          />
        </FormField>
      </div>

      {form.latitude && form.longitude && (
        <div className="wizard-map-preview">
          <div className="wizard-map-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <p>
              <strong>{form.locationName || "Selected Site"}</strong>
              <br />
              {form.latitude}°N, {form.longitude}°E
              {form.elevation && ` · ${form.elevation}m ASL`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Step2Period({
  form,
  onChange,
}: {
  form: FormData;
  onChange: (f: Partial<FormData>) => void;
}) {
  const analysisTypes: { id: AnalysisType; label: string; desc: string; icon: string }[] = [
    { id: "feasibility", label: "Feasibility Study", desc: "Quick overview for go/no-go decision", icon: "🔍" },
    { id: "detailed", label: "Detailed Assessment", desc: "Full technical & environmental analysis", icon: "📊" },
    { id: "investment", label: "Investment Grade", desc: "Bankable report for financial due diligence", icon: "💰" },
    { id: "environmental", label: "Environmental Impact", desc: "Focused on ecological and environmental factors", icon: "🌿" },
  ];

  return (
    <div className="wizard-step-content">
      <div className="wizard-step-header">
        <span className="wizard-step-icon">📅</span>
        <div>
          <h2>Analysis Period & Type</h2>
          <p>Define the time frame and scope of the solar resource assessment</p>
        </div>
      </div>

      <div className="wizard-form-grid">
        <FormField label="Start Date" required hint="Beginning of the analysis period">
          <input
            className="wizard-input"
            type="date"
            value={form.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
          />
        </FormField>
        <FormField label="End Date" required hint="End of the analysis period">
          <input
            className="wizard-input"
            type="date"
            value={form.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
          />
        </FormField>
      </div>

      {form.startDate && form.endDate && (
        <div className="wizard-period-summary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          Analysis span: <strong>
            {Math.round(
              (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) /
                (1000 * 60 * 60 * 24 * 365.25) *
                10
            ) / 10} years
          </strong>
          {" "}({new Date(form.startDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} – {new Date(form.endDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })})
        </div>
      )}

      <div className="wizard-field">
        <label className="wizard-label">Analysis Type<span className="wizard-required">*</span></label>
        <div className="wizard-analysis-types">
          {analysisTypes.map((t) => (
            <button
              key={t.id}
              className={`wizard-type-card${form.analysisType === t.id ? " wizard-type-card--active" : ""}`}
              onClick={() => onChange({ analysisType: t.id })}
            >
              <span className="wizard-type-icon">{t.icon}</span>
              <strong>{t.label}</strong>
              <span>{t.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step3Site({
  form,
  onChange,
}: {
  form: FormData;
  onChange: (f: Partial<FormData>) => void;
}) {
  const terrainOptions: { id: TerrainType; label: string; icon: string }[] = [
    { id: "flat", label: "Flat / Level", icon: "⬛" },
    { id: "gentle_slope", label: "Gentle Slope (< 5°)", icon: "📐" },
    { id: "moderate_slope", label: "Moderate Slope (5–15°)", icon: "📏" },
    { id: "steep", label: "Steep (> 15°)", icon: "⛰️" },
    { id: "complex", label: "Complex / Undulating", icon: "🗺️" },
  ];

  const orientations: { id: OrientationType; label: string }[] = [
    { id: "north", label: "North" },
    { id: "northeast", label: "NE" },
    { id: "east", label: "East" },
    { id: "southeast", label: "SE" },
    { id: "south", label: "South" },
    { id: "southwest", label: "SW" },
    { id: "west", label: "West" },
    { id: "northwest", label: "NW" },
  ];

  return (
    <div className="wizard-step-content">
      <div className="wizard-step-header">
        <span className="wizard-step-icon">🏔️</span>
        <div>
          <h2>Site Characteristics</h2>
          <p>Describe the physical and land-use attributes of the site</p>
        </div>
      </div>

      <div className="wizard-field">
        <label className="wizard-label">Terrain Type<span className="wizard-required">*</span></label>
        <div className="wizard-terrain-options">
          {terrainOptions.map((t) => (
            <button
              key={t.id}
              className={`wizard-terrain-btn${form.terrainType === t.id ? " wizard-terrain-btn--active" : ""}`}
              onClick={() => onChange({ terrainType: t.id })}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="wizard-form-grid">
        <FormField label="Average Slope Angle (°)" hint="Leave blank if flat">
          <input
            className="wizard-input"
            type="number"
            min="0"
            max="90"
            step="0.5"
            placeholder="e.g. 2.5"
            value={form.slopeAngle}
            onChange={(e) => onChange({ slopeAngle: e.target.value })}
          />
        </FormField>

        <FormField label="Primary Orientation (Aspect)" required>
          <div className="wizard-orientation-grid">
            {orientations.map((o) => (
              <button
                key={o.id}
                className={`wizard-orient-btn${form.orientation === o.id ? " wizard-orient-btn--active" : ""}`}
                onClick={() => onChange({ orientation: o.id })}
              >
                {o.label}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Site Area (hectares)" hint="Total available land area">
          <input
            className="wizard-input"
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 50"
            value={form.siteAreaHa}
            onChange={(e) => onChange({ siteAreaHa: e.target.value })}
          />
        </FormField>

        <FormField label="Current Land Use" hint="e.g. Agricultural, Barren, Industrial">
          <input
            className="wizard-input"
            type="text"
            placeholder="e.g. Agricultural farmland"
            value={form.landUse}
            onChange={(e) => onChange({ landUse: e.target.value })}
          />
        </FormField>

        <FormField label="Distance to Nearest Grid Point (km)" hint="Approximate distance to existing substation/line">
          <input
            className="wizard-input"
            type="number"
            min="0"
            step="0.1"
            placeholder="e.g. 3.5"
            value={form.nearestGrid}
            onChange={(e) => onChange({ nearestGrid: e.target.value })}
          />
        </FormField>
      </div>
    </div>
  );
}

function Step4System({
  form,
  onChange,
}: {
  form: FormData;
  onChange: (f: Partial<FormData>) => void;
}) {
  const moduleTypes: { id: ModuleType; label: string; desc: string; eff: string }[] = [
    { id: "monocrystalline", label: "Monocrystalline", desc: "High efficiency, lower temp coefficient", eff: "20–24%" },
    { id: "polycrystalline", label: "Polycrystalline", desc: "Cost-effective, mature technology", eff: "16–20%" },
    { id: "bifacial", label: "Bifacial", desc: "Captures rear-side irradiance", eff: "21–25%" },
    { id: "thin_film", label: "Thin Film", desc: "Better performance in diffuse light", eff: "13–18%" },
  ];

  const mountingTypes: { id: MountingType; label: string; desc: string; icon: string }[] = [
    { id: "fixed_tilt", label: "Fixed Tilt", desc: "Low cost, optimal for stable irradiance", icon: "📐" },
    { id: "single_axis", label: "Single-Axis Tracker", desc: "+15–25% yield vs fixed", icon: "🔄" },
    { id: "dual_axis", label: "Dual-Axis Tracker", desc: "Maximum yield, highest cost", icon: "🎯" },
    { id: "rooftop", label: "Rooftop / BAPV", desc: "Building-attached systems", icon: "🏠" },
  ];

  return (
    <div className="wizard-step-content">
      <div className="wizard-step-header">
        <span className="wizard-step-icon">⚙️</span>
        <div>
          <h2>System Preferences</h2>
          <p>Configure the solar PV system parameters for the analysis</p>
        </div>
      </div>

      <div className="wizard-form-grid wizard-form-grid--single">
        <FormField label="Target System Capacity (MWp)" hint="Desired installed DC capacity in megawatt-peak">
          <input
            className="wizard-input"
            type="number"
            min="0.01"
            step="0.5"
            placeholder="e.g. 100"
            value={form.targetCapacityMw}
            onChange={(e) => onChange({ targetCapacityMw: e.target.value })}
          />
        </FormField>
      </div>

      <div className="wizard-field">
        <label className="wizard-label">Module Technology<span className="wizard-required">*</span></label>
        <div className="wizard-module-grid">
          {moduleTypes.map((m) => (
            <button
              key={m.id}
              className={`wizard-module-card${form.moduleType === m.id ? " wizard-module-card--active" : ""}`}
              onClick={() => onChange({ moduleType: m.id })}
            >
              <strong>{m.label}</strong>
              <span>{m.desc}</span>
              <span className="wizard-module-eff">{m.eff} efficiency</span>
            </button>
          ))}
        </div>
      </div>

      <div className="wizard-field">
        <label className="wizard-label">Mounting System<span className="wizard-required">*</span></label>
        <div className="wizard-mounting-grid">
          {mountingTypes.map((m) => (
            <button
              key={m.id}
              className={`wizard-mounting-btn${form.mountingType === m.id ? " wizard-mounting-btn--active" : ""}`}
              onClick={() => onChange({ mountingType: m.id })}
            >
              <span className="wizard-mounting-icon">{m.icon}</span>
              <strong>{m.label}</strong>
              <span>{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="wizard-form-grid">
        {form.mountingType === "fixed_tilt" && (
          <FormField label="Tilt Angle (°)" hint="Recommended: 15° (approximately equal to latitude)">
            <input
              className="wizard-input"
              type="number"
              min="0"
              max="90"
              step="1"
              placeholder="e.g. 15"
              value={form.tiltAngle}
              onChange={(e) => onChange({ tiltAngle: e.target.value })}
            />
          </FormField>
        )}
      </div>

      <div className="wizard-storage-toggle">
        <label className="wizard-toggle-label">
          <input
            type="checkbox"
            checked={form.includeStorage}
            onChange={(e) => onChange({ includeStorage: e.target.checked })}
          />
          <span className="wizard-toggle-track">
            <span className="wizard-toggle-thumb" />
          </span>
          Include Battery Energy Storage System (BESS)
        </label>
        {form.includeStorage && (
          <FormField label="BESS Capacity (MWh)" hint="Usable energy storage capacity">
            <input
              className="wizard-input"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 50"
              value={form.storageCapacityMwh}
              onChange={(e) => onChange({ storageCapacityMwh: e.target.value })}
            />
          </FormField>
        )}
      </div>
    </div>
  );
}

function Step5Review({ form, onGenerate }: { form: FormData; onGenerate: () => void }) {
  const isValid = form.locationName && form.stateName && form.latitude && form.longitude;

  const ReviewRow = ({ label, value }: { label: string; value: string }) => (
    <div className="wizard-review-row">
      <span className="wizard-review-label">{label}</span>
      <span className="wizard-review-value">{value || "—"}</span>
    </div>
  );

  return (
    <div className="wizard-step-content">
      <div className="wizard-step-header">
        <span className="wizard-step-icon">✅</span>
        <div>
          <h2>Review & Generate Report</h2>
          <p>Confirm all inputs before generating the solar assessment report</p>
        </div>
      </div>

      <div className="wizard-review-grid">
        <div className="wizard-review-section">
          <h4>📍 Site Location</h4>
          <ReviewRow label="Location Name" value={form.locationName} />
          <ReviewRow label="State" value={form.stateName} />
          <ReviewRow label="Coordinates" value={form.latitude && form.longitude ? `${form.latitude}°N, ${form.longitude}°E` : ""} />
          <ReviewRow label="Elevation" value={form.elevation ? `${form.elevation}m ASL` : ""} />
        </div>

        <div className="wizard-review-section">
          <h4>📅 Analysis Period</h4>
          <ReviewRow label="Start Date" value={form.startDate ? new Date(form.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""} />
          <ReviewRow label="End Date" value={form.endDate ? new Date(form.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""} />
          <ReviewRow label="Analysis Type" value={form.analysisType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} />
        </div>

        <div className="wizard-review-section">
          <h4>🏔️ Site Characteristics</h4>
          <ReviewRow label="Terrain Type" value={form.terrainType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} />
          <ReviewRow label="Slope Angle" value={form.slopeAngle ? `${form.slopeAngle}°` : "Not specified"} />
          <ReviewRow label="Orientation" value={form.orientation.replace(/\b\w/g, (c) => c.toUpperCase())} />
          <ReviewRow label="Site Area" value={form.siteAreaHa ? `${form.siteAreaHa} ha` : "Not specified"} />
          <ReviewRow label="Grid Distance" value={form.nearestGrid ? `${form.nearestGrid} km` : "Not specified"} />
        </div>

        <div className="wizard-review-section">
          <h4>⚙️ System Configuration</h4>
          <ReviewRow label="Target Capacity" value={form.targetCapacityMw ? `${form.targetCapacityMw} MWp` : "Not specified"} />
          <ReviewRow label="Module Type" value={form.moduleType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} />
          <ReviewRow label="Mounting Type" value={form.mountingType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} />
          {form.mountingType === "fixed_tilt" && <ReviewRow label="Tilt Angle" value={form.tiltAngle ? `${form.tiltAngle}°` : "Not specified"} />}
          <ReviewRow label="BESS" value={form.includeStorage ? `Yes — ${form.storageCapacityMwh || "TBD"} MWh` : "Not included"} />
        </div>
      </div>

      {!isValid && (
        <div className="wizard-validation-warn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Please complete required fields: Location Name, State, Latitude, and Longitude.
        </div>
      )}

      <div className="wizard-generate-section">
        <div className="wizard-generate-info">
          <h4>What will be generated?</h4>
          <ul>
            <li>Full solar resource assessment with irradiance profiles</li>
            <li>Environmental challenge analysis and mitigation strategies</li>
            <li>Seasonal performance modeling across all four seasons</li>
            <li>25-year degradation and longevity projections</li>
            <li>System design recommendations tailored to site</li>
            <li>Risk assessment matrix with severity ratings</li>
            <li>Economic performance indicators and yield scenarios</li>
          </ul>
        </div>
        <button
          className="wizard-generate-btn"
          onClick={onGenerate}
          disabled={!isValid}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
          </svg>
          Generate Assessment Report
        </button>
      </div>
    </div>
  );
}

function SolarAnalysisWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [showReport, setShowReport] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = (partial: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowReport(true);
    }, 2000);
  };

  const handleCloseReport = () => {
    setShowReport(false);
  };

  const handleRestart = () => {
    setShowReport(false);
    setCurrentStep(1);
    setForm(INITIAL_FORM);
  };

  // Build site data from form (with defaults for demo)
  const siteData: SiteData = {
    location: form.locationName || "Atmakur",
    coordinates: form.latitude && form.longitude ? `${form.latitude}°N, ${form.longitude}°E` : "14° 37' N, 79° 40' E",
    state: form.stateName || "Andhra Pradesh",
    analysisPeriod: form.startDate && form.endDate
      ? `${new Date(form.startDate).toLocaleDateString("en-IN", { month: "long", year: "numeric" })} – ${new Date(form.endDate).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`
      : "January 2023 – January 2025 (2 years)",
    elevation: form.elevation ? `${form.elevation}m ASL` : "121m ASL",
    terrain: form.terrainType === "flat"
      ? `Nearly flat (${form.slopeAngle || "2.5"}° slope), ${form.orientation}-facing orientation`
      : `${form.terrainType.replace(/_/g, " ")} (${form.slopeAngle || ""}° slope), ${form.orientation}-facing`,
    overallRating: "HIGHLY SUITABLE",
    irradiance: 1916,
    dailyAvg: 5.25,
    cloudCover: 56,
    maxTemp: 46.3,
    avgTemp: 28.6,
    aod: 0.513,
    meanWindSpeed: 3.07,
    maxWindSpeed: 9.55,
    annualRainfall: 818,
    humidity: 63,
    degradationRate: 0.5,
    yieldConservative: 1650,
    yieldExpected: 1750,
    yieldOptimistic: 1850,
  };

  if (showReport) {
    return (
      <div className="wizard-report-view">
        <div className="wizard-report-topbar">
          <button className="wizard-back-to-wizard" onClick={handleCloseReport}>
            ← Back to Wizard
          </button>
          <button className="wizard-restart-btn" onClick={handleRestart}>
            New Analysis
          </button>
        </div>
        <SolarAssessmentReport
          site={siteData}
          onClose={handleCloseReport}
          onDownload={() => window.print()}
        />
      </div>
    );
  }

  return (
    <div className="wizard-root">
      {/* Wizard Header */}
      <div className="wizard-header">
        <div className="wizard-header-left">
          <div className="wizard-header-icon">🌞</div>
          <div>
            <h1>Solar Site Analysis Wizard</h1>
            <p>Generate a comprehensive solar assessment report in 5 steps</p>
          </div>
        </div>
        <div className="wizard-header-right">
          <span className="wizard-step-counter">Step {currentStep} of {WIZARD_STEPS.length}</span>
        </div>
      </div>

      {/* Step Indicators */}
      <StepIndicator steps={WIZARD_STEPS} current={currentStep} />

      {/* Step Content */}
      <div className="wizard-card">
        {currentStep === 1 && <Step1Location form={form} onChange={handleChange} />}
        {currentStep === 2 && <Step2Period form={form} onChange={handleChange} />}
        {currentStep === 3 && <Step3Site form={form} onChange={handleChange} />}
        {currentStep === 4 && <Step4System form={form} onChange={handleChange} />}
        {currentStep === 5 && (
          isGenerating ? (
            <div className="wizard-generating">
              <div className="wizard-generating-animation">
                <div className="wizard-sun-spin">☀️</div>
                <h3>Generating Assessment Report…</h3>
                <p>Analysing solar resource data, environmental parameters, and system configurations</p>
                <div className="wizard-progress-bar">
                  <div className="wizard-progress-fill" />
                </div>
              </div>
            </div>
          ) : (
            <Step5Review form={form} onGenerate={handleGenerate} />
          )
        )}
      </div>

      {/* Navigation */}
      {!isGenerating && (
        <div className="wizard-nav">
          <button
            className="wizard-btn wizard-btn--secondary"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            ← Back
          </button>
          <div className="wizard-nav-dots">
            {WIZARD_STEPS.map((s) => (
              <div
                key={s.id}
                className={`wizard-nav-dot${s.id === currentStep ? " wizard-nav-dot--active" : s.id < currentStep ? " wizard-nav-dot--done" : ""}`}
              />
            ))}
          </div>
          {currentStep < WIZARD_STEPS.length ? (
            <button className="wizard-btn wizard-btn--primary" onClick={handleNext}>
              Next →
            </button>
          ) : (
            <div style={{ width: 100 }} />
          )}
        </div>
      )}
    </div>
  );
}

export default SolarAnalysisWizard;
