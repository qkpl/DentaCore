import { Ionicons } from "@expo/vector-icons";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { StaffMember } from "../../data/mockData";
import { getStaffByClinic } from "../../services/dataService";
import { db } from "../../services/firebase";

interface ClinicStaffScreenProps {
  navigation: any;
}

export default function ClinicStaffScreen({
  navigation,
}: ClinicStaffScreenProps) {
  const { clinic } = useAuth();
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = React.useState(true);
  const [staffMembers, setStaffMembers] = React.useState<StaffMember[]>([]);
  const [staffType, setStaffType] = React.useState<"dentist" | "staff">(
    "dentist",
  );
  const [staffName, setStaffName] = React.useState("");
  const [staffEmail, setStaffEmail] = React.useState("");
  const [staffPhone, setStaffPhone] = React.useState("");
  const [staffRole, setStaffRole] = React.useState("");

  const loadStaffMembers = React.useCallback(async () => {
    if (!clinic) {
      setStaffMembers([]);
      setIsLoadingStaff(false);
      return;
    }

    setIsLoadingStaff(true);
    try {
      const staffQuery = query(
        collection(db, "staffMembers"),
        where("clinicId", "==", clinic.id),
      );

      const snapshot = await getDocs(staffQuery);
      const fetchedStaff: StaffMember[] = snapshot.docs.map((staffDoc) => {
        const staffData = staffDoc.data() as Omit<StaffMember, "id">;
        return {
          id: staffDoc.id,
          ...staffData,
        };
      });

      setStaffMembers(fetchedStaff);
    } catch (error) {
      // If Firestore is unavailable, keep app usable via local mock data.
      setStaffMembers(getStaffByClinic(clinic.id));
    } finally {
      setIsLoadingStaff(false);
    }
  }, [clinic]);

  React.useEffect(() => {
    void loadStaffMembers();
  }, [loadStaffMembers]);

  if (!clinic) {
    return null;
  }

  // Group staff by role
  const dentists = staffMembers.filter(
    (s) =>
      s.role.toLowerCase().includes("dentist") ||
      s.role.toLowerCase().includes("orthodontist"),
  );
  const hygienists = staffMembers.filter((s) =>
    s.role.toLowerCase().includes("hygienist"),
  );
  const support = staffMembers.filter(
    (s) => !dentists.includes(s) && !hygienists.includes(s),
  );

  const renderStaffMember = (staff: (typeof staffMembers)[0]) => (
    <View key={staff.id} style={styles.staffCard}>
      <View style={styles.staffAvatar}>
        <Text style={styles.avatarText}>
          {staff.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </Text>
      </View>
      <View style={styles.staffInfo}>
        <Text style={styles.staffName}>{staff.name}</Text>
        <Text style={styles.staffRole}>{staff.role}</Text>
        <View style={styles.contactRow}>
          <Ionicons name="mail" size={12} color="#666" />
          <Text style={styles.contactText}>{staff.email}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="call" size={12} color="#666" />
          <Text style={styles.contactText}>{staff.phone}</Text>
        </View>
      </View>
      <View style={styles.staffActions}>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: staff.status === "active" ? "#4CAF50" : "#999" },
          ]}
        >
          <Text style={styles.statusText}>
            {staff.status === "active" ? "Active" : "Inactive"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => Alert.alert("Edit", `Edit ${staff.name}'s profile`)}
        >
          <Ionicons name="create-outline" size={20} color="#00BFA6" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const resetAddForm = () => {
    setStaffType("dentist");
    setStaffName("");
    setStaffEmail("");
    setStaffPhone("");
    setStaffRole("");
  };

  const handleAddStaff = async () => {
    const name = staffName.trim();
    const email = staffEmail.trim().toLowerCase();
    const phone = staffPhone.trim();
    const role =
      staffType === "dentist" ? "Dentist" : staffRole.trim() || "Staff";

    if (!name || !email || !phone) {
      Alert.alert("Error", "Please fill in name, email, and phone.");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    if (staffType === "staff" && !staffRole.trim()) {
      Alert.alert("Error", "Please enter staff role/position.");
      return;
    }

    try {
      await addDoc(collection(db, "staffMembers"), {
        name,
        role,
        email,
        phone,
        clinicId: clinic.id,
        status: "active",
      });

      setShowAddModal(false);
      resetAddForm();
      await loadStaffMembers();
      Alert.alert("Success", `${role} added to your clinic staff.`);
    } catch (error) {
      Alert.alert("Error", "Failed to add staff member. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Ionicons name="grid-outline" size={24} color="#00BFA6" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Staff Management</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Staff Management</Text>
        <Text style={styles.headerSubtitle}>Manage your clinic team</Text>
      </View>

      <ScrollView style={styles.content}>
        {isLoadingStaff ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#00BFA6" />
            <Text style={styles.loadingText}>Loading clinic staff...</Text>
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <View
                style={[styles.summaryCard, { backgroundColor: "#2196F3" }]}
              >
                <Ionicons name="people" size={32} color="#FFF" />
                <Text style={styles.summaryValue}>
                  {staffMembers.filter((s) => s.status === "active").length}
                </Text>
                <Text style={styles.summaryLabel}>Active Staff</Text>
              </View>
              <View
                style={[styles.summaryCard, { backgroundColor: "#4CAF50" }]}
              >
                <Ionicons name="medical" size={32} color="#FFF" />
                <Text style={styles.summaryValue}>{dentists.length}</Text>
                <Text style={styles.summaryLabel}>Dentists</Text>
              </View>
            </View>

            {/* Dentists Section */}
            {dentists.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="medical" size={18} color="#333" /> Dentists
                </Text>
                {dentists.map(renderStaffMember)}
              </View>
            )}

            {/* Hygienists Section */}
            {hygienists.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="fitness" size={18} color="#333" /> Dental
                  Hygienists
                </Text>
                {hygienists.map(renderStaffMember)}
              </View>
            )}

            {/* Support Staff Section */}
            {support.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="people" size={18} color="#333" /> Support
                  Staff
                </Text>
                {support.map(renderStaffMember)}
              </View>
            )}

            {staffMembers.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={60} color="#CCC" />
                <Text style={styles.emptyText}>No staff members</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Staff Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="person-add" size={28} color="#FFF" />
      </TouchableOpacity>

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Team Member</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.typeSwitchRow}>
              <TouchableOpacity
                style={[
                  styles.typeChip,
                  staffType === "dentist" && styles.typeChipActive,
                ]}
                onPress={() => setStaffType("dentist")}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    staffType === "dentist" && styles.typeChipTextActive,
                  ]}
                >
                  Dentist
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeChip,
                  staffType === "staff" && styles.typeChipActive,
                ]}
                onPress={() => setStaffType("staff")}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    staffType === "staff" && styles.typeChipTextActive,
                  ]}
                >
                  Staff
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Full name"
              value={staffName}
              onChangeText={setStaffName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={staffEmail}
              onChangeText={setStaffEmail}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Phone"
              keyboardType="phone-pad"
              value={staffPhone}
              onChangeText={setStaffPhone}
            />

            {staffType === "staff" && (
              <TextInput
                style={styles.modalInput}
                placeholder="Role / Position (e.g., Receptionist)"
                value={staffRole}
                onChangeText={setStaffRole}
              />
            )}

            <TouchableOpacity style={styles.addButton} onPress={handleAddStaff}>
              <Text style={styles.addButtonText}>Add Member</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dashboardButton: {
    padding: 5,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  placeholder: {
    width: 34,
  },
  header: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  content: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 15,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#FFF",
    textAlign: "center",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  staffAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00BFA6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  staffRole: {
    fontSize: 14,
    color: "#00BFA6",
    fontWeight: "600",
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  contactText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 5,
  },
  staffActions: {
    alignItems: "flex-end",
  },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFF",
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0F7F4",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#999",
    marginTop: 15,
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00BFA6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  typeSwitchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#F7F7F7",
  },
  typeChipActive: {
    borderColor: "#00BFA6",
    backgroundColor: "#E0F7F4",
  },
  typeChipText: {
    color: "#666",
    fontWeight: "600",
  },
  typeChipTextActive: {
    color: "#00BFA6",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#FFF",
  },
  addButton: {
    marginTop: 8,
    backgroundColor: "#00BFA6",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
