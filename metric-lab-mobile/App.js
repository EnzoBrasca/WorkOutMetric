import React, { useCallback } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, PixelifySans_400Regular, PixelifySans_500Medium, PixelifySans_600SemiBold, PixelifySans_700Bold } from '@expo-google-fonts/pixelify-sans';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TrainScreen from './src/screens/TrainScreen';
import RoutinesScreen from './src/screens/RoutinesScreen';
import DataScreen from './src/screens/DataScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { useAuthStore } from './src/store/useAuthStore';
import { useSessionStore } from './src/store/useSessionStore';
import { useTheme } from './src/theme/useTheme';
import { TabBarIcon } from './src/components/atoms/TabBarIcon';
import Header from './src/components/organisms/Header';

SplashScreen.preventAutoHideAsync();
const Tab = createBottomTabNavigator();

const Stack = createNativeStackNavigator();

function AppTabs() {
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const insets = useSafeAreaInsets();

  // An open workout takes over the Train screen entirely, tab bar included, so
  // nothing competes with the set in front of the user. Scoped to Train on
  // purpose: on any other tab the bar stays, or a session left open would
  // strand the user with no way to navigate.
  const hasActiveSession = useSessionStore((state) => Boolean(state.activeSession));

  return (
    <View style={styles.container}>
      <Header />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused }) => {
              return <TabBarIcon routeName={route.name} focused={focused} />;
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarStyle:
              hasActiveSession && route.name === 'Train'
                ? { display: 'none' }
                : [
                    styles.tabBar,
                    {
                      height: 56 + insets.bottom,
                      paddingBottom: insets.bottom
                    }
                  ],
            tabBarLabelStyle: styles.tabBarLabel,
            tabBarItemStyle: styles.tabBarItem,
          })}
        >
          <Tab.Screen name="Train" component={TrainScreen} />
          <Tab.Screen name="Routines" component={RoutinesScreen} />
          <Tab.Screen name="Data" component={DataScreen} />
          <Tab.Screen name="Config" component={ConfigScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    </View>
  );
}

function MainNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { colors, fonts } = useTheme();

  const AppTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.background,
    },
  };

  return (
    <NavigationContainer theme={AppTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="MainTabs" component={AppTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const [fontsLoaded] = useFonts({
    PixelifySans_400Regular,
    PixelifySans_500Medium,
    PixelifySans_600SemiBold,
    PixelifySans_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={colors.background === '#ffffff' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <MainNavigator />
      </View>
    </SafeAreaProvider>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderAlt,
  },
  tabBarItem: {
    borderLeftWidth: 1,
    borderLeftColor: colors.borderAlt,
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  tabBarLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    marginTop: 4,
  },
});
