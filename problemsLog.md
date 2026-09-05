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
7. [Problem 7: Android Cleartext Traffic Rejection & Device Network Routing (`AxiosError: Network Error`) — September 6, 2026](#problem-7-android-cleartext-traffic-rejection--device-network-routing-axioserror-network-error--september-6-2026)
8. [Problem 8: Health Connect Biometric Inaccuracies & Static Fallbacks (Steps Discrepancy, Missing `/api/v1/readiness` Endpoint, & Phantom 7.0h Sleep) — September 6, 2026](#problem-8-health-connect-biometric-inaccuracies--static-fallbacks-steps-discrepancy-missing-apiv1readiness-endpoint--phantom-70h-sleep--september-6-2026)

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

## Problem 7: Android Cleartext Traffic Rejection & Device Network Routing (`AxiosError: Network Error`) — September 6, 2026

### Symptoms
- When tapping **"Generate Workout Plan"** from the Agent Chat screen or Plans Studio, the action failed with:
  > `generatePlan(workout) failed: [AxiosError: Network Error]`
- The conversational chat appeared to respond to prompts, but was actually rendering the local client catch-block fallback message inside a coach bubble (*"Cannot reach backend. Check that the server is running and adb reverse is active"*).

### Root Cause Analysis
1. **Android 9+ Cleartext Security Policy**:
   Starting with Android 9 (API 28), all unencrypted `http://` network traffic is disabled by default. In `mobile/android/app/src/main/AndroidManifest.xml`, `<application>` lacked `android:usesCleartextTraffic="true"`. Android's native OkHttp network stack instantly aborted all outgoing `http://` calls with `CLEARTEXT communication to ... not permitted by network security policy`, reported by Axios as a generic `Network Error`.
2. **Device vs. Emulator IP Routing Mismatch**:
   In `mobile/src/api/coachApi.ts`, `BASE_URL` was hardcoded to `'http://10.0.2.2:8000'`.
   - `10.0.2.2` is a virtual router loopback alias specific **only** to the Android Studio Emulator.
   - When running on a physical Android phone over USB with `adb reverse tcp:8000 tcp:8000`, the phone can only access the host PC via `http://localhost:8000`. Any request directed to `10.0.2.2` failed with no route to host.
3. **Pydantic to TypeScript Case Mismatch**:
   Backend endpoints returned Pydantic schemas serialized in `snake_case` (`target_muscle_groups`, `rest_seconds`, `daily_calories`, etc.), whereas frontend components expected `camelCase` (`targetMuscleGroups`, `restSeconds`, `dailyCalories`). Rendering undefined arrays like `day.targetMuscleGroups.map` would subsequently throw runtime errors once data was received.

### Resolution
1. **Enabled Cleartext HTTP in `AndroidManifest.xml`**:
   ```xml
   <application
     android:name=".MainApplication"
     android:theme="@style/AppTheme"
     android:usesCleartextTraffic="true">
   ```
2. **Unified `BASE_URL` & Auto-Fallback Interceptor in `coachApi.ts`**:
   - Defaulted `BASE_URL` to `http://localhost:8000` (compatible with `adb reverse` on physical devices and emulators).
   - Added an Axios response interceptor that intercepts `ERR_NETWORK` errors and automatically retries with `http://10.0.2.2:8000` (and vice-versa), seamlessly supporting both hardware and emulator setups.
3. **Structured Plan Normalizers**:
   Added `normalizeWorkoutPlan`, `normalizeDietPlan`, and `normalizeSleepGoal` in `coachApi.ts` to seamlessly convert Python `snake_case` fields into the `camelCase` objects required by the UI.
4. **Enhanced UI Failure Feedback**:
   Updated `AgentChatScreen.tsx` and `PlansStudioScreen.tsx` to display an explicit `Alert.alert` when plan generation fails rather than failing silently.

---

## Problem 8: Health Connect Biometric Inaccuracies & Static Fallbacks (Steps Discrepancy, Missing `/api/v1/readiness` Endpoint, & Phantom 7.0h Sleep) — September 6, 2026

### Symptoms
- The Home dashboard displayed **6,400 steps** instead of the user's real step count displayed in Google Fit for "Today".
- The **Readiness Score** was permanently stuck at **`80`** on every launch and sync.
- The **Sleep** metric tile permanently displayed **`7.0 hrs`**, even when no sleep was recorded or when real sleep hours differed.

### Root Cause Analysis
1. **Rolling 24-Hour Window & Duplicate Step Accumulation**:
   In `mobile/src/services/healthService.ts`, step queries computed `startTime` using `now.getTime() - 24 * 60 * 60 * 1000`. Google Fit measures "Today" starting strictly from local calendar midnight (`00:00:00`). The rolling 24-hour window pulled in yesterday afternoon/evening steps and added them to today's steps. Furthermore, raw `readRecords('Steps')` summed overlapping records from multiple data sources (e.g. phone hardware pedometer + Google Fit) without deduplication, inflating the step count.
2. **Missing `/api/v1/readiness` Endpoint on Backend**:
   `backend/app/main.py` did not implement an endpoint for `POST /api/v1/readiness`. When the mobile client's `computeReadiness` called the API, it received a `404 Not Found`. This triggered the client-side catch block in `useTrainerStore.ts`:
   ```typescript
   const sleepRatio = Math.min(1.0, snapshot.sleepMinutes / 420.0);
   let score = Math.round(sleepRatio * 80); // 👈 Hardcoded static 80!
   ```
   Because `sleepMinutes` was defaulted to 420, `sleepRatio` was `1.0`, pinning the readiness score permanently to 80.
3. **Defective Permission Request Logic & Hardcoded Sleep Baseline**:
   - In `healthService.ts`, permission requests were wrapped in `if (!granted || granted.length === 0)`. Because `Steps` had been granted during earlier debugging, `granted.length` was greater than 0, causing the app to **never request the missing `SleepSession` permission** from Android.
   - `hasSleep` remained `false`, bypassing the sleep query entirely.
   - `DEFAULT_SNAPSHOT` and `healthService.ts` hardcoded `sleepMinutes: 420`. Because no sleep was queried, `420 / 60` was displayed on the Dashboard as `7.0 hrs` as if it were real data.

### Resolution
1. **Local Calendar Day Midnight Reset (`startOfToday`)**:
   In `mobile/src/services/healthService.ts`, anchored `startTimeToday` to local midnight `new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)`. Steps, active calories, and workouts are now strictly bounded to Today.
2. **Native Deduplication via `aggregateRecord`**:
   Replaced raw `readRecords` summing with Health Connect's native `aggregateRecord({ recordType: 'Steps', ... })` and `aggregateRecord({ recordType: 'ActiveCaloriesBurned', ... })`. This leverages Android's built-in record deduplication engine to match Google Fit exactly.
3. **Implemented `/api/v1/readiness` & Multi-Factor Scoring**:
   - Added `ReadinessRequest`, `ReadinessResponse`, and `@app.post("/api/v1/readiness")` in `backend/app/main.py`.
   - Upgraded `evaluate_readiness` in `backend/app/tools/fitness_tools.py` with a true 1–100 athletic readiness model:
     - **Sleep duration:** up to 50 pts (calibrated for 7–8.5h recovery window).
     - **Resting Heart Rate:** up to 30 pts (rewards lower RHR; penalizes elevated HR).
     - **Activity balance:** up to 20 pts (penalizes acute overtraining >16k steps or massive calorie debt).
4. **Proactive Missing Permission Requests & Sleep Query Overhaul**:
   - The app now compares currently granted permissions against `REQUIRED_PERMISSIONS` and prompts the user if any permission (including `SleepSession`) is missing.
   - Implemented dual-layer sleep queries: `aggregateRecord` (last 48h) falling back to `readRecords` (last 7 days) to identify the latest completed night's sleep.
   - Removed the hardcoded `420` default (`sleepMinutes: 0`). When no sleep is recorded in Health Connect, the Dashboard cleanly displays **`--`** instead of a misleading fake `7.0 hrs`, while safely injecting a neutral 7h baseline to background AI agents.

---

*FitMatrix Architecture & Problem Log — Maintained by Antigravity Engineering*

