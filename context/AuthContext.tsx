import React, { createContext, ReactNode, useContext, useState } from "react";
import { Clinic, mockClinics, mockUsers, User } from "../data/mockData";
import { activateClinic } from "../services/dataService";

interface AuthContextType {
  user: User | null;
  clinic: Clinic | null;
  login: (email: string, password: string) => boolean;
  signup: (
    email: string,
    password: string,
    role: "patient" | "clinic" | "admin",
    name?: string,
  ) => { success: boolean; message: string };
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);

  const login = (email: string, password: string): boolean => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    // Find user by email and password
    const foundUser = mockUsers.find(
      (u) =>
        u.email.toLowerCase() === normalizedEmail &&
        u.password === normalizedPassword,
    );

    if (foundUser) {
      setUser(foundUser);

      // If user is a clinic, also set clinic data and activate it
      if (foundUser.role === "clinic" && foundUser.clinicId) {
        const foundClinic = mockClinics.find(
          (c) => c.id === foundUser.clinicId,
        );
        setClinic(foundClinic || null);

        // Activate clinic when they log in
        activateClinic(foundUser.clinicId);
      }

      return true;
    }

    return false;
  };

  const signup = (
    email: string,
    password: string,
    role: "patient" | "clinic" | "admin",
    name?: string,
  ): { success: boolean; message: string } => {
    // Admin cannot signup
    if (role === "admin") {
      return { success: false, message: "Admin accounts cannot be registered" };
    }

    // Validate email
    if (!email.includes("@")) {
      return { success: false, message: "Please enter a valid email address" };
    }

    // Check if user already exists
    const existingUser = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );

    if (existingUser) {
      return {
        success: false,
        message: "An account with this email already exists",
      };
    }

    // Create new user
    const newUserId = `${role}${Date.now()}`;
    const userName = name || email.split("@")[0];

    const newUser: User = {
      id: newUserId,
      name: userName,
      email: email,
      phone: "",
      role: role,
      password: password,
    };

    // If clinic, create clinic data and link it
    if (role === "clinic") {
      const newClinic: Clinic = {
        id: newUserId,
        name: `${userName} Clinic`,
        address: "",
        phone: "",
        email: email,
        description: "New dental clinic",
        servicesOffered: ["General Dentistry"],
        operatingHours: {
          monday: "9:00 AM - 5:00 PM",
          tuesday: "9:00 AM - 5:00 PM",
          wednesday: "9:00 AM - 5:00 PM",
          thursday: "9:00 AM - 5:00 PM",
          friday: "9:00 AM - 5:00 PM",
          saturday: "Closed",
          sunday: "Closed",
        },
        rating: 0,
        totalPatients: 0,
        todaysAppointments: 0,
        revenue: 0,
        location: { lat: 0, lng: 0 },
        isActive: false, // Clinic becomes active on first login
        lastLoginDate: undefined,
      };

      newUser.clinicId = newUserId;
      mockClinics.push(newClinic);
    }

    // Add user to mockUsers
    mockUsers.push(newUser);

    // Auto-login the user
    setUser(newUser);
    if (role === "clinic") {
      const newClinic = mockClinics.find((c) => c.id === newUserId);
      setClinic(newClinic || null);

      // Activate clinic immediately after signup so it's visible to patients
      activateClinic(newUserId);
    }

    return { success: true, message: "Account created successfully" };
  };

  const logout = () => {
    setUser(null);
    setClinic(null);
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{ user, clinic, login, signup, logout, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
