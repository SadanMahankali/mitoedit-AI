export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export type Region = {
  name: string;
  disease: string;
  position: number;
  wt: string;
  edit: string;
};

export type Design = {
  spacer: string;
  pam: string;
  pegrna_3p: string;
  target_locus: string;
  edit_position: number;
};

export type Prediction = {
  on_target: number;
  off_target_risk: number;
  gc_content: number;
  pbs_tm: number;
  spacer_len: number;
  pegrna_3p_len: number;
};

export type Dose = { time: number; amount: number };

export type SimResult = {
  t: number[];
  dox: number[];
  mrna: number[];
  rnp_cyto: number[];
  rnp_mito: number[];
  edited_fraction: number[];
  pathogenic_heteroplasmy: number[];
  toxicity: number[];
  dox_auc: number;
  final_edited: number;
  final_pathogenic: number;
  therapeutic_threshold_h: number | null;
};

export type OptResult = {
  best_params: Record<string, number>;
  best_value: number;
  best_simulation: SimResult;
  best_doses: Dose[];
  history: {
    trial: number;
    n_doses: number;
    interval_h: number;
    bolus: number;
    start_h: number;
    final_pathogenic: number;
    dox_auc: number;
    rescue_h: number;
    objective: number;
  }[];
};

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${txt}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  regions: () => jsonFetch<{ regions: Region[] }>("/regions"),
  design: (name: string) =>
    jsonFetch<Design>(`/design/${encodeURIComponent(name)}`),
  predict: (spacer: string, pegrna_3p: string) =>
    jsonFetch<Prediction>("/predict", {
      method: "POST",
      body: JSON.stringify({ spacer, pegrna_3p }),
    }),
  simulate: (body: {
    duration_h: number;
    doses: Dose[];
    efficiency: number;
    off_target: number;
    initial_heteroplasmy: number;
  }) =>
    jsonFetch<SimResult>("/simulate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  optimize: (body: {
    duration_h: number;
    efficiency: number;
    off_target: number;
    initial_heteroplasmy: number;
    n_trials: number;
  }) =>
    jsonFetch<OptResult>("/optimize", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
