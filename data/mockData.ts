// Mock Data for DentaCore Application

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "patient" | "clinic" | "admin";
  password: string;
  clinicId?: string; // Only for clinic users
  address?: string;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  servicesOffered: string[];
  operatingHours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  rating: number;
  totalPatients: number;
  todaysAppointments: number;
  revenue: number;
  location: {
    lat: number;
    lng: number;
  };
  isActive: boolean; // Clinic becomes active after first login
  lastLoginDate?: string; // Track when clinic last logged in
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  clinicId: string;
  clinicName: string;
  dentistName: string;
  date: string;
  time: string;
  type: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
}

export interface DentalRecord {
  id: string;
  patientId: string;
  clinicId: string;
  clinicName: string;
  dentistName: string;
  date: string;
  type: string;
  description: string;
  treatment: string;
  notes: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  clinicId: string;
  status: "active" | "inactive";
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: "patient1",
    name: "Demo User",
    email: "user@email.com",
    phone: "+1 (555) 123-4567",
    role: "patient",
    password: "user123",
    address: "123 Main Street, New York, NY 10001",
  },
  {
    id: "patient2",
    name: "John Doe",
    email: "john.doe@email.com",
    phone: "+1 (555) 234-5678",
    role: "patient",
    password: "patient123",
    address: "456 Oak Avenue, New York, NY 10002",
  },
  {
    id: "clinic1",
    name: "SmileCare Dental",
    email: "admin@smilecare.com",
    phone: "+1 (555) 111-2222",
    role: "clinic",
    password: "clinic123",
    clinicId: "clinic1",
  },
  {
    id: "clinic2",
    name: "BrightSmile Clinic",
    email: "admin@brightsmile.com",
    phone: "+1 (555) 333-4444",
    role: "clinic",
    password: "clinic123",
    clinicId: "clinic2",
  },
  {
    id: "admin1",
    name: "System Admin",
    email: "admin@dentacore.com",
    phone: "+1 (555) 999-0000",
    role: "admin",
    password: "admin123",
  },
];

// Mock Clinics
export const mockClinics: Clinic[] = [
  {
    id: "clinic1",
    name: "SmileCare Dental",
    address: "132 Dental Street, New York, NY 10001",
    phone: "+1 (555) 111-2222",
    email: "contact@smilecare.com",
    description: "Premium dental care with state-of-the-art equipment",
    servicesOffered: [
      "Teeth Cleaning",
      "Root Canal",
      "Dental Checkup",
      "Teeth Whitening",
      "Orthodontics",
    ],
    operatingHours: {
      monday: "9:00 AM - 6:00 PM",
      tuesday: "9:00 AM - 6:00 PM",
      wednesday: "9:00 AM - 6:00 PM",
      thursday: "9:00 AM - 6:00 PM",
      friday: "9:00 AM - 6:00 PM",
      saturday: "10:00 AM - 4:00 PM",
      sunday: "Closed",
    },
    rating: 4.8,
    totalPatients: 342,
    todaysAppointments: 12,
    revenue: 24850,
    location: { lat: 40.7128, lng: -74.006 },
    isActive: false, // Not yet logged in
  },
  {
    id: "clinic2",
    name: "BrightSmile Clinic",
    address: "789 Care Blvd, Chicago, IL 60601",
    phone: "+1 (555) 333-4444",
    email: "info@brightsmile.com",
    description: "Family-friendly dental care for all ages",
    servicesOffered: [
      "Teeth Cleaning",
      "Filling",
      "Extraction",
      "Cosmetic Dentistry",
    ],
    operatingHours: {
      monday: "8:00 AM - 5:00 PM",
      tuesday: "8:00 AM - 5:00 PM",
      wednesday: "8:00 AM - 5:00 PM",
      thursday: "8:00 AM - 5:00 PM",
      friday: "8:00 AM - 5:00 PM",
      saturday: "9:00 AM - 2:00 PM",
      sunday: "Closed",
    },
    rating: 4.6,
    totalPatients: 523,
    todaysAppointments: 8,
    revenue: 36200,
    location: { lat: 41.8781, lng: -87.6298 },
    isActive: false, // Not yet logged in
  },
  {
    id: "clinic3",
    name: "Dental Excellence",
    address: "456 Wellness Way, Los Angeles, CA 90001",
    phone: "+1 (555) 555-6666",
    email: "contact@dentalexcellence.com",
    description: "Excellence in comprehensive dental care",
    servicesOffered: [
      "General Dentistry",
      "Cosmetic Dentistry",
      "Implants",
      "Emergency Care",
    ],
    operatingHours: {
      monday: "7:00 AM - 7:00 PM",
      tuesday: "7:00 AM - 7:00 PM",
      wednesday: "7:00 AM - 7:00 PM",
      thursday: "7:00 AM - 7:00 PM",
      friday: "7:00 AM - 7:00 PM",
      saturday: "8:00 AM - 4:00 PM",
      sunday: "Closed",
    },
    rating: 4.9,
    totalPatients: 612,
    todaysAppointments: 15,
    revenue: 45300,
    location: { lat: 34.0522, lng: -118.2437 },
    isActive: false, // Not yet logged in
  },
  {
    id: "clinic4",
    name: "Perfect Teeth Clinic",
    address: "321 Smile Drive, New York, NY 10003",
    phone: "+1 (555) 777-8888",
    email: "info@perfectteeth.com",
    description: "Your partner in maintaining perfect dental health",
    servicesOffered: [
      "Preventive Care",
      "Restorative Dentistry",
      "Pediatric Dentistry",
    ],
    operatingHours: {
      monday: "9:00 AM - 5:00 PM",
      tuesday: "9:00 AM - 5:00 PM",
      wednesday: "9:00 AM - 5:00 PM",
      thursday: "9:00 AM - 5:00 PM",
      friday: "9:00 AM - 5:00 PM",
      saturday: "Closed",
      sunday: "Closed",
    },
    rating: 4.7,
    totalPatients: 289,
    todaysAppointments: 9,
    revenue: 28100,
    location: { lat: 40.731, lng: -73.997 },
    isActive: false, // Not yet logged in
  },
];

// Mock Appointments
export const mockAppointments: Appointment[] = [
  {
    id: "apt1",
    patientId: "patient1",
    patientName: "Sarah Duterte",
    clinicId: "clinic1",
    clinicName: "SmileCare Dental",
    dentistName: "Dr. Smith",
    date: "2026-01-15",
    time: "10:00 AM",
    type: "Dental Cleaning",
    status: "confirmed",
  },
  {
    id: "apt2",
    patientId: "patient1",
    patientName: "Sarah Duterte",
    clinicId: "clinic2",
    clinicName: "BrightSmile Clinic",
    dentistName: "Dr. Johnson",
    date: "2026-01-20",
    time: "2:00 PM",
    type: "Checkup",
    status: "pending",
  },
  {
    id: "apt3",
    patientId: "patient1",
    patientName: "Sarah Duterte",
    clinicId: "clinic1",
    clinicName: "SmileCare Dental",
    dentistName: "Dr. Smith",
    date: "2025-12-15",
    time: "11:30 AM",
    type: "Filling",
    status: "completed",
  },
  {
    id: "apt4",
    patientId: "patient2",
    patientName: "John Doe",
    clinicId: "clinic1",
    clinicName: "SmileCare Dental",
    dentistName: "Dr. Brown",
    date: "2026-02-16",
    time: "10:00 AM",
    type: "Teeth Cleaning",
    status: "confirmed",
  },
  {
    id: "apt5",
    patientId: "patient2",
    patientName: "John Doe",
    clinicId: "clinic2",
    clinicName: "BrightSmile Clinic",
    dentistName: "Dr. Wilson",
    date: "2026-01-18",
    time: "11:30 AM",
    type: "Checkup",
    status: "pending",
  },
  {
    id: "apt6",
    patientId: "patient2",
    patientName: "John Doe",
    clinicId: "clinic1",
    clinicName: "SmileCare Dental",
    dentistName: "Dr. Williams",
    date: "2026-01-12",
    time: "2:00 PM",
    type: "Extraction",
    status: "completed",
  },
];

// Mock Dental Records
export const mockDentalRecords: DentalRecord[] = [
  {
    id: "rec1",
    patientId: "patient1",
    clinicId: "clinic1",
    clinicName: "SmileCare Dental",
    dentistName: "Dr. Smith",
    date: "2025-12-15",
    type: "Dental Cleaning",
    description:
      "Regular cleaning completed. No cavities found. Good oral health.",
    treatment: "Professional cleaning. Fluoride treatment.",
    notes:
      "Patient has excellent oral hygiene. Recommend maintaining current routine.",
  },
  {
    id: "rec2",
    patientId: "patient1",
    clinicId: "clinic2",
    clinicName: "BrightSmile Clinic",
    dentistName: "Dr. Johnson",
    date: "2025-11-10",
    type: "Checkup",
    description: "Routine checkup. Recommended improved flossing technique.",
    treatment: "Examination and x-rays",
    notes: "No issues found. Schedule next visit in 6 months.",
  },
  {
    id: "rec3",
    patientId: "patient1",
    clinicId: "clinic1",
    clinicName: "SmileCare Dental",
    dentistName: "Dr. Smith",
    date: "2025-10-05",
    type: "Filling",
    description:
      "Composite filling on lower left molar. Patient tolerated procedure well.",
    treatment: "Composite resin filling",
    notes:
      "Avoid hard foods for 24 hours. Use sensitivity toothpaste if needed.",
  },
  {
    id: "rec4",
    patientId: "patient1",
    clinicId: "clinic3",
    clinicName: "Dental Excellence",
    dentistName: "Dr. Martinez",
    date: "2025-09-20",
    type: "Checkup",
    description:
      "Routine examination. Recommended improved flossing technique.",
    treatment: "Examination, x-rays",
    notes: "Patient in good health. Follow up in 6 months.",
  },
];

// Mock Staff Members
export const mockStaffMembers: StaffMember[] = [
  {
    id: "staff1",
    name: "Dr. Sarah Smith",
    role: "Dentist",
    email: "sarah.smith@smilecare.com",
    phone: "(555) 123-4567",
    clinicId: "clinic1",
    status: "active",
  },
  {
    id: "staff2",
    name: "Emily Davis",
    role: "Dental Hygienist",
    email: "emily.davis@smilecare.com",
    phone: "(555) 234-5678",
    clinicId: "clinic1",
    status: "active",
  },
  {
    id: "staff3",
    name: "Jessica Martinez",
    role: "Receptionist",
    email: "jessica@smilecare.com",
    phone: "(555) 345-6789",
    clinicId: "clinic1",
    status: "active",
  },
  {
    id: "staff4",
    name: "Dr. James Johnson",
    role: "Orthodontist",
    email: "james.johnson@brightsmile.com",
    phone: "(555) 456-7890",
    clinicId: "clinic2",
    status: "active",
  },
  {
    id: "staff5",
    name: "Amanda Wilson",
    role: "Dental Assistant",
    email: "amanda@brightsmile.com",
    phone: "(555) 567-8901",
    clinicId: "clinic2",
    status: "active",
  },
  {
    id: "staff6",
    name: "Sarah Miller",
    role: "Dental Hygienist",
    email: "sarah.miller@brightsmile.com",
    phone: "(555) 678-9012",
    clinicId: "clinic2",
    status: "active",
  },
];
