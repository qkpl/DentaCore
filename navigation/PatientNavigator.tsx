import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { StyleSheet, Text, View } from "react-native";

// Patient Screens
import AIAssistantScreen from "../screens/patient/AIAssistantScreen";
import AppointmentsScreen from "../screens/patient/AppointmentsScreen";
import BookAppointmentScreen from "../screens/patient/BookAppointmentScreen";
import ClinicDetailsScreen from "../screens/patient/ClinicDetailsScreen";
import PatientHomeScreen from "../screens/patient/PatientHomeScreen";
import ProfileScreen from "../screens/patient/ProfileScreen";
import RecordsScreen from "../screens/patient/RecordsScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TAB_CONFIG: Record<
  string,
  {
    label: string;
    activeIcon: keyof typeof Ionicons.glyphMap;
    inactiveIcon: keyof typeof Ionicons.glyphMap;
  }
> = {
  Home: { label: "Home", activeIcon: "home", inactiveIcon: "home-outline" },
  Appointments: {
    label: "Appointments",
    activeIcon: "calendar",
    inactiveIcon: "calendar-outline",
  },
  Records: {
    label: "Records",
    activeIcon: "document-text",
    inactiveIcon: "document-text-outline",
  },
  AIAssistant: {
    label: "Ask AI",
    activeIcon: "chatbubbles",
    inactiveIcon: "chatbubbles-outline",
  },
  Profile: {
    label: "Profile",
    activeIcon: "person",
    inactiveIcon: "person-outline",
  },
};

const ACTIVE_COLOR = "#00BFA6";
const INACTIVE_COLOR = "#6B7280";

function PatientHomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PatientHome" component={PatientHomeScreen} />
      <Stack.Screen name="ClinicDetails" component={ClinicDetailsScreen} />
      <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
    </Stack.Navigator>
  );
}

export default function PatientNavigator() {
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
      <Tab.Screen name="Home" component={PatientHomeStack} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} />
      <Tab.Screen name="Records" component={RecordsScreen} />
      <Tab.Screen name="AIAssistant" component={AIAssistantScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

type TabBarIconProps = {
  routeName: string;
  focused: boolean;
  color: string;
};

function TabBarIcon({ routeName, focused, color }: TabBarIconProps) {
  const config = TAB_CONFIG[routeName] ?? TAB_CONFIG.Home;
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
    backgroundColor: "rgba(0, 191, 166, 0.15)",
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
