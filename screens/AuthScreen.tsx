import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function AuthScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [userType, setUserType] = useState<"patient" | "clinic" | "admin">(
    "patient",
  );
  const { login, signup } = useAuth();

  const handleAuth = () => {
    const cleanedEmail = email.trim();
    const cleanedPassword = password.trim();

    if (!cleanedEmail || !cleanedPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!cleanedEmail.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (isSignUp) {
      // Sign Up Mode
      if (userType === "admin") {
        Alert.alert(
          "Error",
          "Admin accounts cannot be registered. Please use existing admin credentials to sign in.",
        );
        return;
      }

      const result = signup(
        cleanedEmail,
        cleanedPassword,
        userType,
        name || cleanedEmail.split("@")[0],
      );

      if (!result.success) {
        Alert.alert("Error", result.message);
      } else {
        Alert.alert(
          "Success",
          "Account created successfully! Please sign in now.",
        );
        setIsSignUp(false);
        navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
      }
    } else {
      // Sign In Mode
      const success = login(cleanedEmail, cleanedPassword);

      if (!success) {
        Alert.alert("Error", "Invalid credentials. Please try again.");
      } else {
        const routeName =
          userType === "patient"
            ? "PatientApp"
            : userType === "clinic"
            ? "ClinicApp"
            : "AdminApp";
        navigation.reset({
          index: 0,
          routes: [{ name: routeName }],
        });
      }
    }
  };

  const showCredentials = () => {
    const credentials = {
      patient: "Email: user@email.com\nPassword: user123",
      clinic: "Email: admin@smilecare.com\nPassword: clinic123",
      admin: "Email: admin@dentacore.com\nPassword: admin123",
    };

    Alert.alert(
      "Demo Credentials",
      `${userType.toUpperCase()} Account:\n\n${credentials[userType]}\n\n` +
        "You can also switch user type and view other credentials.",
      [{ text: "OK" }],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoEmoji}>🦷</Text>
          </View>
          <Text style={styles.title}>DentaCore</Text>
          <Text style={styles.subtitle}>DentaCore: Connecting Smiles to Care.</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </Text>
          <Text style={styles.instructionText}>
            {isSignUp ? "Sign up to get started" : "Sign in to your account"}
          </Text>

          {/* User Type Selector */}
          <View style={styles.userTypeContainer}>
            <Text style={styles.userTypeLabel}>I am a:</Text>
            {isSignUp && userType === "admin" && (
              <View style={styles.adminWarning}>
                <Ionicons name="warning" size={16} color="#F57C00" />
                <Text style={styles.adminWarningText}>
                  Admin accounts cannot register. Switch to Sign In to use admin
                  credentials.
                </Text>
              </View>
            )}
            <View style={styles.userTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === "patient" && styles.userTypeButtonActive,
                ]}
                onPress={() => setUserType("patient")}
              >
                <Ionicons
                  name="person"
                  size={24}
                  color={userType === "patient" ? "#00BFA6" : "#666"}
                />
                <Text
                  style={[
                    styles.userTypeButtonText,
                    userType === "patient" && styles.userTypeButtonTextActive,
                  ]}
                >
                  Patient
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === "clinic" && styles.userTypeButtonActive,
                ]}
                onPress={() => setUserType("clinic")}
              >
                <Ionicons
                  name="business"
                  size={24}
                  color={userType === "clinic" ? "#00BFA6" : "#666"}
                />
                <Text
                  style={[
                    styles.userTypeButtonText,
                    userType === "clinic" && styles.userTypeButtonTextActive,
                  ]}
                >
                  Clinic
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === "admin" && styles.userTypeButtonActive,
                ]}
                onPress={() => setUserType("admin")}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={24}
                  color={userType === "admin" ? "#00BFA6" : "#666"}
                />
                <Text
                  style={[
                    styles.userTypeButtonText,
                    userType === "admin" && styles.userTypeButtonTextActive,
                  ]}
                >
                  Admin
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {isSignUp && userType !== "admin" && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {isSignUp && userType !== "admin" && (
            <View style={styles.roleInfo}>
              <Text style={styles.roleText}>
                {userType === "patient" &&
                  "As a Patient, you can book appointments and manage your dental records"}
                {userType === "clinic" &&
                  "As a Clinic, you can manage appointments, patients, and staff"}
              </Text>
            </View>
          )}

          {!isSignUp && userType === "admin" && (
            <View style={styles.roleInfo}>
              <Text style={styles.roleText}>
                Use your admin credentials to access system management
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={handleAuth}>
            <Text style={styles.buttonText}>
              {isSignUp ? "Sign Up" : "Sign In"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={showCredentials}>
            <Text style={styles.demoText}>
              View {userType.charAt(0).toUpperCase() + userType.slice(1)} Demo
              Credentials
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.switchText}>
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Trusted by thousands of patients</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#00BFA6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  logoEmoji: {
    fontSize: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  formContainer: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  instructionText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 25,
  },
  userTypeContainer: {
    marginBottom: 25,
  },
  userTypeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  userTypeButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  userTypeButton: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  userTypeButtonActive: {
    backgroundColor: "#E0F7F5",
    borderColor: "#00BFA6",
  },
  userTypeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginTop: 5,
  },
  userTypeButtonTextActive: {
    color: "#00BFA6",
  },
  adminWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  adminWarningText: {
    flex: 1,
    fontSize: 12,
    color: "#F57C00",
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8F8F8",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  roleInfo: {
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  roleText: {
    fontSize: 12,
    color: "#1976D2",
    textAlign: "center",
  },
  button: {
    backgroundColor: "#00BFA6",
    borderRadius: 25,
    padding: 16,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  demoText: {
    color: "#00BFA6",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 20,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#999",
    fontSize: 14,
  },
  switchText: {
    color: "#00BFA6",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
  footer: {
    textAlign: "center",
    color: "#999",
    fontSize: 12,
    marginTop: 30,
  },
});
