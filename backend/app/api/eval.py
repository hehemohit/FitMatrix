"""
FitMatrix Evaluation & Observability API
----------------------------------------
Endpoints for running benchmarks, inspecting execution traces,
and comparing prompt/model versions.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.eval.runner import (
    execute_benchmark_run,
    get_all_runs,
    get_run_details,
    load_golden_cases,
)

router = APIRouter(prefix="/api/v1/eval", tags=["evaluation"])


class RunBenchmarkRequest(BaseModel):
    model_name: str = "gemini-1.5-flash"
    prompt_version: str = "production"
    selected_cases: Optional[List[str]] = None


@router.post("/run")
async def trigger_eval_run(payload: RunBenchmarkRequest):
    """Triggers an automated evaluation run against the golden test suite."""
    try:
        summary = await execute_benchmark_run(
            model_name=payload.model_name,
            prompt_version=payload.prompt_version,
            selected_case_ids=payload.selected_cases,
        )
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/runs")
async def list_eval_runs():
    """Lists recent evaluation runs with high-level KPI metrics."""
    try:
        runs = await get_all_runs()
        return {"status": "success", "runs": runs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/runs/{run_id}")
async def get_single_eval_run(run_id: str):
    """Returns deep step-by-step traces, tool calls, and LLM judge rubrics for a specific run."""
    run = await get_run_details(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")
    return {"status": "success", "run": run}


@router.get("/compare")
async def compare_eval_runs(run_a: str = Query(...), run_b: str = Query(...)):
    """
    Compares two evaluation runs side-by-side:
    Calculates metric deltas (pass rate, latency ms, judge score) and highlights regressions.
    """
    detail_a = await get_run_details(run_a)
    detail_b = await get_run_details(run_b)

    if not detail_a or not detail_b:
        raise HTTPException(status_code=404, detail="One or both runs could not be found.")

    cases_a = {c["test_case_id"]: c for c in detail_a.get("cases", [])}
    cases_b = {c["test_case_id"]: c for c in detail_b.get("cases", [])}

    all_case_ids = list(set(list(cases_a.keys()) + list(cases_b.keys())))
    comparisons = []
    regressions_count = 0

    for cid in all_case_ids:
        ca = cases_a.get(cid)
        cb = cases_b.get(cid)

        passed_a = ca.get("deterministic_passed", False) if ca else False
        passed_b = cb.get("deterministic_passed", False) if cb else False

        score_a = ca.get("llm_judge_score", 0.0) if ca else 0.0
        score_b = cb.get("llm_judge_score", 0.0) if cb else 0.0

        latency_a = ca.get("latency_ms", 0) if ca else 0
        latency_b = cb.get("latency_ms", 0) if cb else 0

        # A regression is when A passed but B failed, or judge score dropped by > 0.5
        is_regression = (passed_a and not passed_b) or (score_b < score_a - 0.5)
        if is_regression:
            regressions_count += 1

        comparisons.append({
            "case_id": cid,
            "scenario_name": (ca or cb).get("scenario_name", cid),
            "run_a": {
                "passed": passed_a,
                "score": score_a,
                "latency_ms": latency_a,
            },
            "run_b": {
                "passed": passed_b,
                "score": score_b,
                "latency_ms": latency_b,
            },
            "score_delta": round(score_b - score_a, 2),
            "latency_delta_ms": latency_b - latency_a,
            "is_regression": is_regression,
        })

    return {
        "status": "success",
        "run_a_id": run_a,
        "run_b_id": run_b,
        "summary": {
            "pass_rate_delta": round(detail_b.get("pass_rate", 0) - detail_a.get("pass_rate", 0), 1),
            "avg_judge_delta": round(detail_b.get("avg_judge_score", 0) - detail_a.get("avg_judge_score", 0), 2),
            "avg_latency_delta_ms": round(detail_b.get("avg_latency_ms", 0) - detail_a.get("avg_latency_ms", 0), 1),
            "total_regressions": regressions_count,
        },
        "case_comparisons": comparisons,
    }


@router.get("/cases")
async def list_cases():
    """Returns all golden benchmark test cases."""
    return {"status": "success", "cases": load_golden_cases()}

