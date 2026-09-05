/**
 * agentClient.ts — Dedicated client for structured plan generation.
 * Re-exports the plan functions from coachApi for semantic clarity.
 * Import from here for Plan Studio and structured artifact workflows.
 */

export {
  generateWorkoutPlan,
  generateDietPlan,
  generateSleepGoal,
} from './coachApi';
export type { PlanRequest } from './coachApi';
