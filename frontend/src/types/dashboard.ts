export interface InstalledCapacity {
  id: string;
  region: string;
  state: string;
  capacity_mw: number;
  year: number;
  quarter: number;
}

export interface MarketOverview {
  total_capacity_mw: number;
  regional_distribution: InstalledCapacity[];
  upcoming_projects_count: number;
}

export interface FinancialInsight {
  id: string;
  category: string;
  metric_name: string;
  value: number;
  unit: string;
  period: string;
  source: string;
}

export interface PerformanceMetric {
  plant_id: string;
  plant_name: string;
  generation_efficiency: number;
  uptime_percentage: number;
  benchmark_efficiency: number;
}
