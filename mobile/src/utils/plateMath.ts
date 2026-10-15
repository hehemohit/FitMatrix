/**
 * Barbell Plate Loading Calculator Math
 */

export interface PlateCount {
  weight: number;
  count: number; // Count per side
}

export interface PlateCalcResult {
  platePairs: PlateCount[];
  weightPerSide: number;
  barWeight: number;
  totalWeight: number;
  remainder: number;
}

export const STANDARD_LB_PLATES = [55, 45, 35, 25, 10, 5, 2.5];
export const STANDARD_KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export function calculateBarbellPlates(
  targetWeight: number,
  barWeight: number = 45,
  availablePlates: number[] = STANDARD_LB_PLATES
): PlateCalcResult {
  if (targetWeight <= barWeight) {
    return {
      platePairs: [],
      weightPerSide: 0,
      barWeight,
      totalWeight: targetWeight,
      remainder: 0,
    };
  }

  const weightPerSide = (targetWeight - barWeight) / 2;
  let remainingPerSide = weightPerSide;
  const platePairs: PlateCount[] = [];

  const sortedPlates = [...availablePlates].sort((a, b) => b - a);

  for (const plate of sortedPlates) {
    if (remainingPerSide >= plate) {
      const count = Math.floor(remainingPerSide / plate);
      platePairs.push({ weight: plate, count });
      remainingPerSide -= count * plate;
    }
  }

  return {
    platePairs,
    weightPerSide,
    barWeight,
    totalWeight: targetWeight,
    remainder: Math.round(remainingPerSide * 2 * 10) / 10,
  };
}
