import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { Alert } from "react-native";

// Admin Screens
import AdminClinicsScreen from "../screens/admin/AdminClinicsScreen";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminProfileScreen from "../screens/admin/AdminProfileScreen";
import AdminUsersScreen from "../screens/admin/AdminUsersScreen";

const Tab = createBottomTabNavigator();

// Placeholder for Reports screen
function AdminReportsScreen() {
  React.useEffect(() => {
    Alert.alert("Reports", "Reports & Analytics feature coming soon");
  }, []);
  return null;
}

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "AdminDashboard") {
            iconName = focused ? "grid" : "grid-outline";
          } else if (route.name === "AdminClinics") {
            iconName = focused ? "business" : "business-outline";
          } else if (route.name === "AdminUsers") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "AdminReports") {
            iconName = focused ? "bar-chart" : "bar-chart-outline";
          } else if (route.name === "AdminProfile") {
            iconName = focused ? "settings" : "settings-outline";
          } else {
            iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#7C4DFF",
        tabBarInactiveTintColor: "#999",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFF",
          borderTopWidth: 1,
          borderTopColor: "#F0F0F0",
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      })}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ tabBarLabel: "Dashboard" }}
      />
      <Tab.Screen
        name="AdminClinics"
        component={AdminClinicsScreen}
        options={{ tabBarLabel: "Clinics" }}
      />
      <Tab.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{ tabBarLabel: "Users" }}
      />
      <Tab.Screen
        name="AdminReports"
        component={AdminReportsScreen}
        options={{ tabBarLabel: "Reports" }}
      />
      <Tab.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        options={{ tabBarLabel: "Settings" }}
      />
    </Tab.Navigator>
  );
}
