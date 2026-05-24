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

export type OffTargetHit = {
  position: number;
  strand: "+" | "-";
  mismatches: number;
  score: number;
  gene: string;
  on_target: boolean;
};

export type OffTargetResult = {
  genome: {
    length_bp: number;
    genes: { name: string; start: number; end: number; color: string }[];
  };
  hits: OffTargetHit[];
};

export type AgingInputs = {
  starting_bio_age_years: number;
  mito_count: number;
  somatic_mutation_rate: number;
  fission_fusion_ratio: number;
  membrane_potential_mV: number;
  mitophagy_efficiency: number;
  insoluble_protein_pct: number;
  membrane_lipid_nmol: number;
  matrix_calcium_nM: number;
};

export type AgingResult = {
  t: number[];
  heteroplasmy: number[];
  treated_rate_per_hr: number[];
  untreated_rate_per_hr: number[];
  treated_bio_age: number[];
  untreated_bio_age: number[];
  contributions_per_hr: Record<string, number>;
  summary: {
    starting_bio_age: number;
    treated_final_bio_age: number;
    untreated_final_bio_age: number;
    years_saved: number;
    duration_h: number;
    duration_days: number;
  };
};

export type ScenarioResult = {
  region: string;
  initial_heteroplasmy: number;
  duration_h: number;
  doses: Dose[];
  rationale: string;
};

async function streamText(
  path: string,
  body: unknown,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Stream ${path} failed: ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

export const api = {
  streamInterpret: (
    body: {
      region: Region;
      design: Design;
      prediction: Prediction;
      simulation: SimResult;
    },
    onChunk: (c: string) => void,
    signal?: AbortSignal,
  ) => streamText("/interpret", body, onChunk, signal),
  streamProtocol: (
    body: {
      region: Region;
      design: Design;
      prediction: Prediction;
      best_doses: Dose[];
      best_simulation: SimResult;
    },
    onChunk: (c: string) => void,
    signal?: AbortSignal,
  ) => streamText("/protocol", body, onChunk, signal),
  offtargets: (spacer: string, max_mismatches = 4, top_n = 60) =>
    jsonFetch<OffTargetResult>("/offtargets", {
      method: "POST",
      body: JSON.stringify({ spacer, max_mismatches, top_n }),
    }),
  aging: (body: AgingInputs & { t: number[]; heteroplasmy: number[] }) =>
    jsonFetch<AgingResult>("/aging", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  scenario: (description: string) =>
    jsonFetch<ScenarioResult>("/scenario", {
      method: "POST",
      body: JSON.stringify({ description }),
    }),
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
