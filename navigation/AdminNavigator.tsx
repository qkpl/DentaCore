import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, View } from "react-native";

// Admin Screens
import AdminClinicsScreen from "@/screens/admin/AdminClinicsScreen";
import AdminDashboardScreen from "@/screens/admin/AdminDashboardScreen";
import AdminProfileScreen from "@/screens/admin/AdminProfileScreen";
import AdminReportsScreen from "@/screens/admin/AdminReportsScreen";
import AdminUsersScreen from "@/screens/admin/AdminUsersScreen";

const Tab = createBottomTabNavigator();

const TAB_CONFIG: Record<
  string,
  {
    label: string;
    activeIcon: keyof typeof Ionicons.glyphMap;
    inactiveIcon: keyof typeof Ionicons.glyphMap;
  }
> = {
  AdminDashboard: {
    label: "Dashboard",
    activeIcon: "grid",
    inactiveIcon: "grid-outline",
  },
  AdminClinics: {
    label: "Clinics",
    activeIcon: "business",
    inactiveIcon: "business-outline",
  },
  AdminUsers: {
    label: "Users",
    activeIcon: "people",
    inactiveIcon: "people-outline",
  },
  AdminReports: {
    label: "Reports",
    activeIcon: "bar-chart",
    inactiveIcon: "bar-chart-outline",
  },
  AdminProfile: {
    label: "Settings",
    activeIcon: "settings",
    inactiveIcon: "settings-outline",
  },
};

const ACTIVE_COLOR = "#5B21B6";
const INACTIVE_COLOR = "#7C8193";
const BADGE_BG = "rgba(91, 33, 182, 0.18)";

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarShowLabel: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color }) => (
          <TabBarIcon routeName={route.name} focused={focused} color={color} />
        ),
      })}
    >
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="AdminClinics" component={AdminClinicsScreen} />
      <Tab.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Tab.Screen name="AdminReports" component={AdminReportsScreen} />
      <Tab.Screen name="AdminProfile" component={AdminProfileScreen} />
    </Tab.Navigator>
  );
}

type TabBarIconProps = {
  routeName: string;
  focused: boolean;
  color: string;
};

function TabBarIcon({ routeName, focused, color }: TabBarIconProps) {
  const config = TAB_CONFIG[routeName] ?? TAB_CONFIG.AdminDashboard;
  const iconName = focused ? config.activeIcon : config.inactiveIcon;
  const displayColor = focused ? ACTIVE_COLOR : color || INACTIVE_COLOR;

  return (
    <View style={styles.tabItemContent}>
      <View style={[styles.iconBadge, focused && styles.iconBadgeActive]}>
        <Ionicons name={iconName} size={22} color={displayColor} />
      </View>
      <Text
        style={[styles.tabLabel, focused && styles.tabLabelActive]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        ellipsizeMode="tail"
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0,
    height: 74,
    paddingBottom: 12,
    paddingTop: 10,
    paddingHorizontal: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  tabBarItem: {
    paddingVertical: 4,
    flex: 1,
    minWidth: 70,
  },
  tabItemContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconBadge: {
    width: 48,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeActive: {
    backgroundColor: BADGE_BG,
  },
  tabLabel: {
    fontSize: 12.5,
    lineHeight: 15,
    fontWeight: "600",
    color: INACTIVE_COLOR,
    letterSpacing: 0,
    textAlign: "center",
    minWidth: 70,
  },
  tabLabelActive: {
    color: ACTIVE_COLOR,
  },
});
