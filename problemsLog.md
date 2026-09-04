# FitMatrix — Engineering Problems & Solutions Log

This document provides an in-depth technical record of all major engineering challenges, edge cases, architectural bugs, and systemic issues encountered during the development of FitMatrix, along with root-cause analyses and their concrete solutions.

---

## Table of Contents

1. [Problem 1: 500 Internal Server Error & Infinite Multi-Agent Routing Loop](#problem-1-500-internal-server-error--infinite-multi-agent-routing-loop)
2. [Problem 2: Gemini API Output Format Incompatibility (List vs. String)](#problem-2-gemini-api-output-format-incompatibility-list-vs-string)
3. [Problem 3: Gemini Prefilling Error with Trailing AIMessage](#problem-3-gemini-prefilling-error-with-trailing-aimessage)
4. [Problem 4: Client Request Timeout (30s Axios Limit vs. Multi-Agent Chain Latency)](#problem-4-client-request-timeout-30s-axios-limit-vs-multi-agent-chain-latency)
5. [Problem 5: Out-of-Context Response on Dietary Follow-up ("iam pure veg")](#problem-5-out-of-context-response-on-dietary-follow-up-iam-pure-veg)
6. [Problem 6: Naive Full-History Appending ($O(N^2)$ Token Bloat & Amnesia)](#problem-6-naive-full-history-appending-on2-token-bloat--amnesia)

---

## Problem 1: 500 Internal Server Error & Infinite Multi-Agent Routing Loop

### Symptoms
- Calling `POST /api/v1/chat` returned `500 Internal Server Error`.
- FastAPI console logs showed Google Gemini rate-limit errors (`429 Quota Exceeded`) or LangGraph recursion limit exceptions (`GraphRecursionError`).

### Root Cause Analysis
The supervisor node in `backend/app/graph/supervisor.py` relied on an LLM invocation (`gpt-4o` / `gemini`) to decide the `next_agent`. 
1. After `workout_agent` finished and returned to `supervisor`, the supervisor saw the same message history with an appended synthetic prompt (`"Is further specialist advice required?"`).
2. The routing LLM repeatedly re-routed back to `workout_agent` or `sleep_agent` without ever emitting `FINISH`.
3. This created a rapid ping-pong cycle bouncing between agents in fractions of a second, hitting the API rate limit or LangGraph's default recursion limit (`recursion_limit=6`), crashing FastAPI.

### Resolution
1. **Replaced LLM-Based Routing with Pure Deterministic Routing**:
   Converted `supervisor_node` from an LLM call to pure Python state & intent checks. Zero LLM calls are made for routing decisions, completely eliminating recursion loops, token consumption, and rate-limit exposure at the orchestration layer.
2. **Adjusted LangGraph Recursion Limit**:
   In `backend/app/main.py`, increased `recursion_limit` to `10`. A full 3-agent pipeline (`supervisor` → `sleep` → `supervisor` → `workout` → `supervisor` → `diet` → `supervisor` → `FINISH`) requires 7 node transitions; a limit of 10 gives breathing room while strictly halting any runaway loops.

---

## Problem 2: Gemini API Output Format Incompatibility (List vs. String)

### Symptoms
- Agents threw `TypeError: sequence item 0: expected str instance, dict found` or stored stringified JSON blocks like `[{'type': 'text', 'text': '...'}]` in `prescribed_workout`.
- The mobile UI displayed raw JSON fragments inside the workout focus banner.

### Root Cause Analysis
Unlike OpenAI (which returns `response.content` strictly as a string), Google Gemini models (`gemini-3.5-flash-lite`, `gemini-1.5-flash`) via `ChatGoogleGenerativeAI` frequently return `response.content` as a list of content dictionaries/blocks (`[{'type': 'text', 'text': '...'}]`), especially when multimodal or function-calling schemas are active. Downstream components expecting a `str` threw exceptions or garbled formatting.

### Resolution
Implemented defensive content normalization in all agent nodes and at the API boundary in `main.py`:
```python
content = response.content
if isinstance(content, list):
    content = "".join(
        part.get("text", "") if isinstance(part, dict) else str(part)
        for part in content
    )
```

---

## Problem 3: Gemini Prefilling Error with Trailing AIMessage

### Symptoms
- Backend crashed with `GoogleGenerativeAIError: The last message must be a user turn` or `Assistant prefilling is not supported`.

### Root Cause Analysis
In multi-agent sequential workflows, Agent A appends an `AIMessage` to `state["messages"]`. When the supervisor then routed to Agent B (`workout_agent` or `diet_agent`), `state["messages"]` ended with Agent A's `AIMessage`. Gemini's API rejects prompts where the final turn in the message list is an assistant message (it interprets this as unsupported assistant message prefilling).

### Resolution
Added an end-of-turn guard in each LLM agent node prior to invoking the model:
```python
if windowed_messages and isinstance(windowed_messages[-1], AIMessage):
    windowed_messages.append(HumanMessage(content="What should I do today?"))
elif not windowed_messages:
    windowed_messages = [HumanMessage(content="What should I do today?")]
```

---

## Problem 4: Client Request Timeout (30s Axios Limit vs. Multi-Agent Chain Latency)

### Symptoms
- When a user asked for a comprehensive plan (e.g. *"Plan my diet and workout for today"*), the uvicorn terminal logged `HTTP/1.1 200 OK`, but the mobile screen displayed:
  > *"Error connecting to FitMatrix agent backend."*

### Root Cause Analysis
The request executed a 3-agent chain:
`sleep_agent (deterministic)` → `workout_agent (Gemini LLM)` → `diet_agent (Gemini LLM)`.
On free-tier Gemini endpoints, each LLM call can take 8–15 seconds during peak loads. Two sequential LLM calls plus network latency frequently took 32–45 seconds. The React Native mobile client had Axios configured with `timeout: 30000` (30 seconds). Axios aborted the connection before the server finished, even though the server successfully completed with `200 OK`.

### Resolution
1. **Increased Axios Timeout**:
   In `mobile/src/api/coachApi.ts`, raised `timeout` from `30000ms` to `90000ms` (90 seconds).
2. **Granular Client Error Handling**:
   In `mobile/App.tsx`, updated the catch block to distinguish between:
   - `ECONNABORTED` / timeout: *"Request timed out — the multi-agent chain is taking longer than expected. Please try again."*
   - Server error response: Displays server detail message and HTTP status.
   - Network unreachable: *"Cannot reach backend. Check that the server is running and adb reverse is active."*

---

## Problem 5: Out-of-Context Response on Dietary Follow-up ("iam pure veg")

### Symptoms
- User asked: *"plan my diet for today"* → Coach returned a meal plan.
- User followed up: *"iam pure veg"* → Coach replied with a workout prescription (e.g. *"Execute 4x5 back squats..."*), completely ignoring the dietary modification.

### Root Cause Analysis
Three compounding issues caused this failure:
1. **Stateless Frontend**: `App.tsx` only sent `message: userPrompt` on each request without past messages. When the user sent `"iam pure veg"`, the backend received only that 3-word string with zero knowledge of the prior diet discussion.
2. **Rigid Supervisor Routing**: The supervisor always forced `if not workout: return "workout_agent"`. Because state was initialized with `prescribed_workout: None` on every request, it routed `"iam pure veg"` to the Strength & Conditioning Coach (`workout_agent`).
3. **Missing Vocabulary**: The word `"veg"` was not included in `_DIET_KEYWORDS`. The supervisor did not recognize `"iam pure veg"` as a diet intent.

### Resolution
1. **Multi-Turn Chat History**:
   Updated `BiometricPayload` in `main.py` and `App.tsx` to pass `history` (`role` and `text`).
2. **Intent-Aware Routing**:
   Updated `supervisor.py` to inspect the latest user turn. Pure diet intents (e.g. `"veg"`, `"vegetarian"`, `"vegan"`, `"paneer"`, `"tofu"`) route directly to `diet_agent`, bypassing `workout_agent`.
3. **Dietary Constraint Adherence**:
   Updated `diet_agent.py`'s system prompt to strictly adapt to user dietary constraints (pure veg, vegan, allergies).

---

## Problem 6: Naive Full-History Appending ($O(N^2)$ Token Bloat & Amnesia)

### Symptoms
While Problem 5 enabled conversational memory, passing full raw message history introduced architectural vulnerabilities:
- **$O(N^2)$ Token Explosion**: Every turn sent all previous turns, driving token consumption and latency up quadratically.
- **Context Degradation ("Lost in the Middle")**: LLMs hallucinated or fixated on obsolete instructions buried deep in raw text.
- **Amnesia Upon Truncation**: If history was sliced to a fixed window (e.g. last 4 turns), the agent eventually forgot essential permanent facts (e.g., that the user is pure vegetarian or training for hypertrophy).

### Architectural Solution: Decoupling State from Chat

We implemented **Structured State & Entity Extraction**:

```
User Input ──▶ [Deterministic Extractor (<1ms)] ──▶ Updates user_profile & daily_log
                                                            │
                                        ┌───────────────────┴───────────────────┐
                                        ▼                                       ▼
                     Injected into Agent System Prompt                Conversation Window
                     (~80-120 tokens, constant O(1))             (Strictly last 2 messages)
```

1. **Lightweight Entity Extractor (`backend/app/graph/extractor.py`)**:
   - Zero-latency regex/pattern engine running before agents.
   - Extracts:
     - `dietary_preference`: `"pure_vegetarian"`, `"vegan"`, `"keto"`, `"jain"`, `"omnivore"`.
     - `fitness_goal`: `"hypertrophy"`, `"fat_loss"`, `"strength"`, `"endurance"`.
     - `allergies`: e.g. `peanuts`, `dairy`.
     - `daily_log`: `meals_logged`, `workouts_completed`.
     - `current_topic`: `diet_planning`, `workout_planning`, `combined`, `general`.
2. **$O(1)$ Token Footprint**:
   - `workout_agent.py` and `diet_agent.py` inject `user_profile` and `daily_log` as a compact JSON object in the `SystemMessage`.
   - The message list passed to the LLM is windowed to **strictly the last 2 messages** (recency window).
3. **End-to-End State Round-Trip**:
   - `main.py` accepts and returns `user_profile` and `daily_log`.
   - `App.tsx` retains `userProfile` and `dailyLog` across the session, sending only the 2 most recent messages over the network.
   - **Result**: Even after 50+ turns without mentioning vegetarianism, any diet query automatically respects `"pure_vegetarian"` because the constraint lives permanently in structured state, not volatile chat text.

---

*FitMatrix Architecture & Problem Log — Maintained by Antigravity Engineering*
