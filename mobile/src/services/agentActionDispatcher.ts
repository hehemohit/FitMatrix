/**
 * agentActionDispatcher.ts — FitMatrix MCP-Style Executable Action Dispatcher
 *
 * Receives structured action_dispatches from the Coach Agent and immediately
 * updates the reactive mobile application state across both Nutrition and
 * Workout universes without requiring manual user navigation.
 */

import { AgentActionDispatch } from '../types/schema';
import { useTrainerStore } from '../store/useTrainerStore';
import { useWorkoutScheduleStore } from '../store/useWorkoutScheduleStore';
import { useWorkoutSessionStore } from '../store/useWorkoutSessionStore';
import { useExerciseLibraryStore } from '../store/useExerciseLibraryStore';
import { useDashboardTabStore } from '../store/useDashboardTabStore';
import { useUnifiedAthleteStore } from '../store/useUnifiedAthleteStore';

export interface ActionExecutionResult {
  success: boolean;
  action_type: string;
  message: string;
}

export const dispatchAgentAction = async (
  action: AgentActionDispatch
): Promise<ActionExecutionResult> => {
  const { action_type, payload, confirmation_message } = action;

  try {
    switch (action_type) {
      // ─────────────────────────────────────────────────────────────────────────
      // Action 1: LOG_MEAL (Nutrition Universe)
      // ─────────────────────────────────────────────────────────────────────────
      case 'LOG_MEAL': {
        const mealName = payload.name || 'Logged Meal';
        const calories = Number(payload.calories || 0);
        const protein_g = Number(payload.protein_g || 0);
        const carbs_g = Number(payload.carbs_g || 0);
        const fats_g = Number(payload.fats_g || 0);

        const validCategories = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout'] as const;
        const normalizedCategory = validCategories.find(c => c.toLowerCase() === (payload.meal_type || '').toLowerCase()) || 'Snack';

        // 1. Central Unified Athlete Store (Single Source of Truth)
        await useUnifiedAthleteStore.getState().logMeal({
          mealId: `meal_ai_${Date.now()}`,
          name: mealName,
          category: normalizedCategory,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          calories,
          proteinG: protein_g,
          carbsG: carbs_g,
          fatsG: fats_g,
          loggedAt: new Date().toISOString(),
        });

        // 2. Legacy Store Sync
        await useTrainerStore.getState().logMeal({
          meal_id: `meal_ai_${Date.now()}`,
          name: mealName,
          category: payload.meal_type || 'snack',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          calories,
          protein_g,
          carbs_g,
          fats_g,
        });

        return {
          success: true,
          action_type,
          message: confirmation_message || `Logged ${mealName} (${calories} kcal, ${protein_g}g P).`,
        };
      }

      // ─────────────────────────────────────────────────────────────────────────
      // Action 2: SCHEDULE_WORKOUT (Workout Universe)
      // ─────────────────────────────────────────────────────────────────────────
      case 'SCHEDULE_WORKOUT': {
        const routineName = payload.routine_name || 'AI Hypertrophy Workout';
        const exercises = Array.isArray(payload.exercises) ? payload.exercises : [];
        const dayOfWeekStr = (payload.day_of_week || 'Today').toLowerCase();

        // Determine target day index (0 = Mon, 6 = Sun)
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        let targetDayIdx = new Date().getDay() - 1; // JS 0 = Sun -> Mon = 0
        if (targetDayIdx < 0) targetDayIdx = 6;

        for (let i = 0; i < days.length; i++) {
          if (dayOfWeekStr.includes(days[i])) {
            targetDayIdx = i;
            break;
          }
        }

        let iconType: 'push' | 'pull' | 'legs' = 'push';
        const nameLower = routineName.toLowerCase();
        if (nameLower.includes('pull') || nameLower.includes('back')) iconType = 'pull';
        else if (nameLower.includes('leg') || nameLower.includes('squat')) iconType = 'legs';

        useWorkoutScheduleStore.getState().addRoutine(
          targetDayIdx,
          routineName,
          Math.max(3, exercises.length),
          iconType
        );

        return {
          success: true,
          action_type,
          message: confirmation_message || `Scheduled ${routineName} for ${days[targetDayIdx].toUpperCase()}.`,
        };
      }

      // ─────────────────────────────────────────────────────────────────────────
      // Action 3: START_WORKOUT (Workout Universe Session)
      // ─────────────────────────────────────────────────────────────────────────
      case 'START_WORKOUT': {
        const workoutName = payload.workout_name || 'Active Session';
        const requestedExercises = Array.isArray(payload.exercises) ? payload.exercises : [];

        // Match requested exercise names against library exercises
        const library = useExerciseLibraryStore.getState().exercises;
        const initialExercises: any[] = [];

        requestedExercises.forEach(req => {
          const reqName = (req.name || '').toLowerCase();
          const match = library.find(libEx => libEx.name.toLowerCase().includes(reqName) || reqName.includes(libEx.name.toLowerCase()));
          if (match) {
            initialExercises.push({
              ...match,
              targetSets: req.sets || 3,
              targetReps: req.reps || '8-10',
            });
          }
        });

        // Start workout session
        useWorkoutSessionStore.getState().startWorkout(
          workoutName,
          initialExercises.length > 0 ? initialExercises : undefined
        );

        // Switch active dashboard to workout universe
        useDashboardTabStore.getState().setActiveDashboard('workout');

        return {
          success: true,
          action_type,
          message: confirmation_message || `Started ${workoutName} session.`,
        };
      }

      // ─────────────────────────────────────────────────────────────────────────
      // Action 4: UPDATE_TARGETS (Synchronized Metabolism)
      // ─────────────────────────────────────────────────────────────────────────
      case 'UPDATE_TARGETS': {
        // 1. Central Unified Athlete Store
        const centralProfile = useUnifiedAthleteStore.getState().athleteProfile;
        const updatedTargets = {
          ...centralProfile.targets,
          ...(payload.target_calories ? { targetCalories: Number(payload.target_calories) } : {}),
          ...(payload.target_protein_g ? { targetProteinG: Number(payload.target_protein_g) } : {}),
        };
        useUnifiedAthleteStore.getState().updateProfile({
          targets: updatedTargets,
          ...(payload.fitness_goal ? { fitnessGoal: payload.fitness_goal as any } : {}),
        });

        // 2. Legacy Store Sync
        const currentProfile = useTrainerStore.getState().userProfile;
        const updatedProfile = {
          ...currentProfile,
          ...(payload.target_calories ? { target_calories: Number(payload.target_calories) } : {}),
          ...(payload.target_protein_g ? { target_protein_g: Number(payload.target_protein_g) } : {}),
          ...(payload.fitness_goal ? { fitness_goal: String(payload.fitness_goal) } : {}),
        };

        useTrainerStore.getState().setUserProfile(updatedProfile);

        return {
          success: true,
          action_type,
          message: confirmation_message || 'Metabolic targets synchronized across all stores.',
        };
      }

      default:
        return {
          success: false,
          action_type,
          message: `Unknown action type: ${action_type}`,
        };
    }
  } catch (err: any) {
    console.warn(`[agentActionDispatcher] Execution error on ${action_type}:`, err);
    return {
      success: false,
      action_type,
      message: `Failed to execute ${action_type}: ${err.message}`,
    };
  }
};
