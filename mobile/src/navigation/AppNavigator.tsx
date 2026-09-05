import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';

import { DashboardScreen } from '../screens/DashboardScreen';
import { AgentChatScreen } from '../screens/AgentChatScreen';
import { PlansStudioScreen } from '../screens/PlansStudioScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

export type RootTabParamList = {
  Dashboard: undefined;
  Chat: undefined;
  Plans: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TabIcon: React.FC<{ label: string; focused: boolean }> = ({ label, focused }) => (
  <Text style={[styles.icon, focused && styles.iconFocused]}>{label}</Text>
);

export const AppNavigator: React.FC = () => (
  <NavigationContainer>
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#ffffff', elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontSize: 17, fontWeight: '700', color: '#111' },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#1a73e8',
        tabBarInactiveTintColor: '#aaa',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'FitMatrix',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon label="📊" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={AgentChatScreen}
        options={{
          title: 'Agent Hub',
          tabBarLabel: 'Agent Hub',
          tabBarIcon: ({ focused }) => <TabIcon label="🤖" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Plans"
        component={PlansStudioScreen}
        options={{
          title: 'Plan Studio',
          tabBarLabel: 'Plan Studio',
          tabBarIcon: ({ focused }) => <TabIcon label="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  </NavigationContainer>
);

const styles = StyleSheet.create({
  icon: { fontSize: 20, opacity: 0.6 },
  iconFocused: { opacity: 1 },
});
