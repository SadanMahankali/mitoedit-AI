# Revitalize AI 🧬

**AI-driven simulation platform for doxycycline-inducible CRISPR prime editing of mitochondrial DNA via the PNPase RNA-import pathway.**

Built for the Caltech Hackathon — Team Revitalize.

---

## What It Does

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

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.9, FastAPI, PyTorch, SciPy ODE, Optuna |
| Frontend | Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4 |
| 3D Viz | react-three-fiber, React Three Drei, @react-three/postprocessing |
| Charts | Recharts |
| State | Zustand, Framer Motion, Lucide |
| AI | Claude API (Anthropic) |

---

## Prerequisites

Make sure you have these installed before starting:

- **Node.js** v18 or higher — [download here](https://nodejs.org)
- **Python** 3.9 or higher — [download here](https://python.org)
- **pip** (comes with Python)
- An **Anthropic API key** — [get one here](https://console.anthropic.com)

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/revitalize-ai.git
cd revitalize-ai
```

### 2. Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Set up your environment file:

```bash
cp .env.example .env
# open .env and paste your Anthropic API key
```

### 3. Frontend setup

```bash
cd ../frontend
npm install
```

### 4. Run the app

You need two terminals running simultaneously.

**Terminal 1 — Backend:**
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (`sk-ant-...`) | Yes |

---

## AI Co-Scientist (Claude Integration)

Three Claude-powered endpoints with streaming, adaptive thinking, and prompt caching on the science primer:

| Endpoint | What it does |
|---|---|
| `/interpret` | Streams a biologist-style explanation of the latest simulation (mechanism, rate-limiter, caveats) |
| `/protocol` | Streams a day-by-day wet-lab protocol (materials, controls, readouts) tailored to the optimizer result |
| `/scenario` | Tool-use parse: natural-language scenario → structured simulator params (region, heteroplasmy, dosing schedule) |

The AI panel appears in the right column of the dashboard.

---

## File Map

```
backend/app/
  sequences.py     — mtDNA loci + auto pegRNA designer
  predictor.py     — CNN edit-efficiency predictor
  simulator.py     — SciPy ODE pipeline model
  optimizer.py     — Optuna TPE dose-schedule search
  main.py          — FastAPI endpoints

frontend/src/
  app/page.tsx                  — top-level dashboard
  components/CellViz.tsx        — Three.js cellular schematic
  components/CellStage.tsx      — animation driver tied to ODE output
  components/Charts.tsx         — heteroplasmy / pathway / toxicity / Pareto
  components/DesignPanel.tsx    — guide design + ML stats
  components/DosingPanel.tsx    — manual dox schedule editor
  components/OptimizerPanel.tsx — Optuna trigger + landscape view
  components/ResultsPanel.tsx   — KPI tiles + charts
  lib/api.ts                    — typed API client
  lib/store.ts                  — Zustand app state
```

---

## Quick Demo (60s)

1. Pick **MT-TL1 (MELAS m.3243A>G)** — pegRNA is auto-designed, ML predicts efficiency
2. Hit **Run Simulation** — heteroplasmy curve drops, cell viz lights up as RNPs flow
3. Hit **Optimize** — Optuna searches dosing space, residual pathogenic mtDNA drops from ~49% to ~5%
4. Watch mitochondria shift from pink (pathogenic) → teal (edited) in real time
5. Open the **Claude AI panel** → Interpret for a clinical read, or type a natural language scenario
6. Click **Export Clinical Report** to download a full PDF summary

---

## Troubleshooting

**3D cell is lagging**
In `frontend/src/components/CellViz.tsx` reduce `CytoplasmSoup` from `600` → `200` and `Cytoskeleton` from `18` → `10`.

**Backend not connecting**
Make sure the FastAPI server is running on port `8000` before starting the frontend. Check the terminal for Python import errors.

**Claude AI panel not responding**
Check your `ANTHROPIC_API_KEY` is correctly set in `backend/.env` with no extra spaces or quotes.

**Python venv issues (Mac/Anaconda)**
If you have Anaconda installed, use the full path:
```bash
/opt/anaconda3/bin/pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

**Port already in use**
```bash
# Kill whatever is on port 3000
lsof -ti:3000 | xargs kill
# Or run on a different port
npm run dev -- -p 3001
```

---

## Team

Built at the Caltech Hackathon — **Team Revitalize**

---

## License

MIT
