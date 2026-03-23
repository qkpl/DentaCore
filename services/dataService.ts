import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    DocumentData,
    getDocs,
    query,
    QueryDocumentSnapshot,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";
import {
    Appointment,
    Clinic,
    DentalRecord,
    mockAppointments,
    mockClinics,
    mockDentalRecords,
    mockStaffMembers,
    mockUsers,
    StaffMember,
    User,
} from "../data/mockData";
import { db } from "./firebase";

type FirestoreDentalRecord = Partial<
  DentalRecord & {
    appointmentId?: string;
    createdAt?: string;
  }
>;

const appointmentsCollection = collection(db, "appointments");
const patientRecordsCollection = collection(db, "patientRecords");
const LOCAL_RECORDS_KEY = "dentacore/localDentalRecords";
let localRecordsCache: DentalRecord[] | null = null;

const loadLocalRecords = async (): Promise<DentalRecord[]> => {
  if (localRecordsCache) {
    return localRecordsCache;
  }

  try {
    const stored = await AsyncStorage.getItem(LOCAL_RECORDS_KEY);
    if (stored) {
      localRecordsCache = JSON.parse(stored) as DentalRecord[];
      return localRecordsCache;
    }
  } catch (error) {
    // Ignore storage errors; fall back to mock data
  }

  localRecordsCache = [...mockDentalRecords];
  return localRecordsCache;
};

const persistLocalRecords = async (records: DentalRecord[]) => {
  localRecordsCache = records;
  try {
    await AsyncStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(records));
  } catch (error) {
    // Ignore AsyncStorage write failures
  }
};

const appendLocalRecord = async (record: DentalRecord) => {
  const cache = await loadLocalRecords();
  cache.push(record);
  await persistLocalRecords(cache);
};

const replaceAppointmentsCache = (appointments: Appointment[]) => {
  mockAppointments.splice(0, mockAppointments.length, ...appointments);
};

const filterLocalRecords = async (
  predicate: (record: DentalRecord) => boolean,
): Promise<DentalRecord[]> => {
  const cache = await loadLocalRecords();
  return cache.filter(predicate);
};

const safeString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const appointmentStatuses: Appointment["status"][] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

const parseAppointmentStatus = (value: unknown): Appointment["status"] => {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    const status = appointmentStatuses.find((item) => item === normalized);
    if (status) {
      return status;
    }
  }
  return "pending";
};

const mapFirestoreRecord = (
  snapshot: QueryDocumentSnapshot<DocumentData>,
): DentalRecord => {
  const data = snapshot.data() as FirestoreDentalRecord;
  return {
    id: snapshot.id,
    patientId: safeString(data.patientId),
    clinicId: safeString(data.clinicId),
    clinicName: safeString(data.clinicName),
    dentistName: safeString(data.dentistName),
    date: safeString(data.date),
    type: safeString(data.type),
    description: safeString(data.description),
    treatment: safeString(data.treatment),
    notes: safeString(data.notes),
  };
};

const mapFirestoreAppointment = (
  snapshot: QueryDocumentSnapshot<DocumentData>,
): Appointment => {
  const data = snapshot.data() as Partial<Appointment>;
  return {
    id: snapshot.id,
    patientId: safeString(data.patientId),
    patientName: safeString(data.patientName),
    clinicId: safeString(data.clinicId),
    clinicName: safeString(data.clinicName),
    dentistName: safeString(data.dentistName),
    date: safeString(data.date),
    time: safeString(data.time),
    type: safeString(data.type),
    status: parseAppointmentStatus(data.status),
  };
};

const sortRecordsDesc = (records: DentalRecord[]) =>
  [...records].sort((a, b) => b.date.localeCompare(a.date));

const persistDentalRecordToFirestore = async (
  record: Omit<DentalRecord, "id">,
  appointmentId?: string,
) => {
  const payload: FirestoreDentalRecord = {
    ...record,
    appointmentId,
    createdAt: new Date().toISOString(),
  };

  if (appointmentId) {
    const recordDocRef = doc(db, "patientRecords", appointmentId);
    await setDoc(recordDocRef, payload);
    return appointmentId;
  }

  const docRef = await addDoc(patientRecordsCollection, payload);
  return docRef.id;
};

const persistAppointmentToFirestore = async (appointment: Appointment) => {
  const appointmentDoc = doc(db, "appointments", appointment.id);
  await setDoc(appointmentDoc, appointment);
};

export const syncAppointmentsFromFirestore = async (): Promise<void> => {
  try {
    const snapshot = await getDocs(appointmentsCollection);
    if (snapshot.empty) {
      return;
    }

    const fetchedAppointments = snapshot.docs.map(mapFirestoreAppointment);
    replaceAppointmentsCache(fetchedAppointments);
  } catch (error) {
    console.warn("Failed to sync appointments from Firestore", error);
  }
};

// Clinic Services ----------------------------------------------------------

export const searchClinics = (query: string): Clinic[] => {
  if (!query || query.trim() === "") {
    return mockClinics;
  }

  const lowercaseQuery = query.toLowerCase();
  return mockClinics.filter(
    (clinic) =>
      clinic.name.toLowerCase().includes(lowercaseQuery) ||
      clinic.address.toLowerCase().includes(lowercaseQuery) ||
      clinic.description.toLowerCase().includes(lowercaseQuery),
  );
};

export const getClinicById = (clinicId: string): Clinic | undefined => {
  return mockClinics.find((clinic) => clinic.id === clinicId);
};

export const getAllClinics = (): Clinic[] => {
  return mockClinics;
};

export const getActiveClinics = (): Clinic[] => {
  return mockClinics.filter((clinic) => clinic.isActive);
};

export const activateClinic = (clinicId: string): boolean => {
  const clinic = mockClinics.find((c) => c.id === clinicId);
  if (clinic) {
    clinic.isActive = true;
    clinic.lastLoginDate = new Date().toISOString();
    return true;
  }
  return false;
};

export const filterClinics = (filters: {
  services?: string[];
  minRating?: number;
  maxPrice?: number;
  sortBy?: "name" | "rating" | "patients";
}): Clinic[] => {
  let filtered = [...mockClinics];

  if (filters.services && filters.services.length > 0) {
    filtered = filtered.filter((clinic) =>
      filters.services!.some((service) =>
        clinic.servicesOffered.some((s) =>
          s.toLowerCase().includes(service.toLowerCase()),
        ),
      ),
    );
  }

  if (filters.minRating !== undefined) {
    filtered = filtered.filter((clinic) => clinic.rating >= filters.minRating!);
  }

  if (filters.sortBy === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (filters.sortBy === "rating") {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (filters.sortBy === "patients") {
    filtered.sort((a, b) => b.totalPatients - a.totalPatients);
  }

  return filtered;
};

export const updateClinic = (
  clinicId: string,
  updates: Partial<Omit<Clinic, "id">>,
): boolean => {
  const index = mockClinics.findIndex((c) => c.id === clinicId);
  if (index !== -1) {
    mockClinics[index] = { ...mockClinics[index], ...updates };
    return true;
  }
  return false;
};

export const deleteClinic = (clinicId: string): boolean => {
  const index = mockClinics.findIndex((c) => c.id === clinicId);
  if (index !== -1) {
    mockClinics.splice(index, 1);

    const appointmentIndexes = mockAppointments
      .map((apt, idx) => (apt.clinicId === clinicId ? idx : -1))
      .filter((idx) => idx !== -1)
      .reverse();

    appointmentIndexes.forEach((idx) => mockAppointments.splice(idx, 1));
    return true;
  }
  return false;
};

// Appointment Services -----------------------------------------------------

export const getAppointmentsByPatient = (patientId: string): Appointment[] => {
  return mockAppointments.filter((apt) => apt.patientId === patientId);
};

export const getAppointmentsByClinic = (clinicId: string): Appointment[] => {
  return mockAppointments.filter((apt) => apt.clinicId === clinicId);
};

export const getAppointmentById = (
  appointmentId: string,
): Appointment | undefined => {
  return mockAppointments.find((apt) => apt.id === appointmentId);
};

export const createAppointment = (
  appointment: Omit<Appointment, "id">,
): Appointment => {
  const newAppointment: Appointment = {
    ...appointment,
    id: `apt${Date.now()}`,
  };
  mockAppointments.push(newAppointment);
  void persistAppointmentToFirestore(newAppointment).catch((error) => {
    console.warn("Failed to persist appointment to Firestore", error);
  });
  return newAppointment;
};

export const updateAppointmentStatus = async (
  appointmentId: string,
  status: Appointment["status"],
): Promise<boolean> => {
  const appointmentIndex = mockAppointments.findIndex(
    (apt) => apt.id === appointmentId,
  );
  if (appointmentIndex === -1) {
    return false;
  }

  const appointment = mockAppointments[appointmentIndex];
  appointment.status = status;

  void updateDoc(doc(db, "appointments", appointmentId), {
    status,
  }).catch((error) => {
    console.warn("Failed to update appointment status in Firestore", error);
  });

  if (status === "completed") {
    const normalizedDentistName = appointment.dentistName.replace(
      /^Dr\.?\s*/i,
      "",
    );

    const recordPayload: Omit<DentalRecord, "id"> = {
      patientId: appointment.patientId,
      clinicId: appointment.clinicId,
      clinicName: appointment.clinicName,
      dentistName: normalizedDentistName,
      date: appointment.date,
      type: appointment.type,
      description: `${appointment.type} appointment completed at ${appointment.time}.`,
      treatment: appointment.type,
      notes:
        "Completed appointment record was auto-generated from booking status.",
    };

    let persistedInFirestore = false;
    try {
      await persistDentalRecordToFirestore(recordPayload, appointment.id);
      persistedInFirestore = true;
    } catch (error) {
      persistedInFirestore = false;
    }

    if (!persistedInFirestore) {
      const existingRecord = mockDentalRecords.find(
        (record) =>
          record.patientId === appointment.patientId &&
          record.clinicId === appointment.clinicId &&
          record.date === appointment.date &&
          record.type.toLowerCase() === appointment.type.toLowerCase(),
      );

      if (!existingRecord) {
        const fallbackRecord: DentalRecord = {
          id: `rec${Date.now()}`,
          ...recordPayload,
        };
        mockDentalRecords.push(fallbackRecord);
        await appendLocalRecord(fallbackRecord);
      }
    }
  }

  return true;
};

export const assignDentistToAppointment = (
  appointmentId: string,
  dentistName: string,
): boolean => {
  const appointment = mockAppointments.find((apt) => apt.id === appointmentId);
  if (!appointment) {
    return false;
  }

  appointment.dentistName = dentistName;
  void updateDoc(doc(db, "appointments", appointmentId), {
    dentistName,
  }).catch((error) => {
    console.warn("Failed to update dentist in Firestore", error);
  });
  return true;
};

export const updateAppointment = (
  appointmentId: string,
  updates: Partial<Omit<Appointment, "id">>,
): boolean => {
  const index = mockAppointments.findIndex((apt) => apt.id === appointmentId);
  if (index !== -1) {
    mockAppointments[index] = { ...mockAppointments[index], ...updates };
    void updateDoc(doc(db, "appointments", appointmentId), updates).catch(
      (error) => {
        console.warn("Failed to update appointment in Firestore", error);
      },
    );
    return true;
  }
  return false;
};

export const deleteAppointment = (appointmentId: string): boolean => {
  const index = mockAppointments.findIndex((apt) => apt.id === appointmentId);
  if (index !== -1) {
    mockAppointments.splice(index, 1);
    void deleteDoc(doc(db, "appointments", appointmentId)).catch((error) => {
      console.warn("Failed to delete appointment in Firestore", error);
    });
    return true;
  }
  return false;
};

// Dental Record Services ---------------------------------------------------

export const getRecordsByPatient = async (
  patientId: string,
): Promise<DentalRecord[]> => {
  try {
    const recordsQuery = query(
      patientRecordsCollection,
      where("patientId", "==", patientId),
    );
    const snapshot = await getDocs(recordsQuery);

    if (snapshot.empty) {
      const localRecords = await filterLocalRecords(
        (record) => record.patientId === patientId,
      );
      return sortRecordsDesc(localRecords);
    }

    const records = snapshot.docs.map(mapFirestoreRecord);
    return sortRecordsDesc(records);
  } catch (error) {
    const localRecords = await filterLocalRecords(
      (record) => record.patientId === patientId,
    );
    return sortRecordsDesc(localRecords);
  }
};

export const getRecordsByClinic = async (
  clinicId: string,
): Promise<DentalRecord[]> => {
  try {
    const recordsQuery = query(
      patientRecordsCollection,
      where("clinicId", "==", clinicId),
    );
    const snapshot = await getDocs(recordsQuery);

    if (snapshot.empty) {
      const localRecords = await filterLocalRecords(
        (record) => record.clinicId === clinicId,
      );
      return sortRecordsDesc(localRecords);
    }

    const records = snapshot.docs.map(mapFirestoreRecord);
    return sortRecordsDesc(records);
  } catch (error) {
    const localRecords = await filterLocalRecords(
      (record) => record.clinicId === clinicId,
    );
    return sortRecordsDesc(localRecords);
  }
};

export const getRecordById = (recordId: string): DentalRecord | undefined => {
  return mockDentalRecords.find((record) => record.id === recordId);
};

export const createDentalRecord = async (
  record: Omit<DentalRecord, "id">,
): Promise<DentalRecord> => {
  let savedRecord: DentalRecord | null = null;

  try {
    const documentId = await persistDentalRecordToFirestore(record);
    savedRecord = {
      ...record,
      id: documentId || `rec${Date.now()}`,
    };
  } catch (error) {
    savedRecord = {
      ...record,
      id: `rec${Date.now()}`,
    };
    mockDentalRecords.push(savedRecord);
  }

  await appendLocalRecord(savedRecord);
  return savedRecord;
};

// Staff Services -----------------------------------------------------------

export const getStaffByClinic = (clinicId: string): StaffMember[] => {
  return mockStaffMembers.filter((staff) => staff.clinicId === clinicId);
};

export const getStaffById = (staffId: string): StaffMember | undefined => {
  return mockStaffMembers.find((staff) => staff.id === staffId);
};

export const createStaffMember = (
  staff: Omit<StaffMember, "id">,
): StaffMember => {
  const newStaff: StaffMember = {
    ...staff,
    id: `staff${Date.now()}`,
  };

  mockStaffMembers.push(newStaff);
  return newStaff;
};

// User Services ------------------------------------------------------------

export const getAllUsers = (): User[] => {
  return mockUsers;
};

export const getUserById = (userId: string): User | undefined => {
  return mockUsers.find((user) => user.id === userId);
};

export const getUsersByRole = (role: User["role"]): User[] => {
  return mockUsers.filter((user) => user.role === role);
};

export const updateUser = (
  userId: string,
  updates: Partial<Omit<User, "id">>,
): boolean => {
  const index = mockUsers.findIndex((u) => u.id === userId);
  if (index !== -1) {
    mockUsers[index] = { ...mockUsers[index], ...updates };
    return true;
  }
  return false;
};

export const deleteUser = (userId: string): boolean => {
  const index = mockUsers.findIndex((u) => u.id === userId);
  if (index !== -1) {
    mockUsers.splice(index, 1);

    const appointmentIndexes = mockAppointments
      .map((apt, idx) => (apt.patientId === userId ? idx : -1))
      .filter((idx) => idx !== -1)
      .reverse();

    appointmentIndexes.forEach((idx) => mockAppointments.splice(idx, 1));
    return true;
  }
  return false;
};

// Analytics Services -------------------------------------------------------

export const getSystemStats = () => {
  return {
    totalClinics: mockClinics.length,
    totalPatients: mockUsers.filter((u) => u.role === "patient").length,
    totalAppointments: mockAppointments.length,
    totalRevenue: mockClinics.reduce((sum, clinic) => sum + clinic.revenue, 0),
  };
};

export const getClinicStats = async (clinicId: string) => {
  const clinic = getClinicById(clinicId);
  const appointments = getAppointmentsByClinic(clinicId);
  const records = await getRecordsByClinic(clinicId);

  return {
    totalAppointments: appointments.length,
    pendingAppointments: appointments.filter((a) => a.status === "pending")
      .length,
    confirmedAppointments: appointments.filter((a) => a.status === "confirmed")
      .length,
    completedAppointments: appointments.filter((a) => a.status === "completed")
      .length,
    totalPatients: clinic?.totalPatients || 0,
    todaysAppointments: clinic?.todaysAppointments || 0,
    revenue: clinic?.revenue || 0,
    totalRecords: records.length,
  };
};
