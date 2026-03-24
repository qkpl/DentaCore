import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View } from "react-native";

// Admin Screens
import AdminClinicsScreen from "@/screens/admin/AdminClinicsScreen";
import AdminDashboardScreen from "@/screens/admin/AdminDashboardScreen";
import AdminProfileScreen from "@/screens/admin/AdminProfileScreen";
import AdminReportsScreen from "@/screens/admin/AdminReportsScreen";
import AdminUsersScreen from "@/screens/admin/AdminUsersScreen";

const Tab = createBottomTabNavigator();
const ACTIVE_COLOR = "#5B21B6";
const INACTIVE_COLOR = "#9CA3AF";
const ACTIVE_BG = "#F3E8FF";
const ICON_CONTAINER = 44;

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, size }) => {
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

          return (
            <View
              style={{
                width: ICON_CONTAINER,
                height: ICON_CONTAINER,
                borderRadius: ICON_CONTAINER / 2,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: focused ? ACTIVE_BG : "transparent",
              }}
            >
              <Ionicons
                name={iconName}
                size={focused ? size + 4 : size}
                color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
              />
            </View>
          );
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
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
          fontWeight: "700",
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
