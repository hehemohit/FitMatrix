import React from 'react';
import Svg, { Path, G, Rect, Circle } from 'react-native-svg';
import { MuscleKey } from '../../utils/muscleTargetMapper';

interface BodyFrontProps {
  highlightedMuscles: Record<MuscleKey, number> | MuscleKey[];
  secondaryMuscles?: MuscleKey[];
  activeColor?: string;
  secondaryColor?: string;
  baseColor?: string;
  outlineColor?: string;
  width?: number;
  height?: number;
  onMusclePress?: (key: MuscleKey) => void;
}

export const AnatomicalBodyFront: React.FC<BodyFrontProps> = ({
  highlightedMuscles,
  secondaryMuscles = [],
  activeColor = '#4b88eb',
  secondaryColor = '#4b88eb66',
  baseColor = '#24272c',
  outlineColor = '#3a3f47',
  width = 140,
  height = 240,
  onMusclePress,
}) => {
  const isHighlighted = (key: MuscleKey) => {
    if (Array.isArray(highlightedMuscles)) {
      return highlightedMuscles.includes(key);
    }
    return (highlightedMuscles[key] || 0) > 0;
  };

  const isSecondary = (key: MuscleKey) => {
    return secondaryMuscles.includes(key);
  };

  const getFill = (key: MuscleKey) => {
    if (isHighlighted(key)) return activeColor;
    if (isSecondary(key)) return secondaryColor;
    return baseColor;
  };

  return (
    <Svg width={width} height={height} viewBox="0 0 100 200">
      {/* Head & Neck Base */}
      <Circle cx="50" cy="18" r="9" fill={baseColor} stroke={outlineColor} strokeWidth="1" />
      <Path d="M46 27 L46 34 L54 34 L54 27 Z" fill={baseColor} stroke={outlineColor} strokeWidth="1" />

      {/* Trapezius Front */}
      <Path
        d="M45 28 L36 36 L43 38 L47 34 Z M55 28 L64 36 L57 38 L53 34 Z"
        fill={getFill('traps')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('traps')}
      />

      {/* Front Deltoids (Left & Right) */}
      <Path
        d="M34 37 C29 40 27 46 28 53 C31 52 35 48 37 44 C37 40 36 38 34 37 Z"
        fill={getFill('front_delts')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('front_delts')}
      />
      <Path
        d="M66 37 C71 40 73 46 72 53 C69 52 65 48 63 44 C63 40 64 38 66 37 Z"
        fill={getFill('front_delts')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('front_delts')}
      />

      {/* Pectorals / Chest (Left & Right) */}
      <Path
        d="M48 37 L38 39 C36 46 38 56 48 57 L49 42 Z"
        fill={getFill('chest')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('chest')}
      />
      <Path
        d="M52 37 L62 39 C64 46 62 56 52 57 L51 42 Z"
        fill={getFill('chest')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('chest')}
      />

      {/* Biceps (Left & Right) */}
      <Path
        d="M27 54 C25 60 25 68 28 73 C30 71 31 64 30 55 Z"
        fill={getFill('biceps')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('biceps')}
      />
      <Path
        d="M73 54 C75 60 75 68 72 73 C70 71 69 64 70 55 Z"
        fill={getFill('biceps')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('biceps')}
      />

      {/* Forearms Front (Left & Right) */}
      <Path
        d="M27 75 C23 83 20 92 19 98 C22 98 25 91 28 82 Z"
        fill={getFill('forearms')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('forearms')}
      />
      <Path
        d="M73 75 C77 83 80 92 81 98 C78 98 75 91 72 82 Z"
        fill={getFill('forearms')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('forearms')}
      />

      {/* Hands Base */}
      <Path d="M18 99 L16 108 L20 109 L21 100 Z" fill={baseColor} stroke={outlineColor} strokeWidth="0.6" />
      <Path d="M82 99 L84 108 L80 109 L79 100 Z" fill={baseColor} stroke={outlineColor} strokeWidth="0.6" />

      {/* Abdominals (Upper & Lower 6-pack + Obliques) */}
      <Path
        d="M44 59 L49 59 L49 68 L44 68 Z M51 59 L56 59 L56 68 L51 68 Z M43 70 L49 70 L49 79 L44 79 Z M51 70 L57 70 L56 79 L51 79 Z M44 81 L49 81 L49 90 L45 89 Z M51 81 L56 81 L55 89 L51 90 Z"
        fill={getFill('abs')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('abs')}
      />

      {/* Obliques */}
      <Path
        d="M37 60 C35 68 37 78 40 86 L43 83 L42 63 Z"
        fill={getFill('abs')}
        stroke={outlineColor}
        strokeWidth="0.8"
      />
      <Path
        d="M63 60 C65 68 63 78 60 86 L57 83 L58 63 Z"
        fill={getFill('abs')}
        stroke={outlineColor}
        strokeWidth="0.8"
      />

      {/* Pelvis / Hip Core */}
      <Path d="M43 91 L57 91 L55 99 L45 99 Z" fill={baseColor} stroke={outlineColor} strokeWidth="0.8" />

      {/* Quadriceps (Left Leg) */}
      <Path
        d="M36 96 C33 110 32 125 38 139 C43 140 45 132 44 118 C44 106 41 98 36 96 Z"
        fill={getFill('quads')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('quads')}
      />
      {/* Quadriceps (Right Leg) */}
      <Path
        d="M64 96 C67 110 68 125 62 139 C57 140 55 132 56 118 C56 106 59 98 64 96 Z"
        fill={getFill('quads')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('quads')}
      />

      {/* Adductors / Inner Thigh */}
      <Path
        d="M44 102 C45 110 46 122 44 128 C46 122 47 112 47 103 Z"
        fill={getFill('adductors')}
        stroke={outlineColor}
        strokeWidth="0.6"
        onPress={() => onMusclePress && onMusclePress('adductors')}
      />
      <Path
        d="M56 102 C55 110 54 122 56 128 C54 122 53 112 53 103 Z"
        fill={getFill('adductors')}
        stroke={outlineColor}
        strokeWidth="0.6"
        onPress={() => onMusclePress && onMusclePress('adductors')}
      />

      {/* Knees */}
      <Circle cx="39" cy="144" r="3.5" fill={baseColor} stroke={outlineColor} strokeWidth="0.8" />
      <Circle cx="61" cy="144" r="3.5" fill={baseColor} stroke={outlineColor} strokeWidth="0.8" />

      {/* Calves / Shin Front (Left & Right) */}
      <Path
        d="M36 148 C33 158 34 172 38 184 C40 184 42 174 41 158 C41 150 39 148 36 148 Z"
        fill={getFill('calves_front')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('calves_front')}
      />
      <Path
        d="M64 148 C67 158 66 172 62 184 C60 184 58 174 59 158 C59 150 61 148 64 148 Z"
        fill={getFill('calves_front')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('calves_front')}
      />

      {/* Feet Base */}
      <Path d="M36 185 L32 195 L40 195 L39 185 Z" fill={baseColor} stroke={outlineColor} strokeWidth="0.6" />
      <Path d="M64 185 L68 195 L60 195 L61 185 Z" fill={baseColor} stroke={outlineColor} strokeWidth="0.6" />
    </Svg>
  );
};
