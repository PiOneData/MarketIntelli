export interface Policy {
  id: string;
  title: string;
  authority: string;
  state: string | null;
  category: string;
  summary: string;
  effective_date: string | null;
  document_url: string | null;
}

export interface TariffRecord {
  id: string;
  state: string;
  energy_source: string;
  tariff_type: string;
  rate_per_kwh: number;
  currency: string;
  effective_date: string;
  expiry_date: string | null;
  source: string;
}

export interface Subsidy {
  id: string;
  name: string;
  authority: string;
  state: string | null;
  amount: number | null;
  unit: string;
  status: string;
  disbursement_date: string | null;
}

export interface ComplianceAlert {
  id: string;
  title: string;
  authority: string;
  data_source: string;
  source_name: string;
  source_url: string;
  category: string;
  summary: string | null;
  published_at: string | null;
  scraped_at: string;
  is_active: boolean;
}
