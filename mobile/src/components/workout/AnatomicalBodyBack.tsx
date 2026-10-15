import React from 'react';
import Svg, { Path, G, Rect, Circle } from 'react-native-svg';
import { MuscleKey } from '../../utils/muscleTargetMapper';

interface BodyBackProps {
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

export const AnatomicalBodyBack: React.FC<BodyBackProps> = ({
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

      {/* Trapezius Back (Upper & Mid Traps Diamond) */}
      <Path
        d="M50 30 L40 37 L46 54 L50 60 L54 54 L60 37 Z"
        fill={getFill('traps')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('traps')}
      />

      {/* Rear Deltoids (Left & Right) */}
      <Path
        d="M38 37 C30 40 28 46 29 53 C33 52 38 48 39 44 C39 40 39 38 38 37 Z"
        fill={getFill('rear_delts')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('rear_delts')}
      />
      <Path
        d="M62 37 C70 40 72 46 71 53 C67 52 62 48 61 44 C61 40 61 38 62 37 Z"
        fill={getFill('rear_delts')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('rear_delts')}
      />

      {/* Triceps (Left & Right) */}
      <Path
        d="M27 54 C25 61 25 68 28 73 C30 71 31 64 30 55 Z"
        fill={getFill('triceps')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('triceps')}
      />
      <Path
        d="M73 54 C75 61 75 68 72 73 C70 71 69 64 70 55 Z"
        fill={getFill('triceps')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('triceps')}
      />

      {/* Forearms Back (Left & Right) */}
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

      {/* Latissimus Dorsi (Lats V-Taper Left & Right) */}
      <Path
        d="M45 55 L39 50 C36 60 38 74 44 82 L48 76 L48 61 Z"
        fill={getFill('lats')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('lats')}
      />
      <Path
        d="M55 55 L61 50 C64 60 62 74 56 82 L52 76 L52 61 Z"
        fill={getFill('lats')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('lats')}
      />

      {/* Lower Back / Erector Spinae */}
      <Path
        d="M46 76 L45 89 L49 90 L49 76 Z M54 76 L55 89 L51 90 L51 76 Z"
        fill={getFill('lower_back')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('lower_back')}
      />

      {/* Gluteus Maximus (Left & Right Buttocks) */}
      <Path
        d="M37 92 C34 102 36 114 47 114 C48 108 48 98 48 92 Z"
        fill={getFill('glutes')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('glutes')}
      />
      <Path
        d="M63 92 C66 102 64 114 53 114 C52 108 52 98 52 92 Z"
        fill={getFill('glutes')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('glutes')}
      />

      {/* Hamstrings (Left & Right Leg Back) */}
      <Path
        d="M36 116 C34 126 35 136 38 141 C43 141 46 133 46 122 C46 116 42 116 36 116 Z"
        fill={getFill('hamstrings')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('hamstrings')}
      />
      <Path
        d="M64 116 C66 126 65 136 62 141 C57 141 54 133 54 122 C54 116 58 116 64 116 Z"
        fill={getFill('hamstrings')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('hamstrings')}
      />

      {/* Knee Back Base */}
      <Path d="M36 142 L42 142 L41 146 L37 146 Z" fill={baseColor} stroke={outlineColor} strokeWidth="0.6" />
      <Path d="M64 142 L58 142 L59 146 L63 146 Z" fill={baseColor} stroke={outlineColor} strokeWidth="0.6" />

      {/* Calves Back / Gastrocnemius (Left & Right) */}
      <Path
        d="M35 147 C32 156 33 168 37 184 C40 184 43 174 43 158 C43 150 40 147 35 147 Z"
        fill={getFill('calves_back')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('calves_back')}
      />
      <Path
        d="M65 147 C68 156 67 168 63 184 C60 184 57 174 57 158 C57 150 60 147 65 147 Z"
        fill={getFill('calves_back')}
        stroke={outlineColor}
        strokeWidth="0.8"
        onPress={() => onMusclePress && onMusclePress('calves_back')}
      />

      {/* Feet Base */}
      <Path d="M37 185 L35 195 L40 195 L39 185 Z" fill={baseColor} stroke={outlineColor} strokeWidth="0.6" />
      <Path d="M63 185 L65 195 L60 195 L61 185 Z" fill={baseColor} stroke={outlineColor} strokeWidth="0.6" />
    </Svg>
  );
};
