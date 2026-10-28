"""
FitMatrix Benchmark Execution Engine
------------------------------------
Executes the golden benchmark suite, runs dual-tier scoring,
and records run history into MongoDB Atlas.
"""

import os
import json
import uuid
import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from langchain_core.messages import HumanMessage, AIMessage

from app.graph.workflow import fitmatrix_graph
from app.agents.workout_agent import workout_agent_structured
from app.agents.diet_agent import diet_agent_structured
from app.agents.sleep_agent import sleep_agent_structured
from app.harness.tracer import ExecutionTracer
from app.harness.guardrails import GuardrailEngine
from app.harness.evaluator import EvaluatorEngine
from app.models.documents import EvalRunDocument, EvalCaseTrace

logger = logging.getLogger(__name__)

GOLDEN_DATASET_PATH = os.path.join(os.path.dirname(__file__), "golden_dataset.json")

# In-memory runs cache for instantaneous query response
_RUNS_CACHE: List[Dict[str, Any]] = []


def load_golden_cases() -> List[Dict[str, Any]]:
    if not os.path.exists(GOLDEN_DATASET_PATH):
        return []
    with open(GOLDEN_DATASET_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


async def execute_benchmark_run(
    model_name: str = "gemini-1.5-flash",
    prompt_version: str = "production",
    selected_case_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Executes the golden test suite against the FitMatrix multi-agent system.
    """
    all_cases = load_golden_cases()
    if selected_case_ids:
        all_cases = [c for c in all_cases if c["id"] in selected_case_ids]

    run_id = f"run_{uuid.uuid4().hex[:8]}"
    case_results: List[Dict[str, Any]] = []

    passed_count = 0
    total_latency = 0
    total_cost = 0.0
    total_judge_score = 0.0

    for case in all_cases:
        case_id = case["id"]
        mode = case.get("mode", "chat")
        user_message = case.get("input_message", "")
        payload = case.get("payload", {})

        tracer = ExecutionTracer(run_id=run_id, case_id=case_id, model_name=model_name)
        tracer.start_step("harness_init", input_summary={"message": user_message})

        # 1. Pre-Execution Guardrails
        guard_passed, guard_alert = GuardrailEngine.pre_execution_check(user_message, payload)
        actual_output: Dict[str, Any] = {}

        if not guard_passed:
            actual_output = {
                "status": "safety_refusal",
                "reply": guard_alert,
                "readiness_score": 0,
                "fatigue_flag": "high_fatigue",
            }
            tracer.end_step(output_summary={"status": "safety_intercept"})
        elif mode == "chat":
            tracer.start_step("langgraph_execution")
            try:
                # Prepare graph state
                initial_state = {
                    "messages": [HumanMessage(content=user_message)],
                    "steps_today": payload.get("steps_today", 0),
                    "sleep_minutes": payload.get("sleep_minutes", 420),
                    "active_calories_burned": payload.get("active_calories_burned", 0),
                    "resting_heart_rate_bpm": payload.get("resting_heart_rate_bpm", 0),
                    "logged_workouts": [],
                    "readiness_score": payload.get("readiness_score", 0),
                    "fatigue_flag": None,
                    "remaining_calories": 2400,
                    "remaining_protein_g": 160,
                    "prescribed_workout": None,
                    "user_profile": payload.get("user_profile", {}),
                    "daily_log": payload.get("daily_log", {}),
                    "current_topic": None,
                    "workout_plan": None,
                    "diet_plan": None,
                    "sleep_goal": None,
                    "next_step": "supervisor",
                }

                # Invoke LangGraph
                final_state = fitmatrix_graph.invoke(initial_state, config={"recursion_limit": 10})

                ai_messages = [m for m in final_state.get("messages", []) if isinstance(m, AIMessage)]
                reply_text = ai_messages[-1].content if ai_messages else "Guidance produced."
                if isinstance(reply_text, list):
                    reply_text = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in reply_text)

                actual_output = {
                    "status": "success",
                    "reply": reply_text,
                    "readiness_score": final_state.get("readiness_score", 0),
                    "fatigue_flag": final_state.get("fatigue_flag"),
                    "prescribed_workout": final_state.get("prescribed_workout"),
                }
            except Exception as e:
                logger.error("Error executing case %s: %s", case_id, e)
                actual_output = {"status": "error", "reply": f"Execution error: {e}"}
            tracer.end_step(output_summary={"reply_preview": actual_output.get("reply", "")[:60]})

        elif mode == "card_workout":
            tracer.start_step("workout_agent_structured")
            try:
                plan = workout_agent_structured(payload)
                actual_output = {
                    "status": "success",
                    "card_artifact": plan.model_dump(),
                    "reply": f"Workout Plan generated: {len(plan.days)} training days."
                }
            except Exception as e:
                actual_output = {"status": "error", "reply": f"Card error: {e}"}
            tracer.end_step()

        elif mode == "card_diet":
            tracer.start_step("diet_agent_structured")
            try:
                plan = diet_agent_structured(payload)
                actual_output = {
                    "status": "success",
                    "card_artifact": plan.model_dump(),
                    "reply": f"Diet Plan generated: {plan.daily_calories} kcal target."
                }
            except Exception as e:
                actual_output = {"status": "error", "reply": f"Card error: {e}"}
            tracer.end_step()

        tracer_summary = tracer.finish()

        # 2. Deterministic Scoring
        det_result = EvaluatorEngine.evaluate_deterministic(case, actual_output, tracer_summary)

        # 3. LLM-as-a-judge Scoring
        judge_result = await EvaluatorEngine.evaluate_llm_judge(case, actual_output, tracer_summary)

        is_passed = det_result["passed"] and (judge_result["score"] >= 3.5)
        if is_passed:
            passed_count += 1

        total_latency += tracer_summary["total_latency_ms"]
        total_cost += tracer_summary["total_cost_usd"]
        total_judge_score += judge_result["score"]

        case_entry = {
            "test_case_id": case_id,
            "scenario_name": case.get("name", case_id),
            "input_message": user_message,
            "biometrics_summary": {
                "sleep_hours": round(payload.get("sleep_minutes", 0) / 60, 1),
                "steps": payload.get("steps_today", 0),
                "rhr": payload.get("resting_heart_rate_bpm", 0),
            },
            "routing_path": tracer_summary["routing_path"],
            "tool_calls": tracer_summary["tool_calls"],
            "deterministic_passed": det_result["passed"],
            "deterministic_checks": det_result["checks"],
            "violations": det_result["violations"],
            "llm_judge_score": judge_result["score"],
            "llm_judge_rubric": judge_result["rubric"],
            "llm_judge_reasoning": judge_result["reasoning"],
            "latency_ms": tracer_summary["total_latency_ms"],
            "token_usage": tracer_summary["total_tokens"],
            "final_reply": actual_output.get("reply", ""),
            "card_artifact": actual_output.get("card_artifact"),
        }
        case_results.append(case_entry)

    total_cases = len(all_cases) or 1
    avg_latency = round(total_latency / total_cases, 1)
    avg_judge = round(total_judge_score / total_cases, 2)
    pass_rate = round((passed_count / total_cases) * 100, 1)

    run_summary = {
        "run_id": run_id,
        "model_name": model_name,
        "prompt_version": prompt_version,
        "status": "completed",
        "total_cases": total_cases,
        "passed_cases": passed_count,
        "pass_rate": pass_rate,
        "avg_latency_ms": avg_latency,
        "total_cost_usd": round(total_cost, 6),
        "avg_judge_score": avg_judge,
        "cases": case_results,
        "created_at": datetime.utcnow().isoformat(),
    }

    # Persist in MongoDB Atlas if connection is active
    try:
        from app.core.database import _mongo_client
        if _mongo_client is not None:
            cases_models = [EvalCaseTrace(**c) for c in case_results]
            doc = EvalRunDocument(
                run_id=run_id,
                model_name=model_name,
                prompt_version=prompt_version,
                status="completed",
                total_cases=total_cases,
                passed_cases=passed_count,
                pass_rate=pass_rate,
                avg_latency_ms=avg_latency,
                total_cost_usd=round(total_cost, 6),
                avg_judge_score=avg_judge,
                cases=cases_models,
                created_at=datetime.utcnow(),
            )
            import asyncio
            await asyncio.wait_for(doc.insert(), timeout=3.0)
    except Exception as e:
        logger.warning("Could not persist run to MongoDB Atlas (%s), saved in cache.", e)

    _RUNS_CACHE.insert(0, run_summary)
    return run_summary


async def get_all_runs() -> List[Dict[str, Any]]:
    """Returns list of all historical evaluation runs."""
    try:
        from app.core.database import _mongo_client
        if _mongo_client is not None:
            docs = await EvalRunDocument.find().sort("-created_at").limit(20).to_list()
            if docs:
                return [
                    {
                        "run_id": d.run_id,
                        "model_name": d.model_name,
                        "prompt_version": d.prompt_version,
                        "status": d.status,
                        "total_cases": d.total_cases,
                        "passed_cases": d.passed_cases,
                        "pass_rate": d.pass_rate,
                        "avg_latency_ms": d.avg_latency_ms,
                        "total_cost_usd": d.total_cost_usd,
                        "avg_judge_score": d.avg_judge_score,
                        "created_at": d.created_at.isoformat(),
                    }
                    for d in docs
                ]
    except Exception:
        pass

    # Fallback to in-memory cache
    return [
        {k: v for k, v in r.items() if k != "cases"}
        for r in _RUNS_CACHE
    ]


async def get_run_details(run_id: str) -> Optional[Dict[str, Any]]:
    """Returns complete trace and rubric details for a specific run."""
    try:
        from app.core.database import _mongo_client
        if _mongo_client is not None:
            doc = await EvalRunDocument.find_one(EvalRunDocument.run_id == run_id)
            if doc:
                return doc.model_dump()
    except Exception:
        pass

    for r in _RUNS_CACHE:
        if r["run_id"] == run_id:
            return r
    return None
