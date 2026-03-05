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

// Clinic Services
export const searchClinics = (query: string): Clinic[] => {
  // Only return active clinics (those that have logged in)
  const activeClinics = mockClinics.filter((clinic) => clinic.isActive);

  if (!query || query.trim() === "") {
    return activeClinics;
  }

  const lowercaseQuery = query.toLowerCase();
  return activeClinics.filter(
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
  // Return all clinics (for admin view)
  return mockClinics;
};

export const getActiveClinics = (): Clinic[] => {
  // Return only active clinics (for patient view)
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
  // Start with only active clinics
  let filtered = mockClinics.filter((clinic) => clinic.isActive);

  // Filter by services
  if (filters.services && filters.services.length > 0) {
    filtered = filtered.filter((clinic) =>
      filters.services!.some((service) =>
        clinic.servicesOffered.some((s) =>
          s.toLowerCase().includes(service.toLowerCase()),
        ),
      ),
    );
  }

  // Filter by rating
  if (filters.minRating !== undefined) {
    filtered = filtered.filter((clinic) => clinic.rating >= filters.minRating!);
  }

  // Sort
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
    // Also delete related appointments
    const appointmentIndexes = mockAppointments
      .map((apt, idx) => (apt.clinicId === clinicId ? idx : -1))
      .filter((idx) => idx !== -1)
      .reverse();
    appointmentIndexes.forEach((idx) => mockAppointments.splice(idx, 1));
    return true;
  }
  return false;
};

// Appointment Services
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
  return newAppointment;
};

export const updateAppointmentStatus = (
  appointmentId: string,
  status: Appointment["status"],
): boolean => {
  const appointment = mockAppointments.find((apt) => apt.id === appointmentId);
  if (appointment) {
    appointment.status = status;
    return true;
  }
  return false;
};

export const updateAppointment = (
  appointmentId: string,
  updates: Partial<Omit<Appointment, "id">>,
): boolean => {
  const index = mockAppointments.findIndex((apt) => apt.id === appointmentId);
  if (index !== -1) {
    mockAppointments[index] = { ...mockAppointments[index], ...updates };
    return true;
  }
  return false;
};

export const deleteAppointment = (appointmentId: string): boolean => {
  const index = mockAppointments.findIndex((apt) => apt.id === appointmentId);
  if (index !== -1) {
    mockAppointments.splice(index, 1);
    return true;
  }
  return false;
};

// Dental Record Services
export const getRecordsByPatient = (patientId: string): DentalRecord[] => {
  return mockDentalRecords.filter((record) => record.patientId === patientId);
};

export const getRecordsByClinic = (clinicId: string): DentalRecord[] => {
  return mockDentalRecords.filter((record) => record.clinicId === clinicId);
};

export const getRecordById = (recordId: string): DentalRecord | undefined => {
  return mockDentalRecords.find((record) => record.id === recordId);
};

export const createDentalRecord = (
  record: Omit<DentalRecord, "id">,
): DentalRecord => {
  const newRecord: DentalRecord = {
    ...record,
    id: `rec${Date.now()}`,
  };
  mockDentalRecords.push(newRecord);
  return newRecord;
};

// Staff Services
export const getStaffByClinic = (clinicId: string): StaffMember[] => {
  return mockStaffMembers.filter((staff) => staff.clinicId === clinicId);
};

export const getStaffById = (staffId: string): StaffMember | undefined => {
  return mockStaffMembers.find((staff) => staff.id === staffId);
};

// User Services
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
    // Also delete related appointments
    const appointmentIndexes = mockAppointments
      .map((apt, idx) => (apt.patientId === userId ? idx : -1))
      .filter((idx) => idx !== -1)
      .reverse();
    appointmentIndexes.forEach((idx) => mockAppointments.splice(idx, 1));
    return true;
  }
  return false;
};

// Analytics Services
export const getSystemStats = () => {
  return {
    totalClinics: mockClinics.length,
    totalPatients: mockUsers.filter((u) => u.role === "patient").length,
    totalAppointments: mockAppointments.length,
    totalRevenue: mockClinics.reduce((sum, clinic) => sum + clinic.revenue, 0),
  };
};

export const getClinicStats = (clinicId: string) => {
  const clinic = getClinicById(clinicId);
  const appointments = getAppointmentsByClinic(clinicId);
  const records = getRecordsByClinic(clinicId);

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
