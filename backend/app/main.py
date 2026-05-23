"""FastAPI entrypoint for MitoEdit AI."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .optimizer import OptRequest, optimize
from .predictor import get_predictor
from .sequences import MT_REGIONS, design_pegrna, list_regions
from .simulator import DoseEvent, SimParams, SimRequest, simulate


app = FastAPI(title="MitoEdit AI", version="0.1.0")
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


@app.get("/health")
def health() -> dict:
    return {"ok": True, "name": "MitoEdit AI"}


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
