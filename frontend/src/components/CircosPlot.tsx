"use client";
import { useEffect, useMemo, useState } from "react";
import { Target, AlertTriangle, Loader2 } from "lucide-react";
import { api, type OffTargetResult } from "@/lib/api";
import { useApp } from "@/lib/store";

const CENTER = 220;
const R_OUTER = 200;
const R_GENE_INNER = 175;
const R_HIT_OUTER = 165;
const R_HIT_INNER = 55;

function polar(angle: number, r: number): [number, number] {
  return [CENTER + Math.cos(angle - Math.PI / 2) * r, CENTER + Math.sin(angle - Math.PI / 2) * r];
}
function arcPath(r1: number, r2: number, a1: number, a2: number): string {
  const [x1, y1] = polar(a1, r2);
  const [x2, y2] = polar(a2, r2);
  const [x3, y3] = polar(a2, r1);
  const [x4, y4] = polar(a1, r1);
  const large = a2 - a1 > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
}

export function CircosPlot() {
  const { design } = useApp();
  const [data, setData] = useState<OffTargetResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!design) return;
    setBusy(true);
    api
      .offtargets(design.spacer, 4, 80)
      .then(setData)
      .finally(() => setBusy(false));
  }, [design]);

  const len = data?.genome.length_bp ?? 16569;

  const tickAngles = useMemo(() => {
    const out: { angle: number; label: string }[] = [];
    for (let kb = 0; kb <= 16; kb += 2) {
      out.push({ angle: ((kb * 1000) / len) * 2 * Math.PI, label: `${kb}kb` });
    }
    return out;
  }, [len]);

  if (!design) {
    return (
      <div className="panel p-6 text-center text-sm text-[var(--fg-dim)]">
        Select a target locus to scan the mitochondrial genome for off-targets.
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[var(--accent-3)]" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--accent-3)]">
            Off-target landscape · whole mtDNA scan
          </h2>
        </div>
        <span className="chip">{len.toLocaleString()} bp · 28 genes</span>
      </div>
      <p className="text-xs text-[var(--fg-dim)] leading-relaxed mb-3">
        Scans the full 16,569 bp mitochondrial genome for partial matches to the current
        pegRNA spacer (≤4 mismatches, CFD-style position-weighted scoring after
        Hsu et al, Nat Biotech 2013). The on-target appears as a teal beam; predicted
        off-target hits appear as red beams whose length scales with concern.
      </p>
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="relative w-full lg:w-auto lg:flex-shrink-0" style={{ maxWidth: CENTER * 2 }}>
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-2)]" />
            </div>
          )}
          <svg
            viewBox={`0 0 ${CENTER * 2} ${CENTER * 2}`}
            preserveAspectRatio="xMidYMid meet"
            className="select-none w-full h-auto"
            style={{ display: "block" }}
          >
            {/* Outer circle */}
            <circle cx={CENTER} cy={CENTER} r={R_OUTER} fill="none" stroke="rgba(120,160,255,0.18)" strokeWidth={1} />
            <circle cx={CENTER} cy={CENTER} r={R_GENE_INNER} fill="none" stroke="rgba(120,160,255,0.10)" strokeWidth={1} />
            <circle cx={CENTER} cy={CENTER} r={R_HIT_INNER} fill="none" stroke="rgba(120,160,255,0.10)" strokeWidth={1} />
            {/* Gene arcs */}
            {data?.genome.genes.map((g) => {
              const a1 = (g.start / len) * 2 * Math.PI;
              const a2 = (g.end / len) * 2 * Math.PI;
              return (
                <path
                  key={g.name + g.start}
                  d={arcPath(R_GENE_INNER, R_OUTER, a1, a2)}
                  fill={g.color}
                  opacity={0.55}
                  stroke="#02030a"
                  strokeWidth={0.5}
                >
                  <title>{g.name}: {g.start.toLocaleString()}–{g.end.toLocaleString()}</title>
                </path>
              );
            })}
            {/* Gene labels (large genes only) */}
            {data?.genome.genes
              .filter((g) => g.end - g.start > 600)
              .map((g) => {
                const angle = (((g.start + g.end) / 2) / len) * 2 * Math.PI;
                const [x, y] = polar(angle, R_OUTER + 14);
                const deg = (angle * 180) / Math.PI;
                const flip = angle > Math.PI / 2 && angle < (3 * Math.PI) / 2;
                return (
                  <text
                    key={g.name}
                    x={x}
                    y={y}
                    fill="#93a0c9"
                    fontSize={9}
                    textAnchor="middle"
                    transform={`rotate(${flip ? deg + 180 : deg}, ${x}, ${y})`}
                    fontFamily="ui-monospace, monospace"
                  >
                    {g.name.replace("MT-", "")}
                  </text>
                );
              })}
            {/* Tick marks */}
            {tickAngles.map((t, i) => {
              const [x1, y1] = polar(t.angle, R_OUTER);
              const [x2, y2] = polar(t.angle, R_OUTER + 6);
              const [tx, ty] = polar(t.angle, R_OUTER + 22);
              return (
                <g key={i}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(120,160,255,0.4)" />
                  <text x={tx} y={ty} fontSize={8} fill="#64748b" textAnchor="middle" fontFamily="ui-monospace">
                    {t.label}
                  </text>
                </g>
              );
            })}
            {/* Hit beams */}
            {data?.hits.map((h, i) => {
              const angle = (h.position / len) * 2 * Math.PI;
              const [x1, y1] = polar(angle, R_HIT_OUTER);
              const beamR = R_HIT_OUTER - (h.score * (R_HIT_OUTER - R_HIT_INNER));
              const [x2, y2] = polar(angle, beamR);
              const color = h.on_target ? "#5eead4" : "#fb7185";
              const w = h.on_target ? 3 : 1.5 + h.score * 1.5;
              const opacity = h.on_target ? 1 : 0.4 + h.score * 0.55;
              return (
                <g key={i}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={color}
                    strokeWidth={w}
                    opacity={opacity}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <title>
                      {h.on_target ? "ON-TARGET" : "off-target"} · m.{h.position} · {h.gene} · {h.mismatches} mm · CFD {h.score.toFixed(2)}
                    </title>
                  </line>
                  {h.on_target && (
                    <circle
                      cx={x2}
                      cy={y2}
                      r={6}
                      fill="none"
                      stroke="#5eead4"
                      strokeWidth={1.5}
                      opacity={0.7}
                    >
                      <animate attributeName="r" values="6;14;6" dur="2.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}
            {/* Center label */}
            <text x={CENTER} y={CENTER - 10} textAnchor="middle" fontSize={11} fill="#64748b" fontFamily="ui-monospace">
              human mtDNA
            </text>
            <text x={CENTER} y={CENTER + 6} textAnchor="middle" fontSize={14} fill="#a5f3fc" fontWeight={600}>
              {data?.hits.filter((h) => h.on_target).length ?? 0} on-target
            </text>
            <text x={CENTER} y={CENTER + 24} textAnchor="middle" fontSize={11} fill="#fb7185" fontFamily="ui-monospace">
              {data?.hits.filter((h) => !h.on_target).length ?? 0} off-targets
            </text>
          </svg>
        </div>

        {/* Hit table */}
        <div className="flex-1 max-h-[440px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-[11px] mono">
            <thead className="text-[var(--fg-dim)] text-[10px] uppercase tracking-wider sticky top-0 bg-[var(--bg-elev)]">
              <tr>
                <th className="text-left p-2">Pos</th>
                <th className="text-left p-2">Gene</th>
                <th className="text-center p-2">±</th>
                <th className="text-center p-2">mm</th>
                <th className="text-right p-2">CFD</th>
              </tr>
            </thead>
            <tbody>
              {data?.hits.map((h, i) => (
                <tr
                  key={i}
                  className={`border-t border-white/5 ${hover === i ? "bg-[var(--accent-2)]/10" : ""}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <td className="p-2 text-[var(--accent)]">m.{h.position.toLocaleString()}</td>
                  <td className="p-2 text-[var(--fg)]">{h.gene}</td>
                  <td className="p-2 text-center text-[var(--fg-dim)]">{h.strand}</td>
                  <td className="p-2 text-center text-[var(--fg-dim)]">{h.mismatches}</td>
                  <td className="p-2 text-right">
                    {h.on_target ? (
                      <span className="text-[var(--accent)] flex items-center justify-end gap-1">
                        <Target className="w-3 h-3" /> {h.score.toFixed(2)}
                      </span>
                    ) : h.score > 0.65 ? (
                      <span className="text-[var(--accent-3)] flex items-center justify-end gap-1">
                        <AlertTriangle className="w-3 h-3" /> {h.score.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[var(--fg-dim)]">{h.score.toFixed(2)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
