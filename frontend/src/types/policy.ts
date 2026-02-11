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
