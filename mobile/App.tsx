/**
 * App.tsx — FitMatrix Root Shell
 *
 * Multi-tenant root entry point:
 * - Directs unauthenticated users to AuthScreen
 * - Directs newly registered users to OnboardingWizardScreen
 * - Directs calibrated users to AppNavigator
 */

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthScreen } from './src/screens/auth/AuthScreen';
import { OnboardingWizardScreen } from './src/screens/onboarding/OnboardingWizardScreen';
import { useAuthStore } from './src/store/useAuthStore';
import { colors } from './src/theme/colors';

export default function App() {
  const { isAuthenticated, isOnboarded } = useAuthStore();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {!isAuthenticated ? (
          <AuthScreen />
        ) : !isOnboarded ? (
          <OnboardingWizardScreen />
        ) : (
          <AppNavigator />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.appDark },
});