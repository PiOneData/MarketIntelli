import { useState } from "react";

interface TabProps {
  tabs: { label: string; key: string }[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

const Tabs = ({ tabs, active, onChange, className = "" }: TabProps) => (
  <div className={`custom-tabs ${className}`}>
    {tabs.map((tab) => (
      <button
        key={tab.key}
        className={`custom-tab${active === tab.key ? " custom-tab--active" : ""}`}
        onClick={() => onChange(tab.key)}
        type="button"
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default Tabs;
