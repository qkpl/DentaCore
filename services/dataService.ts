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
    ClinicReview,
    DentalRecord,
    mockAppointments,
    mockClinicReviews,
    mockClinics,
    mockDentalRecords,
    mockStaffMembers,
    mockUsers,
    PaymentMethod,
    PaymentStatus,
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
const clinicsCollection = collection(db, "clinics");
const usersCollection = collection(db, "users");
const clinicReviewsCollection = collection(db, "clinicReviews");
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

const deleteLocalRecord = async (recordId: string): Promise<boolean> => {
  const cache = await loadLocalRecords();
  const filtered = cache.filter((record) => record.id !== recordId);
  if (filtered.length === cache.length) {
    return false;
  }

  await persistLocalRecords(filtered);
  return true;
};

const replaceAppointmentsCache = (appointments: Appointment[]) => {
  mockAppointments.splice(0, mockAppointments.length, ...appointments);
};

const replaceClinicsCache = (clinics: Clinic[]) => {
  mockClinics.splice(0, mockClinics.length, ...clinics);
};

const replaceUsersCache = (users: User[]) => {
  mockUsers.splice(0, mockUsers.length, ...users);
  syncAdminRelationships();
};

export const syncAdminRelationships = (): void => {
  const clinicIds = mockClinics.map((clinic) => clinic.id);
  const patientIds = mockUsers
    .filter((user) => user.role === "patient")
    .map((user) => user.id);

  mockUsers
    .filter((user) => user.role === "admin")
    .forEach((admin) => {
      admin.managedClinicIds = clinicIds;
      admin.managedPatientIds = patientIds;
    });
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

const paymentMethods: PaymentMethod[] = ["card", "gcash", "paypal"];
const paymentStatuses: PaymentStatus[] = [
  "pending",
  "paid",
  "refunded",
  "failed",
];

const DEFAULT_SERVICE_PRICE = 2600;

const appointmentPriceLookup: Record<string, number> = {
  "dental cleaning": 2800,
  "teeth cleaning": 2500,
  checkup: 1800,
  "dental checkup": 1800,
  "routine checkup": 1800,
  "root canal": 7200,
  orthodontics: 9500,
  braces: 9500,
  filling: 3200,
  "dental filling": 3200,
  extraction: 3500,
  "tooth extraction": 3500,
  implants: 12500,
  "dental implants": 12500,
  "teeth whitening": 4200,
  whitening: 4200,
  "cosmetic dentistry": 6800,
  "general dentistry": 2500,
  "preventive care": 2100,
  "restorative dentistry": 5400,
  "pediatric dentistry": 3000,
  "emergency care": 4000,
};

const normalizeServiceKey = (value: string): string =>
  value.trim().toLowerCase();

export const getServicePrice = (serviceName?: string | null): number => {
  if (!serviceName) {
    return DEFAULT_SERVICE_PRICE;
  }

  const key = normalizeServiceKey(serviceName);
  return appointmentPriceLookup[key] ?? DEFAULT_SERVICE_PRICE;
};

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const defaultOperatingHours = {
  monday: "9:00 AM - 5:00 PM",
  tuesday: "9:00 AM - 5:00 PM",
  wednesday: "9:00 AM - 5:00 PM",
  thursday: "9:00 AM - 5:00 PM",
  friday: "9:00 AM - 5:00 PM",
  saturday: "Closed",
  sunday: "Closed",
};

const estimateAppointmentValue = (appointment: Appointment): number => {
  const base = getServicePrice(appointment.type);

  switch (appointment.status) {
    case "completed":
      return base;
    case "confirmed":
      return base * 0.95;
    case "pending":
      return base * 0.75;
    case "cancelled":
      return base * 0.2;
    default:
      return base;
  }
};

const formatMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split("-");
  const monthIndex = Number(month) - 1;
  const label = monthNames[Math.max(0, Math.min(11, monthIndex))];
  return `${label} ${year.slice(-2)}`;
};

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

const parsePaymentStatus = (value: unknown): PaymentStatus => {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    const status = paymentStatuses.find((item) => item === normalized);
    if (status) {
      return status;
    }
  }
  return "pending";
};

const parsePaymentMethod = (value: unknown): PaymentMethod | undefined => {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    const method = paymentMethods.find((item) => item === normalized);
    if (method) {
      return method;
    }
  }
  return undefined;
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
    paymentMethod: parsePaymentMethod(data.paymentMethod),
    paymentStatus: parsePaymentStatus(data.paymentStatus),
    transactionId: safeString(data.transactionId),
  };
};

const safeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

const mapFirestoreClinic = (
  snapshot: QueryDocumentSnapshot<DocumentData>,
): Clinic => {
  const data = snapshot.data() as Partial<Clinic>;
  const operatingHours = data.operatingHours || {};
  return {
    id: data.id || snapshot.id,
    name: safeString(data.name) || "Unnamed Clinic",
    address: safeString(data.address) || "No address provided",
    phone: safeString(data.phone),
    email: safeString(data.email),
    description: safeString(data.description) || "Clinic",
    servicesOffered: Array.isArray(data.servicesOffered)
      ? (data.servicesOffered as string[])
      : [],
    operatingHours: {
      monday:
        safeString((operatingHours as any)?.monday) ||
        defaultOperatingHours.monday,
      tuesday:
        safeString((operatingHours as any)?.tuesday) ||
        defaultOperatingHours.tuesday,
      wednesday:
        safeString((operatingHours as any)?.wednesday) ||
        defaultOperatingHours.wednesday,
      thursday:
        safeString((operatingHours as any)?.thursday) ||
        defaultOperatingHours.thursday,
      friday:
        safeString((operatingHours as any)?.friday) ||
        defaultOperatingHours.friday,
      saturday:
        safeString((operatingHours as any)?.saturday) ||
        defaultOperatingHours.saturday,
      sunday:
        safeString((operatingHours as any)?.sunday) ||
        defaultOperatingHours.sunday,
    },
    rating: safeNumber((data as any)?.rating, 0),
    totalPatients: safeNumber((data as any)?.totalPatients, 0),
    todaysAppointments: safeNumber((data as any)?.todaysAppointments, 0),
    revenue: safeNumber((data as any)?.revenue, 0),
    location:
      typeof data.location === "object" && data.location
        ? data.location
        : { lat: 0, lng: 0 },
    isActive: Boolean(data.isActive),
    lastLoginDate: data.lastLoginDate,
  };
};

const normalizeUserRole = (role: unknown): User["role"] => {
  if (role === "clinic" || role === "admin" || role === "patient") {
    return role;
  }
  return "patient";
};

const mapFirestoreUser = (
  snapshot: QueryDocumentSnapshot<DocumentData>,
): User => {
  const data = snapshot.data() as Partial<User>;
  return {
    id: data.id || snapshot.id,
    name: safeString(data.name) || "New User",
    email: safeString(data.email),
    phone: safeString(data.phone),
    role: normalizeUserRole(data.role),
    password: safeString((data as any)?.password),
    clinicId: safeString(data.clinicId) || undefined,
    address: safeString(data.address) || undefined,
    managedClinicIds: Array.isArray(data.managedClinicIds)
      ? (data.managedClinicIds as string[])
      : undefined,
    managedPatientIds: Array.isArray(data.managedPatientIds)
      ? (data.managedPatientIds as string[])
      : undefined,
  };
};

const mapFirestoreClinicReview = (
  snapshot: QueryDocumentSnapshot<DocumentData>,
): ClinicReview => {
  const data = snapshot.data() as Partial<ClinicReview>;
  return {
    id: snapshot.id,
    appointmentId: safeString(data.appointmentId),
    clinicId: safeString(data.clinicId),
    clinicName: safeString(data.clinicName),
    patientId: safeString(data.patientId),
    patientName: safeString(data.patientName),
    rating: safeNumber((data as any)?.rating, 0),
    comment: safeString(data.comment),
    createdAt: safeString(data.createdAt) || new Date().toISOString(),
  };
};

const getLocalClinicReviewsByPatient = (patientId: string): ClinicReview[] =>
  mockClinicReviews.filter((review) => review.patientId === patientId);

const getLocalClinicReviewsByClinic = (clinicId: string): ClinicReview[] =>
  mockClinicReviews.filter((review) => review.clinicId === clinicId);

const getLocalReviewByAppointment = (
  appointmentId: string,
): ClinicReview | undefined =>
  mockClinicReviews.find((review) => review.appointmentId === appointmentId);

const recalcClinicRatingFromReviews = (clinicId: string): void => {
  const clinic = mockClinics.find((item) => item.id === clinicId);
  if (!clinic) {
    return;
  }

  const reviews = getLocalClinicReviewsByClinic(clinicId);
  if (reviews.length === 0) {
    return;
  }

  const average =
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  const roundedAverage = Math.round(average * 10) / 10;
  clinic.rating = roundedAverage;
  clinic.totalPatients = Math.max(clinic.totalPatients, reviews.length);

  void updateDoc(doc(db, "clinics", clinicId), {
    rating: clinic.rating,
    totalPatients: clinic.totalPatients,
  }).catch((error) => {
    console.warn("Failed to refresh clinic rating", error);
  });
};

const upsertLocalReview = (review: ClinicReview) => {
  const index = mockClinicReviews.findIndex((item) => item.id === review.id);
  if (index === -1) {
    mockClinicReviews.push(review);
  } else {
    mockClinicReviews[index] = review;
  }
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

syncAdminRelationships();

export const refreshClinicsFromFirestore = async (): Promise<Clinic[]> => {
  try {
    const snapshot = await getDocs(clinicsCollection);
    if (!snapshot.empty) {
      const fetchedClinics = snapshot.docs.map(mapFirestoreClinic);
      replaceClinicsCache(fetchedClinics);
      syncAdminRelationships();
    }
  } catch (error) {
    console.warn("Failed to sync clinics from Firestore", error);
  }

  return [...mockClinics];
};

export const refreshUsersFromFirestore = async (): Promise<User[]> => {
  try {
    const snapshot = await getDocs(usersCollection);
    if (!snapshot.empty) {
      const fetchedUsers = snapshot.docs.map(mapFirestoreUser);
      const existingAdmins = mockUsers.filter((user) => user.role === "admin");
      const hasAdmin = fetchedUsers.some((user) => user.role === "admin");
      const mergedUsers = hasAdmin
        ? fetchedUsers
        : [...fetchedUsers, ...existingAdmins];
      replaceUsersCache(mergedUsers);
    }
  } catch (error) {
    console.warn("Failed to sync users from Firestore", error);
  }

  return [...mockUsers];
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

export const getClinicReviewByAppointment = (
  appointmentId: string,
): ClinicReview | undefined => getLocalReviewByAppointment(appointmentId);

export const getClinicReviewsByClinic = async (
  clinicId: string,
): Promise<ClinicReview[]> => {
  try {
    const reviewsQuery = query(
      clinicReviewsCollection,
      where("clinicId", "==", clinicId),
    );
    const snapshot = await getDocs(reviewsQuery);
    if (snapshot.empty) {
      return getLocalClinicReviewsByClinic(clinicId);
    }

    const reviews = snapshot.docs.map(mapFirestoreClinicReview);
    reviews.forEach(upsertLocalReview);
    return reviews;
  } catch (error) {
    console.warn("Failed to fetch clinic reviews", error);
    return getLocalClinicReviewsByClinic(clinicId);
  }
};

export const getClinicReviewsByPatient = async (
  patientId: string,
): Promise<ClinicReview[]> => {
  try {
    const reviewsQuery = query(
      clinicReviewsCollection,
      where("patientId", "==", patientId),
    );
    const snapshot = await getDocs(reviewsQuery);
    if (snapshot.empty) {
      return getLocalClinicReviewsByPatient(patientId);
    }

    const reviews = snapshot.docs.map(mapFirestoreClinicReview);
    reviews.forEach(upsertLocalReview);
    return reviews;
  } catch (error) {
    console.warn("Failed to fetch patient reviews", error);
    return getLocalClinicReviewsByPatient(patientId);
  }
};

export type SubmitClinicReviewInput = {
  appointmentId: string;
  clinicId: string;
  clinicName: string;
  patientId: string;
  patientName: string;
  rating: number;
  comment: string;
};

export const submitClinicReview = async (
  input: SubmitClinicReviewInput,
): Promise<ClinicReview> => {
  const ratingValue = Math.max(1, Math.min(5, input.rating));
  const existingReview = getLocalReviewByAppointment(input.appointmentId);
  const timestamp = existingReview?.createdAt ?? new Date().toISOString();
  const payload = {
    appointmentId: input.appointmentId,
    clinicId: input.clinicId,
    clinicName: input.clinicName,
    patientId: input.patientId,
    patientName: input.patientName,
    rating: ratingValue,
    comment: input.comment.trim(),
    createdAt: timestamp,
  };

  let savedReview: ClinicReview;

  try {
    if (existingReview) {
      const reviewDoc = doc(db, "clinicReviews", existingReview.id);
      await setDoc(reviewDoc, payload, { merge: true });
      savedReview = { id: existingReview.id, ...payload };
    } else {
      const docRef = await addDoc(clinicReviewsCollection, payload);
      savedReview = { id: docRef.id, ...payload };
    }
  } catch (error) {
    console.warn("Failed to persist review to Firestore", error);
    const fallbackId = existingReview?.id ?? `review-${Date.now()}`;
    savedReview = { id: fallbackId, ...payload };
  }

  upsertLocalReview(savedReview);
  recalcClinicRatingFromReviews(input.clinicId);
  return savedReview;
};

export const updateClinic = async (
  clinicId: string,
  updates: Partial<Omit<Clinic, "id">>,
): Promise<boolean> => {
  const index = mockClinics.findIndex((c) => c.id === clinicId);
  if (index === -1) {
    return false;
  }

  const previousClinic = { ...mockClinics[index] };
  mockClinics[index] = { ...previousClinic, ...updates };

  try {
    await updateDoc(doc(db, "clinics", clinicId), updates);
    return true;
  } catch (error) {
    console.warn("Failed to update clinic in Firestore", error);
    mockClinics[index] = previousClinic;
    return false;
  }
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
    syncAdminRelationships();
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

const sortAppointmentsByDateTimeDesc = (
  appointments: Appointment[],
): Appointment[] => {
  return [...appointments].sort((a, b) => {
    const aKey = `${a.date ?? ""} ${a.time ?? ""}`;
    const bKey = `${b.date ?? ""} ${b.time ?? ""}`;
    return bKey.localeCompare(aKey);
  });
};

const filterPaidOrWithMethod = (appointments: Appointment[]): Appointment[] => {
  const paid = appointments.filter((apt) => apt.paymentStatus === "paid");
  if (paid.length > 0) {
    return paid;
  }
  return appointments.filter((apt) => Boolean(apt.paymentMethod));
};

export const getRecentTransactions = (limit = 6): Appointment[] => {
  const source = filterPaidOrWithMethod(mockAppointments);
  return sortAppointmentsByDateTimeDesc(source).slice(0, limit);
};

export const getClinicTransactions = (
  clinicId: string,
  limit = 6,
): Appointment[] => {
  const clinicAppointments = mockAppointments.filter(
    (apt) => apt.clinicId === clinicId,
  );
  const source = filterPaidOrWithMethod(clinicAppointments);
  return sortAppointmentsByDateTimeDesc(source).slice(0, limit);
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

export const deleteAppointment = async (
  appointmentId: string,
): Promise<boolean> => {
  const index = mockAppointments.findIndex((apt) => apt.id === appointmentId);
  if (index === -1) {
    return false;
  }

  try {
    await deleteDoc(doc(db, "appointments", appointmentId));
    mockAppointments.splice(index, 1);
    return true;
  } catch (error) {
    console.warn("Failed to delete appointment in Firestore", error);
    return false;
  }
};

export const cancelAppointment = (
  appointmentId: string,
  reason = "Cancelled by patient",
): boolean => {
  const appointment = mockAppointments.find((apt) => apt.id === appointmentId);
  if (!appointment) {
    return false;
  }

  appointment.status = "cancelled";
  appointment.cancellationReason = reason;

  void updateDoc(doc(db, "appointments", appointmentId), {
    status: "cancelled",
    cancellationReason: reason,
  }).catch((error) => {
    console.warn("Failed to cancel appointment in Firestore", error);
  });

  return true;
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

export const deleteDentalRecord = async (
  recordId: string,
): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, "patientRecords", recordId));
    const recordIndex = mockDentalRecords.findIndex(
      (record) => record.id === recordId,
    );
    if (recordIndex !== -1) {
      mockDentalRecords.splice(recordIndex, 1);
    }
    await deleteLocalRecord(recordId);
    return true;
  } catch (error) {
    console.warn("Failed to delete dental record in Firestore", error);
    return false;
  }
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
    syncAdminRelationships();
    return true;
  }
  return false;
};

// Analytics Services -------------------------------------------------------

export interface AdminLinkedEntities {
  clinics: Clinic[];
  clinicUsers: User[];
  patients: User[];
}

interface StatusSummary {
  status: Appointment["status"];
  count: number;
  percentage: number;
}

interface PaymentSummary {
  method: PaymentMethod;
  count: number;
  percentage: number;
}

interface RevenueByClinicSummary {
  clinicId: string;
  clinicName: string;
  revenue: number;
  percentage: number;
}

interface MonthlyRevenuePoint {
  label: string;
  value: number;
}

export interface AdminAnalyticsReport {
  totals: {
    clinics: number;
    patients: number;
    appointments: number;
    revenue: number;
    activeClinics: number;
  };
  appointmentStatusSummary: StatusSummary[];
  paymentMethodSummary: PaymentSummary[];
  revenueByClinic: RevenueByClinicSummary[];
  monthlyRevenueTrend: MonthlyRevenuePoint[];
  revenueGrowthRate: number;
  predictedRevenueNextMonth: number;
  avgAppointmentValue: number;
  conversionRate: number;
  cancellationRate: number;
}

const buildMonthlyRevenueTrend = (
  totalRevenue: number,
): MonthlyRevenuePoint[] => {
  const buckets: Record<string, number> = {};

  mockAppointments.forEach((appointment) => {
    if (!appointment.date || appointment.date.length < 7) {
      return;
    }

    const monthKey = appointment.date.slice(0, 7);
    buckets[monthKey] =
      (buckets[monthKey] ?? 0) + estimateAppointmentValue(appointment);
  });

  const sortedKeys = Object.keys(buckets).sort();
  const trimmed = sortedKeys.slice(-6);
  let points = trimmed.map((key) => ({
    label: formatMonthLabel(key),
    value: Math.round(buckets[key]),
  }));

  if (points.length === 0) {
    const baseline = totalRevenue / 6 || 15000;
    const now = new Date();
    points = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const label = `${monthNames[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
      return {
        label,
        value: Math.round(baseline * (0.7 + idx * 0.05)),
      };
    });
  }

  return points;
};

export const getAdminLinkedEntities = (): AdminLinkedEntities => {
  syncAdminRelationships();

  return {
    clinics: mockClinics,
    clinicUsers: mockUsers.filter((user) => user.role === "clinic"),
    patients: mockUsers.filter((user) => user.role === "patient"),
  };
};

export const getAdminAnalyticsReport = (): AdminAnalyticsReport => {
  const { clinics, patients } = getAdminLinkedEntities();
  const appointments = [...mockAppointments];

  const revenueByClinic: RevenueByClinicSummary[] = clinics.map((clinic) => ({
    clinicId: clinic.id,
    clinicName: clinic.name,
    revenue: clinic.revenue,
    percentage: 0,
  }));

  const clinicRevenueTotal = revenueByClinic.reduce(
    (sum, item) => sum + item.revenue,
    0,
  );

  const appointmentRevenueTotal = appointments.reduce(
    (sum, appointment) => sum + estimateAppointmentValue(appointment),
    0,
  );

  const totalRevenue = Math.max(clinicRevenueTotal, appointmentRevenueTotal);

  revenueByClinic.forEach((entry) => {
    entry.percentage = totalRevenue
      ? Number(((entry.revenue / totalRevenue) * 100).toFixed(1))
      : 0;
  });

  const appointmentStatusSummary: StatusSummary[] = appointmentStatuses.map(
    (status) => {
      const count = appointments.filter((a) => a.status === status).length;
      const percentage = appointments.length
        ? Number(((count / appointments.length) * 100).toFixed(1))
        : 0;
      return { status, count, percentage };
    },
  );

  const paymentMethodSummary: PaymentSummary[] = paymentMethods.map(
    (method) => {
      const count = appointments.filter(
        (apt) => apt.paymentMethod === method,
      ).length;
      return { method, count, percentage: 0 };
    },
  );

  const totalPaymentCount = paymentMethodSummary.reduce(
    (sum, entry) => sum + entry.count,
    0,
  );

  paymentMethodSummary.forEach((entry) => {
    entry.percentage = totalPaymentCount
      ? Number(((entry.count / totalPaymentCount) * 100).toFixed(1))
      : 0;
  });

  const monthlyRevenueTrend = buildMonthlyRevenueTrend(totalRevenue);
  const lastValue =
    monthlyRevenueTrend.length > 0
      ? monthlyRevenueTrend[monthlyRevenueTrend.length - 1].value
      : totalRevenue / 6;
  const prevValue =
    monthlyRevenueTrend.length > 1
      ? monthlyRevenueTrend[monthlyRevenueTrend.length - 2].value
      : lastValue;

  const rawGrowthRate =
    prevValue > 0 ? (lastValue - prevValue) / prevValue : 0.12;
  const revenueGrowthRate = Number(rawGrowthRate.toFixed(3));
  const predictedRevenueNextMonth = Math.round(
    lastValue * (1 + Math.max(0.05, rawGrowthRate)),
  );

  const avgAppointmentValue = appointments.length
    ? Math.round(appointmentRevenueTotal / appointments.length)
    : 0;

  const confirmedCount = appointments.filter(
    (a) => a.status === "confirmed",
  ).length;
  const completedCount = appointments.filter(
    (a) => a.status === "completed",
  ).length;
  const cancelledCount = appointments.filter(
    (a) => a.status === "cancelled",
  ).length;

  const conversionRate = appointments.length
    ? Number(
        (
          ((confirmedCount + completedCount) / appointments.length) *
          100
        ).toFixed(1),
      )
    : 0;

  const cancellationRate = appointments.length
    ? Number(((cancelledCount / appointments.length) * 100).toFixed(1))
    : 0;

  return {
    totals: {
      clinics: clinics.length,
      patients: patients.length,
      appointments: appointments.length,
      revenue: totalRevenue,
      activeClinics: clinics.filter((clinic) => clinic.isActive).length,
    },
    appointmentStatusSummary,
    paymentMethodSummary,
    revenueByClinic,
    monthlyRevenueTrend,
    revenueGrowthRate,
    predictedRevenueNextMonth,
    avgAppointmentValue,
    conversionRate,
    cancellationRate,
  };
};

export const getSystemStats = () => {
  const analytics = getAdminAnalyticsReport();
  return {
    totalClinics: analytics.totals.clinics,
    totalPatients: analytics.totals.patients,
    totalAppointments: analytics.totals.appointments,
    totalRevenue: analytics.totals.revenue,
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
