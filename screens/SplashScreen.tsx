import { useNavigation } from "@react-navigation/native";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function SplashScreen() {
  const navigation = useNavigation<any>();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        if (user?.role === "patient") {
          navigation.replace("PatientApp");
        } else if (user?.role === "clinic") {
          navigation.replace("ClinicApp");
        } else if (user?.role === "admin") {
          navigation.replace("AdminApp");
        } else {
          navigation.replace("Auth");
        }
      } else {
        navigation.replace("Auth");
      }
    }, 1400);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.brandBox}>
        <Text style={styles.emoji}>🦷</Text>
      </View>
      <Text style={styles.title}>DentaCore</Text>
      <Text style={styles.subtitle}>Connecting Smiles to Care.</Text>
      <ActivityIndicator style={styles.loader} size="small" color="#00BFA6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    padding: 24,
    alignItems: "center",
  },
  brandBox: {
    width: 90,
    height: 90,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#00BFA6",
    marginBottom: 16,
  },
  emoji: {
    fontSize: 44,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#222",
  },
  subtitle: {
    marginTop: 8,
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 260,
  },
  loader: {
    marginTop: 16,
  },
});