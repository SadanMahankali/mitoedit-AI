"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { OptResult, SimResult } from "@/lib/api";

const palette = {
  dox: "#fbbf24",
  mrna: "#f472b6",
  rnpCyto: "#a78bfa",
  rnpMito: "#5eead4",
  edited: "#22d3ee",
  pathogenic: "#fb7185",
  toxicity: "#f97316",
};

function tooltipStyle() {
  return {
    background: "rgba(8, 12, 28, 0.95)",
    border: "1px solid rgba(120, 160, 255, 0.25)",
    borderRadius: 10,
    color: "#e8edff",
    fontSize: 12,
  };
}

export function HeteroplasmyChart({ sim }: { sim: SimResult }) {
  const data = sim.t.map((t, i) => ({
    t,
    edited: sim.edited_fraction[i] * 100,
    pathogenic: sim.pathogenic_heteroplasmy[i] * 100,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 14, left: -8, bottom: 4 }}>
        <defs>
          <linearGradient id="edFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.edited} stopOpacity={0.55} />
            <stop offset="100%" stopColor={palette.edited} stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="patFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.pathogenic} stopOpacity={0.45} />
            <stop offset="100%" stopColor={palette.pathogenic} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(120, 160, 255, 0.08)" />
        <XAxis dataKey="t" tick={{ fill: "#93a0c9", fontSize: 11 }} unit="h" />
        <YAxis tick={{ fill: "#93a0c9", fontSize: 11 }} unit="%" domain={[0, 100]} />
        <Tooltip contentStyle={tooltipStyle()} formatter={(v: unknown) => `${Number(v).toFixed(1)}%`} />
        <Area
          type="monotone"
          dataKey="pathogenic"
          name="Pathogenic mtDNA"
          stroke={palette.pathogenic}
          fill="url(#patFill)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="edited"
          name="Edited mtDNA"
          stroke={palette.edited}
          fill="url(#edFill)"
          strokeWidth={2}
        />
        {sim.therapeutic_threshold_h && (
          <ReferenceLine
            x={sim.therapeutic_threshold_h}
            stroke="#5eead4"
            strokeDasharray="3 3"
            label={{ value: "60% rescue", fill: "#5eead4", fontSize: 10, position: "top" }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PathwayChart({ sim }: { sim: SimResult }) {
  const data = sim.t.map((t, i) => ({
    t,
    dox: sim.dox[i],
    mrna: sim.mrna[i],
    rnpCyto: sim.rnp_cyto[i],
    rnpMito: sim.rnp_mito[i],
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 14, left: -8, bottom: 4 }}>
        <CartesianGrid stroke="rgba(120, 160, 255, 0.08)" />
        <XAxis dataKey="t" tick={{ fill: "#93a0c9", fontSize: 11 }} unit="h" />
        <YAxis tick={{ fill: "#93a0c9", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle()} formatter={(v: unknown) => Number(v).toFixed(2)} />
        <Line type="monotone" dataKey="dox" name="Doxycycline" stroke={palette.dox} dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="mrna" name="CRISPR mRNA" stroke={palette.mrna} dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="rnpCyto" name="RNP (cytosol)" stroke={palette.rnpCyto} dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="rnpMito" name="RNP (mito)" stroke={palette.rnpMito} dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ToxicityChart({ sim }: { sim: SimResult }) {
  const data = sim.t.map((t, i) => ({
    t,
    toxicity: sim.toxicity[i] * 100,
  }));
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 6, right: 14, left: -8, bottom: 4 }}>
        <defs>
          <linearGradient id="toxFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.toxicity} stopOpacity={0.5} />
            <stop offset="100%" stopColor={palette.toxicity} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(120, 160, 255, 0.08)" />
        <XAxis dataKey="t" tick={{ fill: "#93a0c9", fontSize: 11 }} unit="h" />
        <YAxis tick={{ fill: "#93a0c9", fontSize: 11 }} unit="%" domain={[0, 100]} />
        <Tooltip contentStyle={tooltipStyle()} formatter={(v: unknown) => `${Number(v).toFixed(1)}%`} />
        <Area
          type="monotone"
          dataKey="toxicity"
          name="Predicted toxicity"
          stroke={palette.toxicity}
          fill="url(#toxFill)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function OptHistoryChart({ opt }: { opt: OptResult }) {
  const data = opt.history.map((h) => ({
    trial: h.trial,
    pathogenic: h.final_pathogenic * 100,
    auc: h.dox_auc,
    obj: h.objective,
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ScatterChart margin={{ top: 8, right: 14, left: -8, bottom: 4 }}>
        <CartesianGrid stroke="rgba(120, 160, 255, 0.08)" />
        <XAxis
          type="number"
          dataKey="auc"
          name="Dox AUC"
          tick={{ fill: "#93a0c9", fontSize: 11 }}
          label={{ value: "Dox AUC (toxicity proxy)", fill: "#93a0c9", fontSize: 11, position: "insideBottom", offset: -2 }}
        />
        <YAxis
          type="number"
          dataKey="pathogenic"
          name="Residual pathogenic %"
          tick={{ fill: "#93a0c9", fontSize: 11 }}
          unit="%"
        />
        <ZAxis type="number" dataKey="obj" range={[40, 180]} />
        <Tooltip contentStyle={tooltipStyle()} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter data={data} fill="#818cf8" fillOpacity={0.6} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
