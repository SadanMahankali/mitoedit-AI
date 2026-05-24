"use client";
import { Activity, HeartPulse, Hourglass, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, type AgingInputs, type AgingResult } from "@/lib/api";
import { useApp } from "@/lib/store";

const DEFAULTS: AgingInputs = {
  starting_bio_age_years: 35,
  mito_count: 1500,
  somatic_mutation_rate: 1e-7,
  fission_fusion_ratio: 1.0,
  membrane_potential_mV: -160,
  mitophagy_efficiency: 85,
  insoluble_protein_pct: 1.0,
  membrane_lipid_nmol: 30,
  matrix_calcium_nM: 100,
};

const PARAM_META: {
  key: keyof AgingInputs;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  healthy: [number, number];
  fmt?: (v: number) => string;
  log?: boolean;
}[] = [
  { key: "mito_count", label: "Mito count / cell", unit: "", min: 500, max: 3000, step: 50, healthy: [1000, 2000] },
  {
    key: "somatic_mutation_rate",
    label: "Somatic mtDNA mutation rate",
    unit: "muts/bp",
    min: -9,
    max: -2,
    step: 0.1,
    healthy: [-9, -6],
    log: true,
    fmt: (v) => `1e${v.toFixed(1)}`,
  },
  { key: "fission_fusion_ratio", label: "Fission : Fusion ratio", unit: "", min: 0.1, max: 5, step: 0.05, healthy: [0.8, 1.2] },
  { key: "membrane_potential_mV", label: "Membrane potential", unit: "mV", min: -200, max: -60, step: 2, healthy: [-180, -140] },
  { key: "mitophagy_efficiency", label: "Mitophagy efficiency", unit: "%", min: 0, max: 100, step: 1, healthy: [75, 95] },
  { key: "insoluble_protein_pct", label: "Insoluble protein", unit: "%", min: 0, max: 30, step: 0.2, healthy: [0, 2] },
  { key: "membrane_lipid_nmol", label: "Membrane lipid", unit: "nmol/mg", min: 0, max: 100, step: 1, healthy: [15, 45] },
  { key: "matrix_calcium_nM", label: "Matrix Ca²⁺ retention", unit: "nM", min: 10, max: 12000, step: 10, healthy: [50, 150] },
];

const CONTRIB_COLORS: Record<string, string> = {
  heteroplasmy: "#fb7185",
  mito_count: "#5eead4",
  somatic_mutation: "#f472b6",
  fission_fusion: "#a78bfa",
  membrane_potential: "#fbbf24",
  mitophagy: "#22d3ee",
  insoluble_protein: "#f97316",
  membrane_lipid: "#84cc16",
  calcium: "#818cf8",
  baseline: "#64748b",
};

const CONTRIB_LABELS: Record<string, string> = {
  heteroplasmy: "MELAS heteroplasmy",
  mito_count: "Mito count",
  somatic_mutation: "Somatic mutation",
  fission_fusion: "Fission/fusion",
  membrane_potential: "Membrane potential",
  mitophagy: "Mitophagy",
  insoluble_protein: "Insoluble protein",
  membrane_lipid: "Membrane lipid",
  calcium: "Matrix Ca²⁺",
  baseline: "Baseline aging",
};

export function AgingPanel() {
  const { sim, setError } = useApp();
  const [inputs, setInputs] = useState<AgingInputs>(DEFAULTS);
  const [logMu, setLogMu] = useState(Math.log10(DEFAULTS.somatic_mutation_rate));
  const [result, setResult] = useState<AgingResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function recompute(next: AgingInputs) {
    if (!sim) return;
    setBusy(true);
    try {
      const r = await api.aging({
        ...next,
        t: sim.t,
        heteroplasmy: sim.pathogenic_heteroplasmy,
      });
      setResult(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (sim) recompute(inputs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  function update<K extends keyof AgingInputs>(k: K, v: AgingInputs[K]) {
    const next = { ...inputs, [k]: v };
    setInputs(next);
    recompute(next);
  }

  function reset() {
    setInputs(DEFAULTS);
    setLogMu(Math.log10(DEFAULTS.somatic_mutation_rate));
    recompute(DEFAULTS);
  }

  if (!sim) {
    return (
      <div className="panel p-6 text-center text-sm text-[var(--fg-dim)]">
        Run a simulation to enable the mitochondrial-aging model.
      </div>
    );
  }

  return (
    <div className="panel p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-[var(--accent-3)]" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--accent-3)]">
            Biological-Aging Model
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {busy && <Loader2 className="w-3 h-3 animate-spin text-[var(--fg-dim)]" />}
          <button className="btn ghost text-xs" onClick={reset}>
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      <p className="text-xs text-[var(--fg-dim)] leading-relaxed">
        Nine mitochondrial parameters drive a per-hour aging rate. The MELAS
        heteroplasmy trace comes <em>live</em> from the simulator, so the optimised
        CRISPR treatment dynamically slows aging as the edit progresses — every
        other parameter is a slider below.
      </p>

      {/* KPI tiles */}
      {result && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile
            icon={<Hourglass className="w-4 h-4" />}
            label="Bio-age (treated)"
            value={`${result.summary.treated_final_bio_age.toFixed(3)} yr`}
            accent="text-[var(--accent)]"
          />
          <Tile
            icon={<Hourglass className="w-4 h-4" />}
            label="Bio-age (untreated)"
            value={`${result.summary.untreated_final_bio_age.toFixed(3)} yr`}
            accent="text-[var(--accent-3)]"
          />
          <Tile
            icon={<Activity className="w-4 h-4" />}
            label="Years saved"
            value={`${(result.summary.years_saved * 1000).toFixed(2)} m-yr`}
            sub={`over ${result.summary.duration_days.toFixed(1)} d`}
            accent="text-[var(--accent-2)]"
          />
          <Tile
            icon={<Activity className="w-4 h-4" />}
            label="Aging rate (now)"
            value={`${(result.treated_rate_per_hr.at(-1)! * 8766).toFixed(2)} ×`}
            sub="bio-yr / real-yr"
            accent="text-[var(--warn)]"
          />
        </div>
      )}

      {/* Bio-age chart */}
      {result && (
        <div>
          <div className="text-xs uppercase tracking-wider text-[var(--fg-dim)] mb-1">
            Biological age — treated vs. untreated
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={result.t.map((t, i) => ({
                t,
                treated: result.treated_bio_age[i],
                untreated: result.untreated_bio_age[i],
              }))}
              margin={{ top: 10, right: 14, left: -8, bottom: 4 }}
            >
              <CartesianGrid stroke="rgba(120, 160, 255, 0.08)" />
              <XAxis dataKey="t" tick={{ fill: "#93a0c9", fontSize: 11 }} unit="h" />
              <YAxis
                tick={{ fill: "#93a0c9", fontSize: 11 }}
                domain={["dataMin - 0.01", "dataMax + 0.01"]}
                tickFormatter={(v) => Number(v).toFixed(3)}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(8, 12, 28, 0.95)",
                  border: "1px solid rgba(120, 160, 255, 0.25)",
                  borderRadius: 10,
                  color: "#e8edff",
                  fontSize: 12,
                }}
                formatter={(v: unknown) => `${Number(v).toFixed(4)} yr`}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#93a0c9" }} />
              <Line
                type="monotone"
                dataKey="untreated"
                name="No treatment"
                stroke="#fb7185"
                strokeDasharray="4 3"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="treated"
                name="With CRISPR + dox"
                stroke="#5eead4"
                dot={false}
                strokeWidth={2.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Contribution breakdown */}
      {result && <ContributionBars contributions={result.contributions_per_hr} />}

      {/* Parameter sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3 pt-2">
        <Slider
          label="Starting biological age"
          unit="yr"
          min={20}
          max={80}
          step={1}
          value={inputs.starting_bio_age_years}
          onChange={(v) => update("starting_bio_age_years", v)}
          fmt={(v) => v.toFixed(0)}
        />
        {PARAM_META.map((p) =>
          p.log ? (
            <Slider
              key={p.key}
              label={p.label}
              unit={p.unit}
              min={p.min}
              max={p.max}
              step={p.step}
              value={logMu}
              healthy={p.healthy}
              fmt={p.fmt}
              onChange={(v) => {
                setLogMu(v);
                update("somatic_mutation_rate", Math.pow(10, v));
              }}
            />
          ) : (
            <Slider
              key={p.key}
              label={p.label}
              unit={p.unit}
              min={p.min}
              max={p.max}
              step={p.step}
              value={inputs[p.key] as number}
              healthy={p.healthy}
              fmt={p.fmt}
              onChange={(v) => update(p.key, v as never)}
            />
          ),
        )}
      </div>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="panel-tight p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--fg-dim)]">
        {icon}
        {label}
      </div>
      <div className={`text-xl font-semibold mt-1 ${accent ?? ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--fg-dim)] mt-0.5">{sub}</div>}
    </div>
  );
}

function Slider({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  healthy,
  fmt,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  healthy?: [number, number];
  fmt?: (v: number) => string;
}) {
  const inHealthy = healthy ? value >= healthy[0] && value <= healthy[1] : true;
  const lp = healthy ? ((healthy[0] - min) / (max - min)) * 100 : 0;
  const rp = healthy ? ((healthy[1] - min) / (max - min)) * 100 : 100;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-[var(--fg-dim)] uppercase tracking-wider">{label}</span>
        <span className={`mono ${inHealthy ? "text-[var(--accent)]" : "text-[var(--accent-3)]"}`}>
          {fmt ? fmt(value) : value.toFixed(value >= 100 ? 0 : 2)}
          {unit && <span className="text-[var(--fg-dim)] ml-0.5">{unit}</span>}
        </span>
      </div>
      <div className="relative mt-1">
        {healthy && (
          <div
            className="absolute top-[10px] h-[4px] rounded-full bg-[var(--accent)]/25 pointer-events-none"
            style={{ left: `${lp}%`, width: `${rp - lp}%` }}
          />
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

function ContributionBars({ contributions }: { contributions: Record<string, number> }) {
  // Use the *final* heteroplasmy contribution to show post-treatment state
  const entries = Object.entries(contributions)
    .map(([k, v]) => {
      if (k === "heteroplasmy_initial") return null;
      const label =
        k === "heteroplasmy_final"
          ? CONTRIB_LABELS.heteroplasmy
          : CONTRIB_LABELS[k] ?? k;
      const color =
        k === "heteroplasmy_final"
          ? CONTRIB_COLORS.heteroplasmy
          : CONTRIB_COLORS[k] ?? "#818cf8";
      return { key: k, label, color, value: v };
    })
    .filter((e): e is { key: string; label: string; color: string; value: number } => !!e)
    .filter((e) => e.value > 0);
  const max = Math.max(...entries.map((e) => e.value), 1e-12);
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-[var(--fg-dim)] mb-2">
        Contribution to aging rate (final timestep)
      </div>
      {entries.length === 0 ? (
        <div className="panel-tight p-3 text-xs text-[var(--accent)]">
          All 9 parameters in healthy range — only baseline aging contributes.
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries
            .sort((a, b) => b.value - a.value)
            .map((e) => (
              <div key={e.key} className="flex items-center gap-2 text-[11px]">
                <div className="w-32 text-[var(--fg-dim)] truncate">{e.label}</div>
                <div className="flex-1 h-[6px] rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(e.value / max) * 100}%`,
                      background: e.color,
                    }}
                  />
                </div>
                <div className="mono w-24 text-right" style={{ color: e.color }}>
                  {(e.value * 8766).toFixed(2)}× bsl
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
