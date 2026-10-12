import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { FoodLogScreen } from '../screens/FoodLogScreen';
import { StrategyScreen } from '../screens/StrategyScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SwipeableScreenPager } from './SwipeableScreenPager';
import { CustomTabBar } from './CustomTabBar';
import { QuickActionModal } from '../components/macrofactor/QuickActionModal';
import { MealEntryModal } from '../components/MealEntryModal';
import { WeighInModal } from '../components/macrofactor/WeighInModal';
import { useTrainerStore } from '../store/useTrainerStore';
import { colors } from '../theme/colors';

export const AppNavigator: React.FC = () => {
  const { logMeal, weighIn, userProfile } = useTrainerStore();

  const [activeTab, setActiveTab] = useState(0);
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [weighInModalVisible, setWeighInModalVisible] = useState(false);

  const handleSelectQuickAction = (action: 'meal' | 'weight' | 'workout') => {
    if (action === 'meal') {
      setMealModalVisible(true);
    } else if (action === 'weight') {
      setWeighInModalVisible(true);
    }
  };

  const screens = React.useMemo(
    () => [
      <DashboardScreen key="dashboard-screen" />,
      <FoodLogScreen key="foodlog-screen" />,
      <StrategyScreen key="strategy-screen" />,
      <ProfileScreen key="profile-screen" />,
    ],
    []
  );

  return (
    <View style={styles.container}>
      {/* WhatsApp-Style Horizontal Gesture Pager */}
      <SwipeableScreenPager
        screens={screens}
        currentIndex={activeTab}
        onIndexChange={setActiveTab}
      />

      {/* Synchronized Custom Bottom Tab Bar */}
      <CustomTabBar
        currentIndex={activeTab}
        onSelectIndex={setActiveTab}
        onFabPress={() => setQuickActionVisible(true)}
      />

      {/* Floating Center (+) Action Sheet */}
      <QuickActionModal
        visible={quickActionVisible}
        onClose={() => setQuickActionVisible(false)}
        onSelectAction={handleSelectQuickAction}
      />

      {/* Quick Meal Entry Modal */}
      <MealEntryModal
        visible={mealModalVisible}
        onClose={() => setMealModalVisible(false)}
        onLog={logMeal}
      />

      {/* Daily Weigh-In Modal */}
      <WeighInModal
        visible={weighInModalVisible}
        onClose={() => setWeighInModalVisible(false)}
        onSave={weighIn}
        initialWeight={userProfile.weight_kg}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.appDark,
  },
});
