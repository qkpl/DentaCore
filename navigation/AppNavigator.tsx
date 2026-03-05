import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React from "react";
import { useAuth } from "../context/AuthContext";

// Auth Screen
import AuthScreen from "../screens/AuthScreen";

// Role-based Navigators
import AdminNavigator from "./AdminNavigator";
import ClinicNavigator from "./ClinicNavigator";
import PatientNavigator from "./PatientNavigator";

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            {user?.role === "patient" && (
              <Stack.Screen name="PatientApp" component={PatientNavigator} />
            )}
            {user?.role === "clinic" && (
              <Stack.Screen name="ClinicApp" component={ClinicNavigator} />
            )}
            {user?.role === "admin" && (
              <Stack.Screen name="AdminApp" component={AdminNavigator} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
