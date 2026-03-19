import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React from "react";
import { useAuth } from "../context/AuthContext";

// Auth Screen
import AuthScreen from "../screens/AuthScreen";
import SplashScreen from "../screens/SplashScreen";

// Role-based Navigators
import AdminNavigator from "./AdminNavigator";
import ClinicNavigator from "./ClinicNavigator";
import PatientNavigator from "./PatientNavigator";

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="PatientApp" component={PatientNavigator} />
        <Stack.Screen name="ClinicApp" component={ClinicNavigator} />
        <Stack.Screen name="AdminApp" component={AdminNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
