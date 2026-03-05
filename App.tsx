/**
 * DentaCore - Mobile Dental Appointment and Record Management System
 * Main Application Entry Point
 *
 * This is the root component that wraps the entire application with necessary providers
 * and initializes the navigation system.
 */

import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./context/AuthContext";
import AppNavigator from "./navigation/AppNavigator";

/**
 * Main App Component
 *
 * Structure:
 * - SafeAreaProvider: Ensures safe rendering on devices with notches and rounded corners
 * - AuthProvider: Provides authentication context throughout the app
 * - AppNavigator: Main navigation container with role-based routing
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
