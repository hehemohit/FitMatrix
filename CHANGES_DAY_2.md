# FitMatrix — Day 2 Architecture & Engineering Updates

> **Date:** September 6, 2026  
> **Summary:** Complete architectural evolution of FitMatrix from a single-screen monolithic prototype into a production-ready 4-screen modular mobile application, backed by a dual-mode multi-agent backend (conversational + structured JSON artifacts), an expanded Android Health Connect sensor pipeline, and high-performance offline MMKV state persistence.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Evolution](#2-system-architecture-evolution)
3. [Frontend: 4-Screen Bottom Tab Navigation](#3-frontend-4-screen-bottom-tab-navigation)
4. [Frontend: Custom Component Design System](#4-frontend-custom-component-design-system)
5. [Hardware Pipeline: Android Health Connect Expansion](#5-hardware-pipeline-android-health-connect-expansion)
6. [State Management: Zustand + MMKV v4 Persistence](#6-state-management-zustand--mmkv-v4-persistence)
7. [Backend: Deterministic Readiness & Structured Plan Engine](#7-backend-deterministic-readiness--structured-plan-engine)
8. [Native Android Configuration & Build Fixes](#8-native-android-configuration--build-fixes)
9. [Detailed File Modification Changelog](#9-detailed-file-modification-changelog)
10. [Verification & Quality Assurance](#10-verification--quality-assurance)

---

## 1. Executive Summary

On Day 1, FitMatrix proved the core viability of multi-agent LLM coaching via LangGraph (Sleep Scorer, Workout Coach, Dietitian) connected to a single monolithic `App.tsx` screen. However, the app suffered from UI clutter, lacked structured plan visualization, had no persistent user profile, and only pulled basic step/sleep counts.

**Day 2 transformed the entire stack:**
- **Refactored Frontend**: Deconstructed the 200+ line monolithic `App.tsx` into a modular 4-screen bottom tab navigation (`Dashboard`, `Agent Hub`, `Plan Studio`, `Profile`).
- **Expanded Biometrics**: Extended Health Connect to read **HeartRate** (resting HR proxy) and **ActiveCaloriesBurned** with graceful hardware degradation.
- **Dual-Mode Backend**: Decoupled general conversation from artifact generation. Added dedicated endpoints returning validated JSON (`WorkoutPlanSchema`, `DietPlanSchema`, `SleepGoalSchema`) via LangChain structured output.
- **Instant Readiness**: Built an ultra-fast (<1ms) deterministic `/api/v1/readiness` endpoint that scores recovery without invoking costly LLMs.
- **Local Persistence**: Integrated Zustand with MMKV v4 for zero-latency local caching of user profiles, biometrics, and generated plans across app restarts.

---

## 2. System Architecture Evolution

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FITMATRIX CLIENT (REACT NATIVE)                 │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │             AppNavigator (@react-navigation/bottom-tabs)         │  │
│  │                                                                  │  │
│  │   [ Dashboard ]       [ Agent Hub ]   [ Plan Studio ] [ Profile ]│  │
│  │   • Live Health ring  • Chat tabs     • Active routine• Bio Form │  │
│  │   • Metric grid       • Quick actions • Meal macros   • Chips    │  │
│  │   • Nutrition card    • LLM stream    • Sleep targets • Storage  │  │
│  └─────────┬───────────────────┬───────────────┬─────────────┬──────┘  │
│            │                   │               │             │         │
│            ▼                   ▼               ▼             ▼         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                  useTrainerStore (Zustand + MMKV v4)             │  │
│  │     Transient: messages, sensor snapshot, loading indicators     │  │
│  │     Persistent: userProfile, dailyLog, workout/diet/sleep plans  │  │
│  └─────────────────────────────┬────────────────────────────────────┘  │
│                                │                                       │
│    ┌───────────────────────────┴────────────────────────────┐         │
│    ▼                                                        ▼         │
│  ┌───────────────────────────────┐     ┌────────────────────────────┐  │
│  │  Health Connect Client        │     │  Coach & Agent API Client  │  │
│  │  Steps · Sleep · Workouts     │     │  Axios (90s timeout)       │  │
│  │  HeartRate · ActiveCalories   │     │  adb reverse / 10.0.2.2    │  │
│  └───────────────────────────────┘     └─────────────┬──────────────┘  │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │ HTTP / JSON
                                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   FASTAPI + LANGGRAPH AGENT ENGINE                     │
│                                                                        │
│  ┌────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │ POST /api/v1/readiness │  │ POST /api/v1/chat (Conversational)   │  │
│  │ Deterministic formula  │  │ Recency window (2 turns)             │  │
│  │ <1ms latency, 0 tokens │  │ Supervisor ──▶ Specialist fleet      │  │
│  └────────────────────────┘  └──────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ POST /api/v1/plan/* (Structured JSON Artifacts)                  │  │
│  │ • /plan/workout ──▶ WorkoutPlanSchema (sets, reps, rest, rpe)    │  │
│  │ • /plan/diet    ──▶ DietPlanSchema (macro splits, meals)         │  │
│  │ • /plan/sleep   ──▶ SleepGoalSchema (wind-down, sleep window)    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend: 4-Screen Bottom Tab Navigation

### 1. Dashboard (`DashboardScreen.tsx`)
- **Visual Readiness Gauge**: Displays dynamic recovery score (0–100) computed from real sleep and step counts.
- **Activity Metric Grid**: 2x2 grid rendering **Steps**, **Active Calories**, **Resting Heart Rate**, and **Sleep Duration** with distinct iconography and accent colors.
- **Nutrition Overview**: Macro card tracking daily calories and protein consumed vs. daily target.
- **Data Source Indicator**: Status badge confirming real-time Health Connect synchronization.
- **Pull-to-Refresh & Skeleton Loader**: Integrated `RefreshControl` and full-screen syncing skeleton on cold start.

### 2. Agent Hub (`AgentChatScreen.tsx`)
- **Specialist Workspace Tabs**: Quick filters for Workout Planner, Diet Builder, and Sleep Architect.
- **Direct Plan Generation**: One-tap "Generate Structured Plan" CTA button that immediately triggers structured plan creation and routes to Plan Studio.
- **Interactive Chat**: Keyboard-avoiding conversation thread with streaming response states and coach avatar labels.

### 3. Plan Studio (`PlansStudioScreen.tsx`)
- **Artifact Renderer**: Tabbed view displaying the user's active **Workout Routine**, **Meal Plan**, and **Sleep Protocol**.
- **Interactive Empty States**: If no plan exists, renders domain-specific call-to-actions that trigger the respective backend structured generator.
- **Regenerate Actions**: Allows on-demand plan rebuilding tailored to updated daily biometrics.

### 4. Profile & Settings (`ProfileScreen.tsx`)
- **Biometric Inputs**: Form inputs for user weight (kg), height (cm), and age.
- **Interactive Chip Selectors**:
  - Fitness Goals: *Hypertrophy*, *Fat Loss*, *Strength*, *Endurance*.
  - Dietary Preferences: *Pure Vegetarian*, *Vegan*, *Omnivore*, *Keto*.
  - Activity Levels: *Sedentary*, *Lightly Active*, *Moderately Active*, *Very Active*.
- **Hardware Sync Status**: Visual indicator displaying Android Health Connect integration health.
- **Instant Persistence**: Automatically writes changes to MMKV storage.

---

## 4. Frontend: Custom Component Design System

Six reusable, modular components were built from scratch:

| Component | File Path | Responsibilities |
|---|---|---|
| `ReadinessCard` | `mobile/src/components/ReadinessCard.tsx` | Renders dynamic circular readiness score with 4-tier color coding (Green: 80-100, Amber: 60-79, Red: <60, Grey: uncalculated), fatigue badge, and daily workout focus. |
| `MetricTile` | `mobile/src/components/cards/MetricTile.tsx` | Minimalist activity tile displaying icon, label, formatted value, unit, and accent color. |
| `MacroCard` | `mobile/src/components/MacroCard.tsx` | Dual progress bar component showing logged vs. target calories and protein with percentage calculations. |
| `StructuredPlanCard` | `mobile/src/components/cards/StructuredPlanCard.tsx` | Universal card container that detects and displays `WorkoutPlan`, `DietPlan`, or `SleepGoal` schema objects. |
| `WorkoutCard` | `mobile/src/components/cards/WorkoutCard.tsx` | Granular exercise card detailing routine name, target sets, reps, load, rest times, and coaching tips. |
| `ChatView` | `mobile/src/components/ChatView.tsx` | Robust messaging container with auto-scrolling list, message bubbles, timestamps, typing indicators, and text input bar. |

---

## 5. Hardware Pipeline: Android Health Connect Expansion

Expanded `mobile/src/services/healthService.ts` and `mobile/src/api/healthConnect.ts`:

1. **Heart Rate Sampling**:
   - Queries `HeartRate` records over the last 24-hour window.
   - Extracts all samples and calculates the minimum BPM reading as a proxy for **Resting Heart Rate**.
2. **Active Calories Burned**:
   - Queries `ActiveCaloriesBurned` records and aggregates cumulative energy expenditure in kilocalories (`kcal`).
3. **Graceful Degradation**:
   - Wrapped individual record readers in `try/catch` blocks. If an OEM sensor is missing or permissions are denied, the service logs a warning and returns `0` instead of breaking the entire sync pipeline.
4. **Request Deduplication**:
   - Implemented an in-flight promise cache in `healthConnect.ts` so multiple simultaneous screen requests share a single hardware query.

---

## 6. State Management: Zustand + MMKV v4 Persistence

Implemented in `mobile/src/store/useTrainerStore.ts`:

- **Decoupled Architecture**:
  - **Transient State**: Chat messages, loading spinners (`healthLoading`, `readinessLoading`, `planLoading`), and raw biometrics snapshot reside in RAM.
  - **Persistent State**: `userProfile`, `dailyLog`, and generated artifacts (`workoutPlan`, `dietPlan`, `sleepGoal`) are synchronized to MMKV storage.
- **MMKV v4 API Compatibility**:
  - Migrated from legacy `new MMKV()` syntax to modern `createMMKV({ id: 'fitmatrix-store' })`.
- **Reactive Biometric Sync**:
  - `syncHealth()` reads the wearable snapshot and immediately triggers `computeReadiness()`, keeping the readiness ring updated without extra user interaction.

---

## 7. Backend: Deterministic Readiness & Structured Plan Engine

### 1. Deterministic Readiness Endpoint (`POST /api/v1/readiness`)
- Implemented in `backend/app/main.py`.
- Invokes `evaluate_readiness` tool directly:
  $$\text{score} = \min\left(1.0, \frac{\text{sleep\_minutes}}{420}\right) \times 80 - (10 \text{ if steps} > 15000 \text{ else } 0)$$
- Yields instantaneous calculation with zero LLM API calls and zero token consumption.

### 2. Structured Artifact Generation Endpoints
Added three dedicated endpoints in `backend/app/main.py`:
- `POST /api/v1/plan/workout` → `workout_agent_structured`
- `POST /api/v1/plan/diet` → `diet_agent_structured`
- `POST /api/v1/plan/sleep` → `sleep_agent_structured`

### 3. Pydantic Schemas (`backend/app/api/schemas.py`)
- Defined strict schemas enforced via LangChain's `.with_structured_output(...)`:
  - `WorkoutPlanSchema`: Title, target muscle group, duration, exercises (name, sets, reps, rest, rpe).
  - `DietPlanSchema`: Target calories, macro split (protein/carbs/fats), meals breakdown (timing, description, calories, protein).
  - `SleepGoalSchema`: Target sleep duration, recommended bedtime, wake time, and sleep hygiene recommendations.

---

## 8. Native Android Configuration & Build Fixes

1. **Health Connect Manifest Permissions**:
   - Added `android.permission.health.READ_TOTAL_CALORIES_BURNED` to `mobile/android/app/src/main/AndroidManifest.xml` alongside existing Steps, Sleep, Exercise, and Heart Rate permissions.
2. **Reanimated & Worklets Dependency Fix**:
   - Resolved Gradle build failure (`[Reanimated] react-native-worklets library not found`) by installing `react-native-worklets` as an explicit peer dependency.
3. **Port Forwarding for Device Testing**:
   - Configured `adb reverse tcp:8000 tcp:8000` and `adb reverse tcp:8081 tcp:8081` to bridge USB-connected physical Android devices to the local development server.

---

## 9. Detailed File Modification Changelog

### Mobile Client (`mobile/`)
- `mobile/App.tsx`: Trimmed from 220+ lines to a 20-line clean root container wrapping `AppNavigator`.
- `mobile/src/navigation/AppNavigator.tsx`: **[NEW]** 4-tab bottom navigation with vector icons and active tint styling.
- `mobile/src/screens/DashboardScreen.tsx`: **[NEW]** Daily activity tracker with ReadinessCard, MetricTiles, and Macro progress.
- `mobile/src/screens/AgentChatScreen.tsx`: **[NEW]** Conversational screen with agent workspace selector and quick action buttons.
- `mobile/src/screens/PlansStudioScreen.tsx`: **[NEW]** Structured plan viewer with Workout, Diet, and Sleep tabs.
- `mobile/src/screens/ProfileScreen.tsx`: **[NEW]** Biometrics and preference configuration screen with MMKV persistence.
- `mobile/src/components/ReadinessCard.tsx`: **[NEW]** Circular score indicator with fatigue flags and workout advice.
- `mobile/src/components/MacroCard.tsx`: **[NEW]** Calorie and protein bar graphs.
- `mobile/src/components/cards/MetricTile.tsx`: **[NEW]** Reusable metric display card.
- `mobile/src/components/cards/StructuredPlanCard.tsx`: **[NEW]** Universal plan visualizer.
- `mobile/src/components/cards/WorkoutCard.tsx`: **[NEW]** Detailed exercise list component.
- `mobile/src/components/ChatView.tsx`: **[NEW]** Auto-scrolling chat history with coach message formatting.
- `mobile/src/store/useTrainerStore.ts`: **[NEW]** Central Zustand store with MMKV hydration and reactive sync actions.
- `mobile/src/services/healthService.ts`: Added HeartRate and ActiveCalories reader functions.
- `mobile/src/api/healthConnect.ts`: **[NEW]** In-flight deduplication cache for Health Connect reads.
- `mobile/src/api/coachApi.ts`: Added `computeReadiness`, `generateWorkoutPlan`, `generateDietPlan`, and `generateSleepGoal`.
- `mobile/src/api/agentClient.ts`: **[NEW]** Semantic re-exports for plan generation functions.
- `mobile/src/types/plans.ts`: **[NEW]** TypeScript interfaces and runtime type guards for structured plans.
- `mobile/src/types/health.ts`: **[NEW]** Normalized health metric payload definitions.
- `mobile/src/types/schema.ts`: Added biometrics, target macros, and profile fields.
- `mobile/android/app/src/main/AndroidManifest.xml`: Added calories burned permission.

### Backend Engine (`backend/`)
- `backend/app/main.py`: Added `/api/v1/readiness`, `/api/v1/plan/workout`, `/api/v1/plan/diet`, and `/api/v1/plan/sleep`.
- `backend/app/api/schemas.py`: **[NEW]** Pydantic schemas for structured artifact outputs.
- `backend/app/agents/workout_agent.py`: Added `workout_agent_structured()` utilizing structured LLM output.
- `backend/app/agents/diet_agent.py`: Added `diet_agent_structured()` utilizing structured LLM output.
- `backend/app/agents/sleep_agent.py`: Expanded to full Sleep Architect agent with `sleep_agent_structured()`.
- `backend/app/graph/state.py`: Extended state dictionary with structured plan fields.

---

## 10. Verification & Quality Assurance

- **TypeScript Compilation**: Executed `npx tsc --noEmit` across `mobile/` — **0 errors**.
- **Python Codebase**: Validated Pydantic schema serialization and FastAPI router registrations.
- **Git Version Control**: All Day 2 features committed to `master` branch (`c4228fa`) and pushed to remote origin.

---
*FitMatrix Architecture & Updates Log — Day 2 Complete.*
