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
  AuditLog,
  AuditScope,
  Clinic,
  ClinicReview,
  DentalRecord,
  mockAppointments,
  mockAuditLogs,
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
const auditLogsCollection = collection(db, "auditLogs");
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
  "dental x-ray": 1500,
  "oral prophylaxis": 2200,
  "tooth filling": 3200,
  "wisdom tooth extraction": 5500,
  "dental crown": 8500,
  dentures: 14000,
  veneer: 9000,
  "tooth bonding": 4500,
  "tmj treatment": 6800,
};

const STANDARD_CLINIC_SERVICE_CATALOG: Record<string, number> = {
  "Dental Checkup": 1800,
  "Teeth Cleaning": 2500,
  "Dental Filling": 3200,
  Extraction: 3500,
  "Root Canal": 7200,
  Orthodontics: 9500,
  "Teeth Whitening": 4200,
  "Dental X-Ray": 1500,
  "Oral Prophylaxis": 2200,
  "Wisdom Tooth Extraction": 5500,
  "Dental Crown": 8500,
  Dentures: 14000,
  Veneer: 9000,
};

const buildMergedClinicServicePrices = (
  existing?: Record<string, number>,
): Record<string, number> => {
  const merged: Record<string, number> = {
    ...STANDARD_CLINIC_SERVICE_CATALOG,
  };

  if (!existing || typeof existing !== "object") {
    return merged;
  }

  Object.entries(existing).forEach(([service, price]) => {
    if (typeof service === "string" && typeof price === "number" && Number.isFinite(price) && price > 0) {
      merged[service] = Math.round(price);
    }
  });

  return merged;
};

const enrichClinicServices = (clinic: Clinic): Clinic => {
  const mergedPrices = buildMergedClinicServicePrices(clinic.servicePrices);
  const mergedServices = Array.from(
    new Set([...(clinic.servicesOffered || []), ...Object.keys(mergedPrices)]),
  );

  return {
    ...clinic,
    servicesOffered: mergedServices,
    servicePrices: mergedPrices,
  };
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
  const base =
    typeof appointment.amount === "number" && Number.isFinite(appointment.amount)
      ? appointment.amount
      : getServicePrice(appointment.type);

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
  const amount =
    typeof data.amount === "number" && Number.isFinite(data.amount)
      ? data.amount
      : undefined;
  const currency = safeString(data.currency) || undefined;

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
    amount,
    currency,
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
  const rawServicePrices = (data as any)?.servicePrices;
  const servicePrices =
    rawServicePrices && typeof rawServicePrices === "object"
      ? Object.entries(rawServicePrices).reduce<Record<string, number>>(
          (acc, [key, value]) => {
            if (
              typeof key === "string" &&
              typeof value === "number" &&
              Number.isFinite(value) &&
              value > 0
            ) {
              acc[key] = value;
            }
            return acc;
          },
          {},
        )
      : undefined;

  const clinic: Clinic = {
    id: data.id || snapshot.id,
    name: safeString(data.name) || "Unnamed Clinic",
    address: safeString(data.address) || "No address provided",
    phone: safeString(data.phone),
    email: safeString(data.email),
    description: safeString(data.description) || "Clinic",
    servicesOffered: Array.isArray(data.servicesOffered)
      ? (data.servicesOffered as string[])
      : [],
    servicePrices,
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

  return enrichClinicServices(clinic);
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

type AuditEventType = AuditLog["eventType"];

type AuditEventInput = {
  scope: AuditScope;
  eventType: AuditEventType;
  actorRole?: AuditLog["actorRole"];
  actorId?: string;
  actorName?: string;
  clinicId?: string;
  patientId?: string;
  appointmentId?: string;
  transactionId?: string;
  paymentMethod?: Appointment["paymentMethod"];
  amount?: number;
  status?: AuditLog["status"];
  details: string;
};

const createAuditEvent = (input: AuditEventInput): AuditLog => ({
  id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  createdAt: new Date().toISOString(),
  actorRole: input.actorRole ?? "system",
  actorId: input.actorId,
  actorName: input.actorName,
  scope: input.scope,
  eventType: input.eventType,
  clinicId: input.clinicId,
  patientId: input.patientId,
  appointmentId: input.appointmentId,
  transactionId: input.transactionId,
  paymentMethod: input.paymentMethod,
  amount: input.amount,
  status: input.status,
  details: input.details,
});

const omitUndefinedFields = <T extends Record<string, unknown>>(
  payload: T,
): Partial<T> => {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
};

const logAuditEvent = (input: AuditEventInput): AuditLog => {
  const event = createAuditEvent(input);
  mockAuditLogs.unshift(event);
  const firestorePayload = omitUndefinedFields(
    event as unknown as Record<string, unknown>,
  );
  void addDoc(auditLogsCollection, firestorePayload).catch((error) => {
    console.warn("Failed to persist audit event to Firestore", error);
  });
  return event;
};

export const getClinicTransactionAuditLogs = (
  clinicId: string,
  limit = 30,
): AuditLog[] => {
  return mockAuditLogs
    .filter(
      (log) =>
        log.scope === "clinic" &&
        log.clinicId === clinicId &&
        (log.eventType === "payment_received" ||
          log.eventType === "payment_failed"),
    )
    .slice(0, limit);
};

export const getAdminAuditLogs = (limit = 50): AuditLog[] => {
  return mockAuditLogs.filter((log) => log.scope === "admin").slice(0, limit);
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
    const fetchedClinics = snapshot.docs.map(mapFirestoreClinic);

    snapshot.docs.forEach((clinicDoc) => {
      const clinic = fetchedClinics.find((item) => item.id === clinicDoc.id);
      if (!clinic) {
        return;
      }

      const source = clinicDoc.data() as Partial<Clinic>;
      const sourceServices = Array.isArray(source.servicesOffered)
        ? source.servicesOffered
        : [];
      const sourcePrices =
        source.servicePrices && typeof source.servicePrices === "object"
          ? Object.keys(source.servicePrices)
          : [];

      const needsBackfill =
        sourceServices.length < clinic.servicesOffered.length ||
        sourcePrices.length < Object.keys(clinic.servicePrices || {}).length;

      if (!needsBackfill) {
        return;
      }

      void updateDoc(doc(db, "clinics", clinic.id), {
        servicesOffered: clinic.servicesOffered,
        servicePrices: clinic.servicePrices,
      }).catch((error) => {
        console.warn("Failed to backfill clinic services", error);
      });
    });

    // Keep clinic cache aligned to registered Firestore clinics only.
    replaceClinicsCache(fetchedClinics);
    syncAdminRelationships();
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
    logAuditEvent({
      scope: "admin",
      eventType: "clinic_updated",
      actorRole: "admin",
      clinicId,
      details: `Clinic profile updated (${clinicId}).`,
    });
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
    logAuditEvent({
      scope: "admin",
      eventType: "clinic_deleted",
      actorRole: "admin",
      clinicId,
      details: `Clinic removed (${clinicId}) with linked appointments cleanup.`,
    });
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

const parseTimeLabelToMinutes = (timeLabel?: string): number => {
  if (!timeLabel) {
    return 0;
  }

  const match = timeLabel.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) {
    return 0;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const period = (match[3] ?? "AM").toUpperCase();

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return 0;
  }

  if (period === "AM") {
    if (hour === 12) {
      hour = 0;
    }
  } else if (hour !== 12) {
    hour += 12;
  }

  return hour * 60 + minute;
};

const toAppointmentTimestamp = (appointment: Appointment): number => {
  const date = new Date(`${appointment.date}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  const minutes = parseTimeLabelToMinutes(appointment.time);
  return date.getTime() + minutes * 60 * 1000;
};

const isUpcomingActiveAppointment = (appointment: Appointment): boolean => {
  const isActive = appointment.status === "pending" || appointment.status === "confirmed";
  if (!isActive) {
    return false;
  }

  return toAppointmentTimestamp(appointment) >= Date.now();
};

export const getUpcomingAppointmentsForPatient = (
  patientId: string,
  limit = 5,
): Appointment[] => {
  return mockAppointments
    .filter((apt) => apt.patientId === patientId)
    .filter(isUpcomingActiveAppointment)
    .sort((a, b) => toAppointmentTimestamp(a) - toAppointmentTimestamp(b))
    .slice(0, limit);
};

export const getUpcomingAppointmentsForClinic = (
  clinicId: string,
  limit = 5,
): Appointment[] => {
  return mockAppointments
    .filter((apt) => apt.clinicId === clinicId)
    .filter(isUpcomingActiveAppointment)
    .sort((a, b) => toAppointmentTimestamp(a) - toAppointmentTimestamp(b))
    .slice(0, limit);
};

export const getBlockingAppointmentForPatient = (
  patientId: string,
  date?: string,
  time?: string,
): Appointment | undefined => {
  return mockAppointments.find((apt) => {
    const isActive = apt.status === "pending" || apt.status === "confirmed";
    if (!isActive || apt.patientId !== patientId) {
      return false;
    }

    if (!date || !time) {
      return true;
    }

    return apt.date === date && apt.time === time;
  });
};

const normalizeProviderName = (value?: string): string => {
  return (value || "")
    .replace(/^Dr\.?\s*/i, "")
    .trim()
    .toLowerCase();
};

const hasAssignedProviderName = (value?: string): boolean => {
  const normalized = normalizeProviderName(value);
  return (
    normalized.length > 0 &&
    normalized !== "assigned dentist" &&
    normalized !== "dentist not assigned"
  );
};

export const getBlockingAppointmentForDentist = (
  dentistName?: string,
  date?: string,
  time?: string,
  excludeAppointmentId?: string,
): Appointment | undefined => {
  if (!hasAssignedProviderName(dentistName) || !date || !time) {
    return undefined;
  }

  const targetName = normalizeProviderName(dentistName);

  return mockAppointments.find((apt) => {
    const isActive = apt.status === "pending" || apt.status === "confirmed";
    if (!isActive) {
      return false;
    }

    if (excludeAppointmentId && apt.id === excludeAppointmentId) {
      return false;
    }

    if (apt.date !== date || apt.time !== time) {
      return false;
    }

    if (!hasAssignedProviderName(apt.dentistName)) {
      return false;
    }

    return normalizeProviderName(apt.dentistName) === targetName;
  });
};

export const createAppointment = (
  appointment: Omit<Appointment, "id">,
): Appointment => {
  const existing = getBlockingAppointmentForPatient(
    appointment.patientId,
    appointment.date,
    appointment.time,
  );
  if (existing) {
    throw new Error(
      `You already have an appointment on ${existing.date} at ${existing.time}. Please choose a different date or time.`,
    );
  }

  const newAppointment: Appointment = {
    ...appointment,
    id: `apt${Date.now()}`,
  };
  mockAppointments.push(newAppointment);
  void persistAppointmentToFirestore(newAppointment).catch((error) => {
    console.warn("Failed to persist appointment to Firestore", error);
  });

  logAuditEvent({
    scope: "admin",
    eventType: "appointment_created",
    actorRole: "patient",
    actorId: newAppointment.patientId,
    actorName: newAppointment.patientName,
    clinicId: newAppointment.clinicId,
    patientId: newAppointment.patientId,
    appointmentId: newAppointment.id,
    status: newAppointment.status,
    details: `Appointment created at ${newAppointment.clinicName} (${newAppointment.date} ${newAppointment.time}).`,
  });

  if (newAppointment.paymentStatus === "paid" && newAppointment.transactionId) {
    const paymentDetails = `Payment received via ${(newAppointment.paymentMethod || "unknown").toUpperCase()} for ${newAppointment.clinicName}.`;
    logAuditEvent({
      scope: "clinic",
      eventType: "payment_received",
      actorRole: "patient",
      actorId: newAppointment.patientId,
      actorName: newAppointment.patientName,
      clinicId: newAppointment.clinicId,
      patientId: newAppointment.patientId,
      appointmentId: newAppointment.id,
      transactionId: newAppointment.transactionId,
      paymentMethod: newAppointment.paymentMethod,
      amount: newAppointment.amount,
      status: "paid",
      details: paymentDetails,
    });
    logAuditEvent({
      scope: "admin",
      eventType: "payment_received",
      actorRole: "patient",
      actorId: newAppointment.patientId,
      actorName: newAppointment.patientName,
      clinicId: newAppointment.clinicId,
      patientId: newAppointment.patientId,
      appointmentId: newAppointment.id,
      transactionId: newAppointment.transactionId,
      paymentMethod: newAppointment.paymentMethod,
      amount: newAppointment.amount,
      status: "paid",
      details: paymentDetails,
    });
  }

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

  logAuditEvent({
    scope: "clinic",
    eventType: "appointment_status_updated",
    actorRole: "clinic",
    actorId: appointment.clinicId,
    actorName: appointment.clinicName,
    clinicId: appointment.clinicId,
    patientId: appointment.patientId,
    appointmentId: appointment.id,
    status,
    details: `Clinic updated appointment status to ${status}.`,
  });
  logAuditEvent({
    scope: "admin",
    eventType: "appointment_status_updated",
    actorRole: "clinic",
    actorId: appointment.clinicId,
    actorName: appointment.clinicName,
    clinicId: appointment.clinicId,
    patientId: appointment.patientId,
    appointmentId: appointment.id,
    status,
    details: `Appointment at ${appointment.clinicName} moved to ${status}.`,
  });

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

  const blocking = getBlockingAppointmentForDentist(
    dentistName,
    appointment.date,
    appointment.time,
    appointment.id,
  );
  if (blocking) {
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
    const previous = mockAppointments[index];
    const nextDate = updates.date ?? previous.date;
    const nextTime = updates.time ?? previous.time;
    const dentistName = updates.dentistName ?? previous.dentistName;

    if (
      hasAssignedProviderName(dentistName) &&
      (nextDate !== previous.date || nextTime !== previous.time)
    ) {
      const blocking = getBlockingAppointmentForDentist(
        dentistName,
        nextDate,
        nextTime,
        previous.id,
      );
      if (blocking) {
        return false;
      }
    }

    mockAppointments[index] = { ...mockAppointments[index], ...updates };
    const next = mockAppointments[index];

    if (
      (updates.date && updates.date !== previous.date) ||
      (updates.time && updates.time !== previous.time)
    ) {
      logAuditEvent({
        scope: "clinic",
        eventType: "appointment_rescheduled",
        actorRole: "patient",
        actorId: next.patientId,
        actorName: next.patientName,
        clinicId: next.clinicId,
        patientId: next.patientId,
        appointmentId: next.id,
        status: next.status,
        details: `Patient rescheduled from ${previous.date} ${previous.time} to ${next.date} ${next.time}.`,
      });
      logAuditEvent({
        scope: "admin",
        eventType: "appointment_rescheduled",
        actorRole: "patient",
        actorId: next.patientId,
        actorName: next.patientName,
        clinicId: next.clinicId,
        patientId: next.patientId,
        appointmentId: next.id,
        status: next.status,
        details: `Appointment rescheduled at ${next.clinicName}.`,
      });
    }

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

  logAuditEvent({
    scope: "clinic",
    eventType: "appointment_cancelled",
    actorRole: "patient",
    actorId: appointment.patientId,
    actorName: appointment.patientName,
    clinicId: appointment.clinicId,
    patientId: appointment.patientId,
    appointmentId: appointment.id,
    status: "cancelled",
    details: `Appointment cancelled by patient. Reason: ${reason}`,
  });
  logAuditEvent({
    scope: "admin",
    eventType: "appointment_cancelled",
    actorRole: "patient",
    actorId: appointment.patientId,
    actorName: appointment.patientName,
    clinicId: appointment.clinicId,
    patientId: appointment.patientId,
    appointmentId: appointment.id,
    status: "cancelled",
    details: `Patient cancelled appointment at ${appointment.clinicName}.`,
  });

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
    logAuditEvent({
      scope: "admin",
      eventType: "user_updated",
      actorRole: "admin",
      actorId: userId,
      details: `User updated (${userId}).`,
    });
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
    logAuditEvent({
      scope: "admin",
      eventType: "user_deleted",
      actorRole: "admin",
      actorId: userId,
      details: `User deleted (${userId}) and linked appointments removed.`,
    });
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
  patientCount: number;
  appointmentCount: number;
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
    collectedRevenue: number;
    projectedRevenue: number;
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

const toActiveRevenueValue = (appointment: Appointment): number => {
  if (appointment.status === "cancelled") {
    return 0;
  }

  if (appointment.paymentStatus === "paid") {
    if (typeof appointment.amount === "number" && Number.isFinite(appointment.amount)) {
      return appointment.amount;
    }
    return getServicePrice(appointment.type);
  }

  return estimateAppointmentValue(appointment);
};

const buildMonthlyRevenueTrend = (
  totalRevenue: number,
): MonthlyRevenuePoint[] => {
  const buckets: Record<string, number> = {};

  mockAppointments.forEach((appointment) => {
    if (!appointment.date || appointment.date.length < 7) {
      return;
    }

    const monthKey = appointment.date.slice(0, 7);
    buckets[monthKey] = (buckets[monthKey] ?? 0) + toActiveRevenueValue(appointment);
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

  const clinicSummaryById = new Map<string, RevenueByClinicSummary>();
  clinics.forEach((clinic) => {
    clinicSummaryById.set(clinic.id, {
      clinicId: clinic.id,
      clinicName: clinic.name,
      revenue: 0,
      percentage: 0,
      patientCount: 0,
      appointmentCount: 0,
    });
  });

  const uniquePatientsByClinic = new Map<string, Set<string>>();
  appointments.forEach((appointment) => {
    const summary = clinicSummaryById.get(appointment.clinicId);
    if (!summary) {
      return;
    }

    const revenueValue = toActiveRevenueValue(appointment);
    summary.revenue += revenueValue;

    if (appointment.status !== "cancelled") {
      summary.appointmentCount += 1;
      if (!uniquePatientsByClinic.has(appointment.clinicId)) {
        uniquePatientsByClinic.set(appointment.clinicId, new Set<string>());
      }
      uniquePatientsByClinic.get(appointment.clinicId)!.add(appointment.patientId);
    }
  });

  const revenueByClinic: RevenueByClinicSummary[] = Array.from(
    clinicSummaryById.values(),
  ).map((entry) => ({
    ...entry,
    revenue: Math.round(entry.revenue),
    patientCount: uniquePatientsByClinic.get(entry.clinicId)?.size ?? 0,
  }));

  const totalRevenue = revenueByClinic.reduce(
    (sum, item) => sum + item.revenue,
    0,
  );

  const collectedRevenue = Math.round(
    appointments.reduce((sum, appointment) => {
      if (appointment.paymentStatus !== "paid") {
        return sum;
      }

      if (typeof appointment.amount === "number" && Number.isFinite(appointment.amount)) {
        return sum + appointment.amount;
      }

      return sum + getServicePrice(appointment.type);
    }, 0),
  );

  const projectedRevenue = totalRevenue;

  revenueByClinic.forEach((entry) => {
    entry.percentage = totalRevenue
      ? Number(((entry.revenue / totalRevenue) * 100).toFixed(1))
      : 0;
  });

  revenueByClinic.sort((a, b) => {
    if (b.revenue !== a.revenue) {
      return b.revenue - a.revenue;
    }
    if (b.patientCount !== a.patientCount) {
      return b.patientCount - a.patientCount;
    }
    return b.appointmentCount - a.appointmentCount;
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
    ? Math.round(totalRevenue / Math.max(1, appointments.length))
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
      revenue: projectedRevenue,
      collectedRevenue,
      projectedRevenue,
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
  const uniquePatients = new Set(
    appointments
      .filter((appointment) => appointment.status !== "cancelled")
      .map((appointment) => appointment.patientId),
  );
  const dynamicRevenue = Math.round(
    appointments.reduce((sum, appointment) => sum + toActiveRevenueValue(appointment), 0),
  );

  return {
    totalAppointments: appointments.length,
    pendingAppointments: appointments.filter((a) => a.status === "pending")
      .length,
    confirmedAppointments: appointments.filter((a) => a.status === "confirmed")
      .length,
    completedAppointments: appointments.filter((a) => a.status === "completed")
      .length,
    totalPatients: uniquePatients.size || clinic?.totalPatients || 0,
    todaysAppointments: clinic?.todaysAppointments || 0,
    revenue: dynamicRevenue || clinic?.revenue || 0,
    totalRecords: records.length,
  };
};
