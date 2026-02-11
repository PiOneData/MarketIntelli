export interface SolarProject {
  id: string;
  name: string;
  state: string;
  capacity_mw: number;
  status: string;
  developer_id: string | null;
  commissioning_date: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Developer {
  id: string;
  name: string;
  headquarters: string;
  total_capacity_mw: number;
  risk_score: number;
  projects_completed: number;
}

export interface Tender {
  id: string;
  title: string;
  issuing_authority: string;
  state: string;
  capacity_mw: number;
  status: string;
  deadline: string | null;
  awarded_to: string | null;
  winning_tariff: number | null;
}
