import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ReadinessCardProps {
  score: number;           // 0–100
  fatigueFlag?: string | null;
  prescribedWorkout?: string | null;
}

/** Returns hex colour based on readiness tier */
const scoreColour = (score: number): string => {
  if (score >= 75) return '#34A853'; // green — go hard
  if (score >= 50) return '#FBBC04'; // amber — moderate
  return '#EA4335';                   // red — deload/rest
};

const tierLabel = (score: number): string => {
  if (score >= 75) return 'READY';
  if (score >= 50) return 'MODERATE';
  return 'RECOVER';
};

export const ReadinessCard: React.FC<ReadinessCardProps> = ({
  score,
  fatigueFlag,
  prescribedWorkout,
}) => {
  const colour = scoreColour(score);
  const tier = tierLabel(score);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* Circular gauge (simplified arc via border trick) */}
        <View style={[styles.ring, { borderColor: colour }]}>
          <Text style={[styles.scoreValue, { color: colour }]}>{score}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>

        <View style={styles.info}>
          <View style={[styles.badge, { backgroundColor: colour + '22', borderColor: colour }]}>
            <Text style={[styles.badgeText, { color: colour }]}>{tier}</Text>
          </View>
          <Text style={styles.readinessLabel}>Readiness Score</Text>
          {fatigueFlag && fatigueFlag !== 'nominal' && (
            <Text style={styles.fatigueText}>⚠ {fatigueFlag.replace(/_/g, ' ')}</Text>
          )}
        </View>
      </View>

      {prescribedWorkout ? (
        <View style={styles.planBanner}>
          <Text style={styles.planLabel}>TODAY'S FOCUS</Text>
          <Text style={styles.planText} numberOfLines={2}>{prescribedWorkout}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
  scoreMax: {
    fontSize: 10,
    color: '#aaa',
    lineHeight: 12,
  },
  info: {
    flex: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  readinessLabel: {
    fontSize: 13,
    color: '#555',
  },
  fatigueText: {
    fontSize: 11,
    color: '#EA4335',
    marginTop: 4,
  },
  planBanner: {
    marginTop: 12,
    backgroundColor: '#e8f0fe',
    borderRadius: 10,
    padding: 10,
  },
  planLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a73e8',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  planText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
});
