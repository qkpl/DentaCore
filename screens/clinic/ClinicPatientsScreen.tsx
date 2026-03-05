import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { getRecordsByClinic } from "../../services/dataService";

interface ClinicPatientsScreenProps {
  navigation: any;
}

export default function ClinicPatientsScreen({
  navigation,
}: ClinicPatientsScreenProps) {
  const { clinic } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState("");

  if (!clinic) {
    return null;
  }

  const records = getRecordsByClinic(clinic.id);

  // Group records by patient
  const patientRecords = records.reduce(
    (acc, record) => {
      if (!acc[record.patientId]) {
        acc[record.patientId] = [];
      }
      acc[record.patientId].push(record);
      return acc;
    },
    {} as Record<string, typeof records>,
  );

  const handleViewRecords = (patientId: string) => {
    const patientRecordsList = patientRecords[patientId];
    const recordsText = patientRecordsList
      .map((r) => `${r.date} - ${r.type}\n${r.description}`)
      .join("\n\n");
    Alert.alert("Patient Records", recordsText);
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
        <Text style={styles.navTitle}>Patient Records</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patient Records</Text>
        <Text style={styles.headerSubtitle}>
          View and manage patient information
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Patient List */}
      <ScrollView style={styles.content}>
        {Object.keys(patientRecords).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No patient records</Text>
          </View>
        ) : (
          Object.entries(patientRecords).map(([patientId, records]) => {
            const lastRecord = records[0];
            return (
              <TouchableOpacity
                key={patientId}
                style={styles.patientCard}
                onPress={() => handleViewRecords(patientId)}
              >
                <View style={styles.patientAvatar}>
                  <Ionicons name="person" size={24} color="#00BFA6" />
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>
                    Patient ID: {patientId}
                  </Text>
                  <View style={styles.patientMeta}>
                    <Ionicons name="document-text" size={14} color="#666" />
                    <Text style={styles.metaText}>
                      {records.length} record{records.length > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <View style={styles.patientMeta}>
                    <Ionicons name="calendar" size={14} color="#666" />
                    <Text style={styles.metaText}>
                      Last visit: {lastRecord.date}
                    </Text>
                  </View>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() =>
                      Alert.alert("Call", `Call patient ${patientId}`)
                    }
                  >
                    <Ionicons name="call" size={20} color="#00BFA6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() =>
                      Alert.alert("Message", `Message patient ${patientId}`)
                    }
                  >
                    <Ionicons name="mail" size={20} color="#00BFA6" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Add Record Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          Alert.alert(
            "Add Record",
            "Add new patient record feature coming soon",
          )
        }
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  patientCard: {
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
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E0F7F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
  },
  patientMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 5,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
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
});
