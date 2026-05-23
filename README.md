# MitoEdit AI

**AI-driven simulation platform for doxycycline-inducible CRISPR prime editing of mitochondrial DNA via the PNPase RNA-import pathway.**

Built for the Caltech Hackathon.

## What it does

1. **Designs** a guide-RNA + pegRNA against a chosen pathogenic mtDNA locus (MELAS m.3243A>G, NARP m.8993T>G, LHON m.3460G>A / m.11778G>A).
2. **Predicts** on-target efficiency and off-target risk with a PyTorch CNN trained on sequence features (GC, PBS Tm, homopolymer, seed bases).
3. **Simulates** the full induction pipeline as an ODE system:
   - `dD/dt` doxycycline pharmacokinetics
   - `dM/dt` Hill-induced cassette transcription
   - `dP/dt` cytosolic RNP biogenesis
   - `dI/dt` PNPase-mediated mitochondrial import
   - `dH/dt` heteroplasmy shift (edited vs. pathogenic mtDNA)
4. **Optimizes** the dox dosing schedule with Optuna's TPE sampler, balancing edit yield against dox AUC (toxicity proxy) and time-to-rescue.
5. **Visualizes** the cell live — a react-three-fiber scene where nucleus emits CRISPR cargo whose flux and import rate are driven by the simulation in real time.

## Stack

- **Backend** — Python 3.9, FastAPI, PyTorch, SciPy ODE, Optuna
- **Frontend** — Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4, react-three-fiber, Recharts, Zustand, Framer Motion, Lucide

## Run locally

```bash
# backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend (new terminal)
cd frontend
npm install
npm run dev
# open http://localhost:3000
```

## File map

```
backend/app/
  sequences.py   — mtDNA loci + auto pegRNA designer
  predictor.py   — CNN edit-efficiency predictor
  simulator.py   — scipy ODE pipeline model
  optimizer.py   — Optuna TPE dose-schedule search
  main.py        — FastAPI endpoints

frontend/src/
  app/page.tsx                 — top-level dashboard
  components/CellViz.tsx       — three.js cellular schematic
  components/CellStage.tsx     — animation driver tied to ODE output
  components/Charts.tsx        — heteroplasmy / pathway / toxicity / Pareto
  components/DesignPanel.tsx   — guide design + ML stats
  components/DosingPanel.tsx   — manual dox schedule editor
  components/OptimizerPanel.tsx — Optuna trigger + landscape view
  components/ResultsPanel.tsx  — KPI tiles + charts
  lib/api.ts                   — typed client
  lib/store.ts                 — Zustand app state
```

## Demo storyline (≈60s)

1. Pick **MT-TL1 (MELAS m.3243A>G)** — pegRNA is auto-designed, ML predicts efficiency.
2. Hit **Run Simulation** — heteroplasmy curve drops, cell viz lights up as RNPs flow.
3. Hit **Optimize** — Optuna searches dosing space, residual pathogenic mtDNA drops from ~49% to ~5%.
4. The cell mitochondria visibly turn from pink (pathogenic) → teal (edited) as the timeline progresses.
