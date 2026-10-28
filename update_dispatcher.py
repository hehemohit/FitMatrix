with open("mobile/src/services/agentActionDispatcher.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Make sure Category is clean and properly typed
old_log_meal = """        // 1. Central Unified Athlete Store (Single Source of Truth)
        await useUnifiedAthleteStore.getState().logMeal({
          mealId: `meal_ai_${Date.now()}`,
          name: mealName,
          category: (payload.meal_type as any) || 'Snack',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          calories,
          proteinG: protein_g,
          carbsG: carbs_g,
          fatsG: fats_g,
          loggedAt: new Date().toISOString(),
        });"""

new_log_meal = """        const validCategories = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout'] as const;
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
        });"""

content = content.replace(old_log_meal, new_log_meal)

with open("mobile/src/services/agentActionDispatcher.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated agentActionDispatcher.ts successfully!")

