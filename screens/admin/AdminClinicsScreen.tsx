import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Clinic } from "../../data/mockData";
import {
    deleteClinic,
    getAllClinics,
    updateClinic,
} from "../../services/dataService";

interface AdminClinicsScreenProps {
  navigation: any;
}

export default function AdminClinicsScreen({
  navigation,
}: AdminClinicsScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);

  // Form fields
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");

  const clinics = getAllClinics();

  // Sync form fields with selected clinic
  useEffect(() => {
    if (selectedClinic) {
      setClinicName(selectedClinic.name);
      setClinicAddress(selectedClinic.address);
      setClinicPhone(selectedClinic.phone);
      setClinicEmail(selectedClinic.email);
    }
  }, [selectedClinic]);

  const filteredClinics = clinics.filter(
    (clinic) =>
      clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.address.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleViewClinic = (clinic: Clinic) => {
    Alert.alert(
      clinic.name,
      `Address: ${clinic.address}\nPhone: ${clinic.phone}\nEmail: ${clinic.email}\nRating: ${clinic.rating}\nPatients: ${clinic.totalPatients}\nRevenue: $${clinic.revenue.toLocaleString()}`,
      [{ text: "OK" }],
    );
  };

  const handleEditClinic = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setEditModalVisible(true);
  };

  const handleSaveClinic = () => {
    if (!selectedClinic) return;

    if (
      !clinicName.trim() ||
      !clinicAddress.trim() ||
      !clinicPhone.trim() ||
      !clinicEmail.trim()
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const success = updateClinic(selectedClinic.id, {
      name: clinicName,
      address: clinicAddress,
      phone: clinicPhone,
      email: clinicEmail,
    });

    if (success) {
      Alert.alert("Success", "Clinic updated successfully");
      setEditModalVisible(false);
      setSelectedClinic(null);
      setRefreshTrigger((prev) => prev + 1);
    } else {
      Alert.alert("Error", "Failed to update clinic");
    }
  };

  const handleDeleteClinic = (clinic: Clinic) => {
    Alert.alert(
      "Delete Clinic",
      `Are you sure you want to delete ${clinic.name}? This will also delete all associated appointments.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const success = deleteClinic(clinic.id);
            if (success) {
              Alert.alert("Success", "Clinic deleted successfully");
              setRefreshTrigger((prev) => prev + 1);
            } else {
              Alert.alert("Error", "Failed to delete clinic");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => navigation.navigate("AdminDashboard")}
        >
          <Ionicons name="grid-outline" size={24} color="#7C4DFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Clinic Management</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clinic Management</Text>
        <Text style={styles.headerSubtitle}>Manage all registered clinics</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clinics..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{clinics.length}</Text>
          <Text style={styles.statLabel}>Total Clinics</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {clinics.filter((c) => c.rating >= 4.5).length}
          </Text>
          <Text style={styles.statLabel}>Top Rated</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {clinics.reduce((sum, c) => sum + c.totalPatients, 0)}
          </Text>
          <Text style={styles.statLabel}>Total Patients</Text>
        </View>
      </View>

      {/* Clinics List */}
      <ScrollView style={styles.content}>
        {filteredClinics.map((clinic) => (
          <TouchableOpacity
            key={clinic.id}
            style={styles.clinicCard}
            onPress={() => handleViewClinic(clinic)}
          >
            <View style={styles.clinicIcon}>
              <Ionicons name="business" size={28} color="#7C4DFF" />
            </View>
            <View style={styles.clinicInfo}>
              <Text style={styles.clinicName}>{clinic.name}</Text>
              <View style={styles.clinicMeta}>
                <Ionicons name="location" size={12} color="#666" />
                <Text style={styles.metaText}>{clinic.address}</Text>
              </View>
              <View style={styles.clinicStats}>
                <View style={styles.statPill}>
                  <Ionicons name="star" size={12} color="#FFB300" />
                  <Text style={styles.statPillText}>{clinic.rating}</Text>
                </View>
                <View style={styles.statPill}>
                  <Ionicons name="people" size={12} color="#666" />
                  <Text style={styles.statPillText}>
                    {clinic.totalPatients}
                  </Text>
                </View>
                <View style={styles.statPill}>
                  <Ionicons name="cash" size={12} color="#4CAF50" />
                  <Text style={styles.statPillText}>
                    ${(clinic.revenue / 1000).toFixed(1)}K
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEditClinic(clinic);
                }}
              >
                <Ionicons name="create-outline" size={20} color="#7C4DFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteClinic(clinic);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#F44336" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {filteredClinics.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No clinics found</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          Alert.alert("Add Clinic", "Add new clinic feature coming soon")
        }
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Edit Clinic Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Clinic</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Clinic Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter clinic name"
                value={clinicName}
                onChangeText={setClinicName}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Address *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter clinic address"
                value={clinicAddress}
                onChangeText={setClinicAddress}
                multiline
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Phone Number *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter phone number"
                value={clinicPhone}
                onChangeText={setClinicPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Email *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter email address"
                value={clinicEmail}
                onChangeText={setClinicEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveClinic}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    margin: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#7C4DFF",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  clinicCard: {
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
  clinicIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EDE7F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  clinicInfo: {
    flex: 1,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
  },
  clinicMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 5,
    flex: 1,
  },
  clinicStats: {
    flexDirection: "row",
    gap: 8,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statPillText: {
    fontSize: 11,
    color: "#666",
    marginLeft: 4,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
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
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#7C4DFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    fontSize: 16,
    color: "#333",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#7C4DFF",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
});
