# FitMatrix — Multi-Agent Autonomous Fitness Coach

> **An AI-powered, biometric-driven personal training system.** FitMatrix combines a React Native mobile client with a LangGraph multi-agent backend to deliver real-time, data-grounded workout, recovery, and nutrition coaching — personalized to how your body actually performed today.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Agent System](#agent-system)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Mobile Setup](#mobile-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Health Connect Integration](#health-connect-integration)
- [How the Coaching Pipeline Works](#how-the-coaching-pipeline-works)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## Overview

FitMatrix is not a static fitness app. It is a **real-time, biometric-aware coaching engine** where a fleet of AI specialists — each with a defined domain — collaborate behind the scenes to answer one question every day:

> *"Given how I slept, how much I've moved, and what I've already done — what should I train, eat, and prioritize right now?"*

The user opens the mobile app. Their wearable data (steps, sleep, workouts) is pulled automatically from **Android Health Connect**. They type a message — "what should I train today?" — and within seconds a multi-agent system routes the query through a sleep recovery scorer, a strength & conditioning coach, and a sports nutritionist, returning a grounded, context-aware plan.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile Client (Android)               │
│                   React Native 0.87 + TS                 │
│                                                          │
│  ┌──────────────────┐     ┌────────────────────────┐    │
│  │  Health Connect  │────▶│   healthService.ts     │    │
│  │  (Steps, Sleep,  │     │  getSdkStatus()        │    │
│  │   Exercise)      │     │  getGrantedPermissions()│   │
│  └──────────────────┘     │  readRecords()         │    │
│                           └────────────┬───────────┘    │
│                                        │ HealthSnapshot  │
│  ┌─────────────────────────────────────▼──────────────┐ │
│  │                    App.tsx                         │ │
│  │   Chat UI  ·  Metric Cards  ·  Workout Banner      │ │
│  └─────────────────────────────┬──────────────────────┘ │
│                                │ POST /api/v1/chat       │
└────────────────────────────────┼────────────────────────┘
                                 │ axios (30s timeout)
                                 ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (FastAPI + LangGraph)               │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              LangGraph StateGraph                │    │
│  │                                                  │    │
│  │  START ──▶ [Supervisor] ──▶ [sleep_agent]  ──┐  │    │
│  │                  ▲              │              │  │    │
│  │                  │         readiness_score     │  │    │
│  │                  │         fatigue_flag        │  │    │
│  │                  │              │              │  │    │
│  │                  └──────────────┘              │  │    │
│  │                  ▲                             │  │    │
│  │                  │──── [workout_agent] ────────┘  │    │
│  │                  │         prescribed_workout      │    │
│  │                  │                                 │    │
│  │                  └──── [diet_agent] ───────────────┘   │
│  │                              ▼                    │    │
│  │                            END                    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  PostgreSQL (pgvector) · Redis · Docker Compose          │
└─────────────────────────────────────────────────────────┘
```

---

## Agent System

FitMatrix uses a **Supervisor-Specialist** pattern powered by [LangGraph](https://github.com/langchain-ai/langgraph). Every user message flows through a directed graph of agents that share state.

### `FitMatrixState` — Shared Graph State

| Field | Type | Source |
|---|---|---|
| `messages` | `List[BaseMessage]` | Accumulates across agents |
| `steps_today` | `int` | Mobile → Health Connect |
| `sleep_minutes` | `int` | Mobile → Health Connect |
| `logged_workouts` | `List[dict]` | Mobile → Health Connect |
| `readiness_score` | `int` | Computed by Sleep Agent |
| `fatigue_flag` | `str` | Computed by Sleep Agent |
| `remaining_calories` | `int` | Default 2400 kcal |
| `remaining_protein_g` | `int` | Default 160 g |
| `prescribed_workout` | `str` | Set by Workout Agent |
| `next_step` | `str` | Set by Supervisor |

---

### Supervisor Node (`gpt-4o`, `temperature=0`)

The **Master Orchestrator**. Reads the full shared state and decides which specialist to invoke using structured output (`RouteDecision`).

**Routing rules:**
1. `readiness_score == 0` → route to `sleep_agent` first
2. Workout not yet prescribed → route to `workout_agent`
3. Diet/nutrition mentioned → route to `diet_agent`
4. All advice satisfied → `FINISH`

---

### Sleep Agent — deterministic tool

Uses the `evaluate_readiness` LangChain tool to compute a **recovery score (0–100)** from biometrics. No LLM call — pure deterministic scoring.

```
readiness_score = floor(min(sleep_minutes / 420, 1.0) × 80)
if steps_today > 15,000:  score -= 10
fatigue_flag = "high_fatigue" if score < 60 else "nominal"
```

---

### Workout Agent (`gpt-4o`, `temperature=0.2`)

**Head Strength & Conditioning Coach.** Receives readiness score, fatigue flag, and today's sessions. Returns a `prescribed_workout` in ≤ 2 sentences.

| Condition | Prescription |
|---|---|
| `high_fatigue` or `readiness < 60` | Mobility, technique drills, active recovery |
| `nominal` and `readiness >= 60` | High-intensity compounds, heavy bag, conditioning |

---

### Diet Agent (`gpt-4o`, `temperature=0.2`)

**Lead Sports Nutritionist.** Receives the prescribed workout and remaining macro targets. Returns carb/protein timing recommendations in ≤ 3 sentences.

---

## Tech Stack

### Mobile

| Layer | Technology |
|---|---|
| Framework | React Native 0.87 (TypeScript) |
| Health Data | `react-native-health-connect` v4.1 |
| State Management | Zustand v5 |
| Storage | react-native-mmkv |
| HTTP Client | Axios (30 s timeout) |
| Native Modules | React Native Nitro Modules |

### Backend

| Layer | Technology |
|---|---|
| API Server | FastAPI 0.115+ |
| Agent Orchestration | LangGraph 0.2+ |
| LLM Provider | OpenAI GPT-4o via LangChain |
| Database | PostgreSQL 16 + pgvector |
| Cache / Queue | Redis 7 |
| Containerization | Docker Compose |
| Runtime | Python 3.11+ / Uvicorn |

---

## Project Structure

```
FitMatrix/
├── docker-compose.yml              # PostgreSQL (pgvector) + Redis services
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                 # FastAPI app, CORS, /api/v1/chat endpoint
│       ├── core/
│       │   └── config.py           # Env-based settings (OpenAI key, DB URLs)
│       ├── graph/
│       │   ├── state.py            # FitMatrixState TypedDict (shared agent state)
│       │   ├── supervisor.py       # Supervisor node — routes between agents
│       │   └── workflow.py         # StateGraph wiring and compilation
│       ├── agents/
│       │   ├── sleep_agent.py      # Deterministic recovery scoring
│       │   ├── workout_agent.py    # GPT-4o strength & conditioning prescriptions
│       │   └── diet_agent.py       # GPT-4o macro timing recommendations
│       └── tools/
│           └── fitness_tools.py    # LangChain @tools: evaluate_readiness, calculate_remaining_macros
│
└── mobile/
    ├── App.tsx                     # Root — health sync, chat UI, metric cards
    ├── index.js
    ├── android/
    │   └── app/src/main/java/com/fitmatrixmobile/
    │       └── MainActivity.kt     # Registers HealthConnectPermissionDelegate
    └── src/
        ├── api/
        │   └── coachApi.ts         # Axios client → POST /api/v1/chat
        ├── services/
        │   └── healthService.ts    # Health Connect sync (SDK status, permissions, readRecords)
        └── types/
            └── schema.ts           # BiometricPayload, CoachResponse TypeScript interfaces
```

---

## Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 22.11.0 |
| Python | ≥ 3.11 |
| Docker Desktop | Latest |
| Android SDK | API Level 26+ |
| Java JDK | 17 |
| OpenAI API Key | Required |

> **Note:** Health Connect is Android-only. iOS support is planned.

---

### Backend Setup

**1. Start infrastructure**

```bash
docker compose up -d
```

Starts `fitmatrix_postgres` (port 5432) and `fitmatrix_redis` (port 6379).

**2. Create virtual environment**

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
```

**3. Install dependencies**

```bash
pip install -r requirements.txt
```

**4. Configure environment**

```bash
cp .env.example .env   # then fill in your OPENAI_API_KEY
```

**5. Run the server**

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Verify:

```bash
curl http://localhost:8000/health
# {"status":"online","project":"FitMatrix AI Engine"}
```

---

### Mobile Setup

**1. Install dependencies**

```bash
cd mobile
npm install
```

**2. Connect device**

For a **physical device via USB**:
```bash
adb reverse tcp:8000 tcp:8000
```

For an **Android emulator**, change `coachApi.ts`:
```typescript
const BASE_URL = 'http://10.0.2.2:8000';
```

**3. Start Metro**

```bash
npx react-native start --reset-cache
```

**4. Build and run**

```bash
npx react-native run-android
```

Or manually:
```bash
cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

**5. Grant Health Connect permissions**

On first launch a permissions dialog will appear for Steps, Sleep Sessions, and Exercise Sessions.

---

## Environment Variables

`backend/.env`:

```env
# Required
OPENAI_API_KEY=sk-...

# Optional (defaults shown)
PROJECT_NAME=FitMatrix AI Engine
HOST=0.0.0.0
PORT=8000
DATABASE_URL=postgresql://fitmatrix_admin:fitmatrix_dev_pass@localhost:5432/fitmatrix_db
REDIS_URL=redis://localhost:6379/0
```

---

## API Reference

### `GET /health`

```json
{ "status": "online", "project": "FitMatrix AI Engine" }
```

---

### `POST /api/v1/chat`

**Request:**

```json
{
  "user_id": "usr_dev_1",
  "message": "What should I train today?",
  "steps_today": 8432,
  "sleep_minutes": 390,
  "logged_workouts": [
    { "type": "37", "duration_min": 45 }
  ]
}
```

**Response:**

```json
{
  "status": "success",
  "readiness_score": 74,
  "fatigue_flag": "nominal",
  "prescribed_workout": "Hit 4x5 back squats at 80% 1RM followed by 3x8 Romanian deadlifts.",
  "reply": "Pre-load with 60g carbs 90 minutes before your session and target 40g whey protein immediately post-lift."
}
```

| Field | Description |
|---|---|
| `readiness_score` | 0–100 recovery score (sleep + steps) |
| `fatigue_flag` | `"nominal"` or `"high_fatigue"` |
| `prescribed_workout` | Training prescription for today |
| `reply` | Final agent conversational response |

---

## Health Connect Integration

FitMatrix reads from Android Health Connect:

| Record Type | Used For |
|---|---|
| `Steps` | Daily activity load → fatigue input |
| `SleepSession` | Total sleep duration → readiness input |
| `ExerciseSession` | Session history → workout volume context |

**Permission flow in `healthService.ts`:**

1. `getSdkStatus()` — verify Health Connect is available
2. `initialize()` — bind the Health Connect client
3. `getGrantedPermissions()` — check existing grants silently
4. `requestPermission()` — prompt only if no grants exist
5. `readRecords()` — fetch last 24 hours for each granted type

**Critical native setup in `MainActivity.kt`:**

```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    HealthConnectPermissionDelegate.setPermissionDelegate(this)
}
```

This call registers the Android `ActivityResultLauncher` contract required by the native library. Without it, any call to `requestPermission` will throw `UninitializedPropertyAccessException` and crash the app.

---

## How the Coaching Pipeline Works

```
1. User: "What should I train today?"

2. App reads healthData: { steps: 8432, sleepMinutes: 390, workouts: [...] }

3. POST /api/v1/chat with biometrics + message

4. FastAPI builds initial FitMatrixState

5. LangGraph: START → Supervisor
   readiness_score == 0 → routes to sleep_agent

6. sleep_agent (deterministic):
   score = floor((390/420) × 80) = 74
   flag = "nominal"
   State: { readiness_score: 74, fatigue_flag: "nominal" }

7. sleep_agent → Supervisor
   No workout prescribed → routes to workout_agent

8. workout_agent (GPT-4o):
   Input: readiness=74, nominal, sessions=[...]
   Output: "Hit 4x5 back squats..." → prescribed_workout set

9. workout_agent → Supervisor
   All requests satisfied → FINISH

10. FastAPI returns last message + state fields → JSON

11. App updates: readiness card, workout banner, chat bubble
```

---

## Roadmap

### Near-term
- [ ] Persistent user sessions stored in PostgreSQL
- [ ] Conversation memory across days using LangGraph checkpointers
- [ ] Heart rate variability (HRV) from Health Connect
- [ ] Progressive overload tracking (week-over-week load management)

### Mid-term
- [ ] iOS support via HealthKit
- [ ] Nutrition logging with food database integration
- [ ] Weekly periodized training plan generation
- [ ] Push notifications for sleep windows and pre-workout fueling

### Long-term
- [ ] RAG knowledge base (exercise science papers via pgvector)
- [ ] Multi-user support with user profiles and history
- [ ] Wearable integrations: Garmin, Whoop, Oura Ring
- [ ] Coach personality and modality customization

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Ensure both `uvicorn` and `npx react-native start` are healthy before committing
4. Submit a pull request with a clear description of the change

---

*Built with LangGraph · FastAPI · React Native · Android Health Connect*
