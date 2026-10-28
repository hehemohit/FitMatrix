"""
FitMatrix Execution & Step Tracer
---------------------------------
Captures step-by-step telemetry across LangGraph node transitions:
  - Node names (supervisor, workout_agent, diet_agent, sleep_agent)
  - Tool calls (name, arguments, output, execution latency)
  - Latency per node and end-to-end (ms)
  - Token consumption (prompt, completion, total) and estimated USD cost
"""

import time
import logging
from typing import List, Dict, Any, Optional
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult

logger = logging.getLogger(__name__)

# Approximate pricing per 1M tokens (USD)
MODEL_PRICING = {
    "gemini-1.5-flash": {"prompt": 0.075 / 1_000_000, "completion": 0.30 / 1_000_000},
    "gemini-2.0-flash": {"prompt": 0.10 / 1_000_000, "completion": 0.40 / 1_000_000},
    "gemini-1.5-pro":   {"prompt": 1.25 / 1_000_000, "completion": 5.00 / 1_000_000},
    "gemini-2.0-pro":   {"prompt": 1.50 / 1_000_000, "completion": 6.00 / 1_000_000},
    "default":          {"prompt": 0.075 / 1_000_000, "completion": 0.30 / 1_000_000},
}


class StepTrace:
    def __init__(self, step_index: int, node_name: str):
        self.step_index = step_index
        self.node_name = node_name
        self.start_time = time.perf_counter()
        self.end_time: Optional[float] = None
        self.latency_ms: int = 0
        self.input_summary: Dict[str, Any] = {}
        self.output_summary: Dict[str, Any] = {}
        self.tool_calls: List[Dict[str, Any]] = []
        self.tokens: Dict[str, int] = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        self.cost_usd: float = 0.0

    def finish(self):
        self.end_time = time.perf_counter()
        self.latency_ms = int((self.end_time - self.start_time) * 1000)

    def to_dict(self) -> dict:
        return {
            "step_index": self.step_index,
            "node_name": self.node_name,
            "latency_ms": self.latency_ms,
            "input_summary": self.input_summary,
            "output_summary": self.output_summary,
            "tool_calls": self.tool_calls,
            "tokens": self.tokens,
            "cost_usd": round(self.cost_usd, 6),
        }


class ExecutionTracer:
    """Session tracer attached to an agent execution turn or evaluation case."""

    def __init__(self, run_id: str, case_id: str = "live_session", model_name: str = "gemini-1.5-flash"):
        self.run_id = run_id
        self.case_id = case_id
        self.model_name = model_name
        self.pricing = MODEL_PRICING.get(model_name, MODEL_PRICING["default"])
        self.start_time = time.perf_counter()
        self.end_time: Optional[float] = None
        self.steps: List[StepTrace] = []
        self._current_step: Optional[StepTrace] = None
        self.total_tokens = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        self.total_cost_usd: float = 0.0
        self.routing_path: List[str] = []
        self.all_tool_calls: List[Dict[str, Any]] = []

    def start_step(self, node_name: str, input_summary: Optional[dict] = None) -> StepTrace:
        if self._current_step:
            self.end_step()

        self.routing_path.append(node_name)
        step = StepTrace(step_index=len(self.steps) + 1, node_name=node_name)
        if input_summary:
            step.input_summary = input_summary
        self._current_step = step
        return step

    def record_tool_call(self, tool_name: str, args: dict, output: Any, latency_ms: int = 0):
        tool_entry = {
            "name": tool_name,
            "args": args,
            "output": output,
            "latency_ms": latency_ms,
            "step": len(self.steps) + 1
        }
        self.all_tool_calls.append(tool_entry)
        if self._current_step:
            self._current_step.tool_calls.append(tool_entry)

    def record_llm_usage(self, prompt_tokens: int, completion_tokens: int):
        total = prompt_tokens + completion_tokens
        step_cost = (prompt_tokens * self.pricing["prompt"]) + (completion_tokens * self.pricing["completion"])
        self.total_tokens["prompt_tokens"] += prompt_tokens
        self.total_tokens["completion_tokens"] += completion_tokens
        self.total_tokens["total_tokens"] += total
        self.total_cost_usd += step_cost

        if self._current_step:
            self._current_step.tokens["prompt_tokens"] += prompt_tokens
            self._current_step.tokens["completion_tokens"] += completion_tokens
            self._current_step.tokens["total_tokens"] += total
            self._current_step.cost_usd += step_cost

    def end_step(self, output_summary: Optional[dict] = None):
        if self._current_step:
            if output_summary:
                self._current_step.output_summary = output_summary
            self._current_step.finish()
            self.steps.append(self._current_step)
            self._current_step = None

    def finish(self) -> dict:
        if self._current_step:
            self.end_step()
        self.end_time = time.perf_counter()
        total_latency_ms = int((self.end_time - self.start_time) * 1000)

        return {
            "run_id": self.run_id,
            "case_id": self.case_id,
            "model_name": self.model_name,
            "total_latency_ms": total_latency_ms,
            "routing_path": self.routing_path,
            "total_steps": len(self.steps),
            "total_tokens": self.total_tokens,
            "total_cost_usd": round(self.total_cost_usd, 6),
            "tool_calls": self.all_tool_calls,
            "steps": [s.to_dict() for s in self.steps],
        }


class LangChainTracerCallback(BaseCallbackHandler):
    """LangChain callback handler to capture token usage and tool calls automatically."""

    def __init__(self, tracer: ExecutionTracer):
        super().__init__()
        self.tracer = tracer
        self._tool_start_time: float = 0.0

    def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        try:
            if response.llm_output and "token_usage" in response.llm_output:
                usage = response.llm_output["token_usage"]
                prompt_tokens = usage.get("prompt_tokens", 0)
                completion_tokens = usage.get("completion_tokens", 0)
                self.tracer.record_llm_usage(prompt_tokens, completion_tokens)
            else:
                # Approximate fallback estimation if API didn't return usage dict
                text_len = sum(len(gen.text) for gen_list in response.generations for gen in gen_list)
                completion_tokens = max(10, text_len // 4)
                prompt_tokens = 150
                self.tracer.record_llm_usage(prompt_tokens, completion_tokens)
        except Exception as e:
            logger.debug("Could not parse token usage: %s", e)

    def on_tool_start(self, serialized: Dict[str, Any], input_str: str, **kwargs: Any) -> None:
        self._tool_start_time = time.perf_counter()

    def on_tool_end(self, output: str, **kwargs: Any) -> None:
        latency_ms = int((time.perf_counter() - self._tool_start_time) * 1000)
        tool_name = kwargs.get("name", "fitness_tool")
        self.tracer.record_tool_call(tool_name=tool_name, args={}, output=output, latency_ms=latency_ms)

