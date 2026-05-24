"""FastAPI entrypoint for Revitalize AI."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from . import claude
from .aging import AgingInputs, compute_aging
from .offtargets import genome_summary, scan_offtargets
from .optimizer import OptRequest, optimize
from .predictor import get_predictor
from .sequences import MT_REGIONS, design_pegrna, list_regions
from .simulator import DoseEvent, SimParams, SimRequest, simulate


app = FastAPI(title="Revitalize AI", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictBody(BaseModel):
    spacer: str = Field(..., min_length=10, max_length=30)
    pegrna_3p: str = Field(..., min_length=10, max_length=60)


class DoseModel(BaseModel):
    time: float
    amount: float


class SimulateBody(BaseModel):
    duration_h: float = 96.0
    dt: float = 0.5
    doses: list[DoseModel] = []
    efficiency: float = 0.6
    off_target: float = 0.1
    initial_heteroplasmy: float = 0.8


class OptimizeBody(BaseModel):
    duration_h: float = 96.0
    efficiency: float = 0.6
    off_target: float = 0.1
    initial_heteroplasmy: float = 0.8
    n_trials: int = 60


class RegionModel(BaseModel):
    name: str
    disease: str = ""
    position: int = 0
    wt: str = ""
    edit: str = ""


class DesignModel(BaseModel):
    spacer: str
    pam: str
    pegrna_3p: str
    target_locus: str = ""
    edit_position: int = 0


class PredictionModel(BaseModel):
    on_target: float
    off_target_risk: float
    gc_content: float
    pbs_tm: float
    spacer_len: int = 0
    pegrna_3p_len: int = 0


class InterpretBody(BaseModel):
    region: RegionModel
    design: DesignModel
    prediction: PredictionModel
    simulation: dict


class ProtocolBody(BaseModel):
    region: RegionModel
    design: DesignModel
    prediction: PredictionModel
    best_doses: list[DoseModel]
    best_simulation: dict


class ScenarioBody(BaseModel):
    description: str = Field(..., min_length=4, max_length=2000)


class AgingBody(BaseModel):
    t: list[float]
    heteroplasmy: list[float]
    starting_bio_age_years: float = 35.0
    mito_count: float = 1500.0
    somatic_mutation_rate: float = 1e-7
    fission_fusion_ratio: float = 1.0
    membrane_potential_mV: float = -160.0
    mitophagy_efficiency: float = 85.0
    insoluble_protein_pct: float = 1.0
    membrane_lipid_nmol: float = 30.0
    matrix_calcium_nM: float = 100.0


@app.get("/health")
def health() -> dict:
    return {"ok": True, "name": "Revitalize AI"}


@app.get("/regions")
def regions() -> dict:
    return {"regions": list_regions()}


@app.get("/design/{region}")
def design(region: str) -> dict:
    if region not in MT_REGIONS:
        raise HTTPException(404, f"Unknown region: {region}")
    g = design_pegrna(region)
    return {
        "spacer": g.spacer,
        "pam": g.pam,
        "pegrna_3p": g.pegrna_3p,
        "target_locus": g.target_locus,
        "edit_position": g.edit_position,
    }


@app.post("/predict")
def predict(body: PredictBody) -> dict:
    return get_predictor().predict(body.spacer, body.pegrna_3p)


@app.post("/simulate")
def run_sim(body: SimulateBody) -> dict:
    return simulate(SimRequest(
        duration_h=body.duration_h,
        dt=body.dt,
        doses=[DoseEvent(time=d.time, amount=d.amount) for d in body.doses],
        efficiency=body.efficiency,
        off_target=body.off_target,
        initial_heteroplasmy=body.initial_heteroplasmy,
        params=SimParams(),
    ))


@app.post("/optimize")
def run_opt(body: OptimizeBody) -> dict:
    return optimize(OptRequest(
        duration_h=body.duration_h,
        efficiency=body.efficiency,
        off_target=body.off_target,
        initial_heteroplasmy=body.initial_heteroplasmy,
        n_trials=body.n_trials,
    ))


# ---------------------------------------------------------------------------
# Claude-powered endpoints
# ---------------------------------------------------------------------------

@app.post("/interpret")
def interpret(body: InterpretBody) -> StreamingResponse:
    """Streams a biologist-style interpretation of the latest simulation."""
    def gen():
        try:
            for chunk in claude.stream_interpretation(
                region=body.region.model_dump(),
                design=body.design.model_dump(),
                prediction=body.prediction.model_dump(),
                simulation=body.simulation,
            ):
                yield chunk
        except Exception as e:
            yield f"\n\n[error: {e}]"

    return StreamingResponse(gen(), media_type="text/plain; charset=utf-8")


@app.post("/protocol")
def protocol(body: ProtocolBody) -> StreamingResponse:
    """Streams a wet-lab protocol Markdown tailored to the optimization result."""
    def gen():
        try:
            for chunk in claude.stream_protocol(
                region=body.region.model_dump(),
                design=body.design.model_dump(),
                prediction=body.prediction.model_dump(),
                best_doses=[d.model_dump() for d in body.best_doses],
                best_simulation=body.best_simulation,
            ):
                yield chunk
        except Exception as e:
            yield f"\n\n[error: {e}]"

    return StreamingResponse(gen(), media_type="text/plain; charset=utf-8")


@app.post("/aging")
def aging(body: AgingBody) -> dict:
    """Compute biological-aging trajectory driven by 9 mito parameters."""
    return compute_aging(
        t_hours=body.t,
        heteroplasmy_series=body.heteroplasmy,
        inputs=AgingInputs(
            mito_count=body.mito_count,
            somatic_mutation_rate=body.somatic_mutation_rate,
            fission_fusion_ratio=body.fission_fusion_ratio,
            membrane_potential_mV=body.membrane_potential_mV,
            mitophagy_efficiency=body.mitophagy_efficiency,
            insoluble_protein_pct=body.insoluble_protein_pct,
            membrane_lipid_nmol=body.membrane_lipid_nmol,
            matrix_calcium_nM=body.matrix_calcium_nM,
        ),
        starting_bio_age_years=body.starting_bio_age_years,
    )


class OffTargetBody(BaseModel):
    spacer: str = Field(..., min_length=10, max_length=30)
    max_mismatches: int = 4
    top_n: int = 60


@app.post("/offtargets")
def offtargets(body: OffTargetBody) -> dict:
    """Genome-wide off-target scan over the full 16,569 bp mtDNA."""
    hits = scan_offtargets(body.spacer, body.max_mismatches, body.top_n)
    return {
        "genome": genome_summary(),
        "hits": [
            {
                "position": h.position,
                "strand": h.strand,
                "mismatches": h.mismatches,
                "score": h.score,
                "gene": h.gene,
                "on_target": h.on_target,
            }
            for h in hits
        ],
    }


@app.post("/scenario")
def scenario(body: ScenarioBody) -> dict:
    """Convert a natural-language scenario into concrete simulator params via tool use."""
    try:
        return claude.parse_scenario(body.description)
    except Exception as e:
        raise HTTPException(500, str(e))
