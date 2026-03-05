import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";

// Clinic Screens
import ClinicAppointmentsScreen from "../screens/clinic/ClinicAppointmentsScreen";
import ClinicDashboardScreen from "../screens/clinic/ClinicDashboardScreen";
import ClinicPatientsScreen from "../screens/clinic/ClinicPatientsScreen";
import ClinicProfileScreen from "../screens/clinic/ClinicProfileScreen";
import ClinicStaffScreen from "../screens/clinic/ClinicStaffScreen";

const Tab = createBottomTabNavigator();

export default function ClinicNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Dashboard") {
            iconName = focused ? "grid" : "grid-outline";
          } else if (route.name === "ClinicAppointments") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "ClinicPatients") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "ClinicStaff") {
            iconName = focused ? "person-add" : "person-add-outline";
          } else if (route.name === "ClinicProfile") {
            iconName = focused ? "business" : "business-outline";
          } else {
            iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#00BFA6",
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
        name="Dashboard"
        component={ClinicDashboardScreen}
        options={{ tabBarLabel: "Dashboard" }}
      />
      <Tab.Screen
        name="ClinicAppointments"
        component={ClinicAppointmentsScreen}
        options={{ tabBarLabel: "Appointments" }}
      />
      <Tab.Screen
        name="ClinicPatients"
        component={ClinicPatientsScreen}
        options={{ tabBarLabel: "Patients" }}
      />
      <Tab.Screen
        name="ClinicStaff"
        component={ClinicStaffScreen}
        options={{ tabBarLabel: "Staff" }}
      />
      <Tab.Screen
        name="ClinicProfile"
        component={ClinicProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}
