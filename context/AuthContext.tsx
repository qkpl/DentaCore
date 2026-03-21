import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "firebase/firestore";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  Clinic,
  mockClinics,
  mockUsers,
  User
} from "../data/mockData";
import {
  activateClinic,
  getClinicById
} from "../services/dataService";
import { auth, db } from "../services/firebase";

interface AuthResponse {
  success: boolean;
  message: string;
}

interface AuthContextType {
  user: User | null;
  clinic: Clinic | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  signup: (
    email: string,
    password: string,
    role: "patient" | "clinic" | "admin",
    name?: string,
  ) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const localSignup = async (
  email: string,
  password: string,
  role: "patient" | "clinic" | "admin",
  name?: string,
): Promise<AuthResponse> => {
  if (role === "admin") {
    return { success: false, message: "Admin accounts cannot be registered" };
  }

  if (!email.includes("@")) {
    return { success: false, message: "Please enter a valid email address" };
  }

  const existingUser = mockUsers.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );

  if (existingUser) {
    return {
      success: false,
      message: "An account with this email already exists",
    };
  }

  const newUserId = `${role}${Date.now()}`;
  const userName = name || email.split("@")[0];

  const newUser: User = {
    id: newUserId,
    name: userName,
    email,
    phone: "",
    role,
    password,
  };

  if (role === "clinic") {
    const newClinic: Clinic = {
      id: newUserId,
      name: `${userName} Clinic`,
      address: "",
      phone: "",
      email,
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
      isActive: false,
      lastLoginDate: undefined,
    };

    newUser.clinicId = newUserId;
    mockClinics.push(newClinic);
  }

  mockUsers.push(newUser);

  if (role === "clinic") {
    activateClinic(newUserId);
  }

  return { success: true, message: "Account created successfully" };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);

  const setClinicForUser = async (userRecord: User): Promise<void> => {
    if (userRecord.role === "clinic" && userRecord.clinicId) {
      // Firestore clinic first
      try {
        const clinicDoc = await getDoc(doc(db, "clinics", userRecord.clinicId));
        if (clinicDoc.exists()) {
          const clinicData = clinicDoc.data() as Clinic;
          setClinic(clinicData);
          await updateDoc(doc(db, "clinics", userRecord.clinicId), {
            isActive: true,
            lastLoginDate: new Date().toISOString(),
          });
          return;
        }
      } catch (error) {
        // Fall back to local mock
      }

      const foundClinic = getClinicById(userRecord.clinicId);
      setClinic(foundClinic || null);
      activateClinic(userRecord.clinicId);
    } else {
      setClinic(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userId = firebaseUser.uid;
          const userDoc = await getDoc(doc(db, "users", userId));

          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setUser({ ...userData, password: userData.password || "" });
            await setClinicForUser(userData);
            return;
          }

          // Fallback to local user by email
          const foundUser = mockUsers.find(
            (u) => u.email.toLowerCase() === firebaseUser.email?.toLowerCase(),
          );
          if (foundUser) {
            setUser(foundUser);
            await setClinicForUser(foundUser);
            return;
          }

          setUser(null);
          setClinic(null);
        } catch (err) {
          setUser(null);
          setClinic(null);
        }
      } else {
        setUser(null);
        setClinic(null);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<AuthResponse> => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        normalizedPassword,
      );
      const firebaseUser = credential.user;

      if (!firebaseUser) {
        throw new Error("Firebase sign-in failed");
      }

      // load from Firestore
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setUser(userData);
        await setClinicForUser(userData);
        return { success: true, message: "Login successful" };
      }

      // fallback local login
      const foundUser = mockUsers.find(
        (u) =>
          u.email.toLowerCase() === normalizedEmail &&
          u.password === normalizedPassword,
      );

      if (!foundUser) {
        return { success: false, message: "Invalid credentials" };
      }

      setUser(foundUser);
      await setClinicForUser(foundUser);
      return { success: true, message: "Login successful (local fallback)" };
    } catch (error: any) {
      const message = error?.message || "Unable to login";

      // fallback local login attempt
      const foundUser = mockUsers.find(
        (u) =>
          u.email.toLowerCase() === normalizedEmail &&
          u.password === normalizedPassword,
      );

      if (foundUser) {
        setUser(foundUser);
        await setClinicForUser(foundUser);
        return { success: true, message: "Login successful (local fallback)" };
      }

      return { success: false, message };
    }
  };

  const signup = async (
    email: string,
    password: string,
    role: "patient" | "clinic" | "admin",
    name?: string,
  ): Promise<AuthResponse> => {
    if (role === "admin") {
      return { success: false, message: "Admin accounts cannot be registered" };
    }

    if (!email.includes("@")) {
      return { success: false, message: "Please enter a valid email address" };
    }

    const existingUser = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );

    if (existingUser) {
      return {
        success: false,
        message: "An account with this email already exists",
      };
    }

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password.trim(),
      );

      const firebaseUser = credential.user;
      const userId = firebaseUser.uid;
      const userName = name || email.split("@")[0];

      const newUser: User = {
        id: userId,
        name: userName,
        email: email.trim().toLowerCase(),
        phone: "",
        role,
        password,
      };

      if (role === "clinic") {
        newUser.clinicId = userId;
      }

      await setDoc(doc(db, "users", userId), newUser);

      if (role === "clinic") {
        const clinicData: Clinic = {
          id: userId,
          name: `${userName} Clinic`,
          address: "",
          phone: "",
          email: email.trim().toLowerCase(),
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
          isActive: true,
          lastLoginDate: new Date().toISOString(),
        };

        await setDoc(doc(db, "clinics", userId), clinicData);
      }

      setUser(newUser);
      if (role === "clinic") {
        const newClinic = role === "clinic" ? await getDoc(doc(db, "clinics", userId)) : null;
        if (newClinic?.exists()) {
          setClinic(newClinic.data() as Clinic);
        }
      }

      return { success: true, message: "Account created successfully" };
    } catch (error: any) {
      // fallback to local signup if Firebase fails
      return await localSignup(email, password, role, name);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      // ignore firebase logout errors and clear local state
    }

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
