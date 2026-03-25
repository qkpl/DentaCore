import { Clinic, mockClinics, mockUsers, User } from "@/data/mockData";
import {
  activateClinic,
  getClinicById,
  syncAdminRelationships,
  syncAppointmentsFromFirestore,
  updateUser as updateUserCache,
} from "@/services/dataService";
import { auth, db } from "@/services/firebase";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthResponse {
  success: boolean;
  message: string;
}

interface AuthContextType {
  user: User | null;
  clinic: Clinic | null;
  login: (
    email: string,
    password: string,
    expectedRole?: User["role"],
  ) => Promise<AuthResponse>;
  signup: (
    email: string,
    password: string,
    role: "patient" | "clinic" | "admin",
    name?: string,
    clinicAddress?: string,
  ) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshClinics: () => Promise<void>;
  isAuthenticated: boolean;
  updateProfile: (
    updates: Partial<Pick<User, "name" | "phone" | "address">>,
  ) => Promise<AuthResponse>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<AuthResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildDefaultAdminUser = (): User => {
  const managedClinicIds = mockClinics.map((clinic) => clinic.id);
  const managedPatientIds = mockUsers
    .filter((user) => user.role === "patient")
    .map((user) => user.id);

  return {
    id: "admin1",
    name: "System Admin",
    email: "admin@dentacore.com",
    phone: "+1 (555) 999-0000",
    role: "admin",
    password: "admin123",
    managedClinicIds,
    managedPatientIds,
  };
};

const ensureAdminAuthAccount = async (
  email: string,
  password: string,
): Promise<void> => {
  // Skip seeding if someone is already signed in (respect persisted sessions)
  if (auth.currentUser) {
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    if (error?.code === "auth/user-not-found") {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (createError) {
        console.warn("Failed to create default admin account", createError);
      }
    } else {
      console.warn("Failed to sign in default admin", error);
    }
  } finally {
    try {
      await signOut(auth);
    } catch (signOutError) {
      // Ignore sign-out error; this only runs during admin seeding
    }
  }
};

const ensureDefaultAdminUser = async (): Promise<void> => {
  const adminTemplate = buildDefaultAdminUser();
  const adminIndex = mockUsers.findIndex(
    (user) => user.id === adminTemplate.id,
  );

  if (adminIndex === -1) {
    mockUsers.push(adminTemplate);
  } else {
    mockUsers[adminIndex] = { ...mockUsers[adminIndex], ...adminTemplate };
  }

  syncAdminRelationships();

  try {
    const adminDocRef = doc(db, "users", adminTemplate.id);
    const snapshot = await getDoc(adminDocRef);

    if (!snapshot.exists()) {
      await setDoc(adminDocRef, adminTemplate);
      await ensureAdminAuthAccount(adminTemplate.email, adminTemplate.password);
      return;
    }

    const remoteData = snapshot.data() as User;
    const needsManagedClinicUpdate =
      (remoteData.managedClinicIds?.length || 0) !==
      (adminTemplate.managedClinicIds?.length || 0);
    const needsManagedPatientUpdate =
      (remoteData.managedPatientIds?.length || 0) !==
      (adminTemplate.managedPatientIds?.length || 0);

    if (needsManagedClinicUpdate || needsManagedPatientUpdate) {
      await setDoc(adminDocRef, adminTemplate, { merge: true });
    }

    await ensureAdminAuthAccount(adminTemplate.email, adminTemplate.password);
  } catch (error) {
    // Ignore failures when seeding admin account to keep offline support working.
  }
};

const localSignup = async (
  email: string,
  password: string,
  role: "patient" | "clinic" | "admin",
  name?: string,
  clinicAddress?: string,
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
    if (!clinicAddress?.trim()) {
      return { success: false, message: "Clinic address is required" };
    }

    const newClinic: Clinic = {
      id: newUserId,
      name: `${userName} Clinic`,
      address: clinicAddress.trim(),
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
  syncAdminRelationships();

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

  const applyUserUpdates = (
    updates: Partial<User>,
    baseUser?: User | null,
  ): User | null => {
    const source = baseUser ?? user;
    if (!source) {
      return null;
    }

    const mergedUser = { ...source, ...updates } as User;
    setUser(mergedUser);
    updateUserCache(source.id, updates);
    return mergedUser;
  };

  const upsertMockClinic = (clinicData: Clinic): void => {
    const index = mockClinics.findIndex((item) => item.id === clinicData.id);
    if (index === -1) {
      mockClinics.push(clinicData);
      return;
    }

    mockClinics[index] = {
      ...mockClinics[index],
      ...clinicData,
    };
  };

  const syncClinicsFromFirestore = async (): Promise<void> => {
    try {
      const clinicsSnapshot = await getDocs(collection(db, "clinics"));
      clinicsSnapshot.forEach((clinicDoc) => {
        const clinicData = clinicDoc.data() as Clinic;
        upsertMockClinic({
          ...clinicData,
          id: clinicData.id || clinicDoc.id,
        });
      });
    } catch (error) {
      // Ignore sync failures and keep using currently available local data.
    }
  };

  const setClinicForUser = async (userRecord: User): Promise<void> => {
    if (userRecord.role === "clinic" && userRecord.clinicId) {
      // Firestore clinic first
      try {
        const clinicDoc = await getDoc(doc(db, "clinics", userRecord.clinicId));
        if (clinicDoc.exists()) {
          const clinicData = clinicDoc.data() as Clinic;
          upsertMockClinic(clinicData);
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
    void ensureDefaultAdminUser();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userId = firebaseUser.uid;
          const userDoc = await getDoc(doc(db, "users", userId));

          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setUser({ ...userData, password: userData.password || "" });
            await syncClinicsFromFirestore();
            await syncAppointmentsFromFirestore();
            await setClinicForUser(userData);
            return;
          }

          // Fallback to local user by email
          const foundUser = mockUsers.find(
            (u) => u.email.toLowerCase() === firebaseUser.email?.toLowerCase(),
          );
          if (foundUser) {
            setUser(foundUser);
            await syncAppointmentsFromFirestore();
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
    expectedRole?: User["role"],
  ): Promise<AuthResponse> => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    const formatRoleLabel = (role: User["role"]) =>
      role.charAt(0).toUpperCase() + role.slice(1);

    const enforceRole = async (account: User): Promise<AuthResponse | null> => {
      if (!expectedRole) {
        return null;
      }

      if (account.role !== expectedRole) {
        const response: AuthResponse = {
          success: false,
          message: `This account is registered as a ${formatRoleLabel(account.role)}. Switch to the ${formatRoleLabel(account.role)} login to continue.`,
        };

        try {
          await signOut(auth);
        } catch (error) {
          // Ignore sign-out failure when enforcing role
        }

        return response;
      }

      return null;
    };

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

      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        const roleMismatch = await enforceRole(userData);
        if (roleMismatch) {
          return roleMismatch;
        }
        setUser(userData);
        await syncClinicsFromFirestore();
        await syncAppointmentsFromFirestore();
        await setClinicForUser(userData);
        return { success: true, message: "Login successful" };
      }

      const foundUser = mockUsers.find(
        (u) =>
          u.email.toLowerCase() === normalizedEmail &&
          u.password === normalizedPassword,
      );

      if (!foundUser) {
        return { success: false, message: "Invalid credentials" };
      }

      const roleMismatch = await enforceRole(foundUser);
      if (roleMismatch) {
        return roleMismatch;
      }

      setUser(foundUser);
      await syncAppointmentsFromFirestore();
      await setClinicForUser(foundUser);
      return { success: true, message: "Login successful (local fallback)" };
    } catch (error: any) {
      const message = error?.message || "Unable to login";

      const foundUser = mockUsers.find(
        (u) =>
          u.email.toLowerCase() === normalizedEmail &&
          u.password === normalizedPassword,
      );

      if (foundUser) {
        const roleMismatch = await enforceRole(foundUser);
        if (roleMismatch) {
          return roleMismatch;
        }
        setUser(foundUser);
        await syncAppointmentsFromFirestore();
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
    clinicAddress?: string,
  ): Promise<AuthResponse> => {
    if (role === "admin") {
      return { success: false, message: "Admin accounts cannot be registered" };
    }

    if (!email.includes("@")) {
      return { success: false, message: "Please enter a valid email address" };
    }

    if (role === "clinic" && !clinicAddress?.trim()) {
      return { success: false, message: "Clinic address is required" };
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
      mockUsers.push(newUser);
      syncAdminRelationships();

      if (role === "clinic") {
        const clinicData: Clinic = {
          id: userId,
          name: `${userName} Clinic`,
          address: clinicAddress?.trim() || "",
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
        upsertMockClinic(clinicData);
      }

      setUser(newUser);
      if (role === "clinic") {
        const newClinic =
          role === "clinic" ? await getDoc(doc(db, "clinics", userId)) : null;
        if (newClinic?.exists()) {
          setClinic(newClinic.data() as Clinic);
        }
      }

      return { success: true, message: "Account created successfully" };
    } catch (error: any) {
      // fallback to local signup if Firebase fails
      return await localSignup(email, password, role, name, clinicAddress);
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

  const updateProfile = async (
    updates: Partial<Pick<User, "name" | "phone" | "address">>,
  ): Promise<AuthResponse> => {
    if (!user) {
      return { success: false, message: "You need to be logged in." };
    }

    const sanitized: Partial<User> = {};

    if (updates.name !== undefined) {
      sanitized.name = updates.name.trim();
    }

    if (updates.phone !== undefined) {
      sanitized.phone = updates.phone.trim();
    }

    if (updates.address !== undefined) {
      sanitized.address = updates.address.trim();
    }

    const hasChanges = Object.keys(sanitized).length > 0;
    if (!hasChanges) {
      return { success: false, message: "No profile changes detected." };
    }

    let syncedWithCloud = true;
    try {
      await updateDoc(doc(db, "users", user.id), sanitized);
    } catch (error) {
      syncedWithCloud = false;
      console.warn("Failed to update profile in Firestore", error);
    }

    applyUserUpdates(sanitized);

    return {
      success: true,
      message: syncedWithCloud
        ? "Profile updated successfully."
        : "Profile updated locally. Changes will sync when you're back online.",
    };
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResponse> => {
    if (!user) {
      return { success: false, message: "You need to be logged in." };
    }

    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();

    if (!trimmedCurrent || !trimmedNew) {
      return {
        success: false,
        message: "Please provide both the current and new password.",
      };
    }

    if (trimmedNew.length < 6) {
      return {
        success: false,
        message: "Password should be at least 6 characters long.",
      };
    }

    if (trimmedCurrent === trimmedNew) {
      return {
        success: false,
        message: "New password cannot match the current password.",
      };
    }

    const firebaseUser = auth.currentUser;

    if (firebaseUser?.email) {
      try {
        const credential = EmailAuthProvider.credential(
          firebaseUser.email,
          trimmedCurrent,
        );
        await reauthenticateWithCredential(firebaseUser, credential);
        await updatePassword(firebaseUser, trimmedNew);
      } catch (error: any) {
        const code = error?.code ?? "";
        if (
          code === "auth/invalid-credential" ||
          code === "auth/wrong-password"
        ) {
          return { success: false, message: "Current password is incorrect." };
        }
        if (code === "auth/weak-password") {
          return {
            success: false,
            message: "Password should be at least 6 characters long.",
          };
        }
        return {
          success: false,
          message:
            "Unable to update password right now. Please try again later.",
        };
      }
    } else {
      if (!user.password || user.password !== trimmedCurrent) {
        return {
          success: false,
          message: "Current password is incorrect.",
        };
      }
    }

    try {
      await updateDoc(doc(db, "users", user.id), { password: trimmedNew });
    } catch (error) {
      console.warn("Failed to sync password change to Firestore", error);
    }

    applyUserUpdates({ password: trimmedNew });

    return {
      success: true,
      message: "Password updated successfully.",
    };
  };

  const refreshClinics = async (): Promise<void> => {
    await syncClinicsFromFirestore();
    await syncAppointmentsFromFirestore();
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        clinic,
        login,
        signup,
        logout,
        refreshClinics,
        isAuthenticated,
        updateProfile,
        changePassword,
      }}
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
