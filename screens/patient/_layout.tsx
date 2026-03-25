import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="AIAssistantScreen"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AppointmentsScreen"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BookAppointmentScreen"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ClinicDetailsScreen"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PatientHomeScreen"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="ProfileScreen" options={{ headerShown: false }} />
        <Stack.Screen name="RecordsScreen" options={{ headerShown: false }} />
        <Stack.Screen
          name="RescheduleAppointmentScreen"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", headerShown: false }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
