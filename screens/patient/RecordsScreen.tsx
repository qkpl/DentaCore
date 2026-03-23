import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { DentalRecord } from "../../data/mockData";
import { getRecordsByPatient } from "../../services/dataService";

interface RecordsScreenProps {
  navigation: any;
}

export default function RecordsScreen({ navigation }: RecordsScreenProps) {
  const { user } = useAuth();
  const [records, setRecords] = React.useState<DentalRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const loadRecords = async () => {
      if (!user) {
        if (isMounted) {
          setRecords([]);
          setIsLoadingRecords(false);
        }
        return;
      }

      setIsLoadingRecords(true);
      try {
        const fetchedRecords = await getRecordsByPatient(user.id);
        if (isMounted) {
          setRecords(fetchedRecords);
        }
      } catch (error) {
        if (isMounted) {
          setRecords([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingRecords(false);
        }
      }
    };

    void loadRecords();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleViewRecord = (record: DentalRecord) => {
    Alert.alert(
      "Dental Record",
      `Clinic: ${record.clinicName}\nDoctor: ${record.dentistName}\nDate: ${record.date}\nType: ${record.type}\n\nDescription:\n${record.description}\n\nTreatment:\n${record.treatment}\n\nNotes:\n${record.notes}`,
      [{ text: "OK" }],
    );
  };

  const handleDownload = (record: DentalRecord) => {
    Alert.alert("Download", `Download record from ${record.clinicName}?`);
  };

  // Calculate health summary
  const lastVisit = records.length > 0 ? records[0].date : "N/A";
  const totalVisits = records.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home-outline" size={24} color="#00BFA6" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Dental Records</Text>
          <Text style={styles.headerSubtitle}>
            Your complete dental history
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Health Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Health Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalVisits}</Text>
              <Text style={styles.summaryLabel}>Total Visits</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{lastVisit}</Text>
              <Text style={styles.summaryLabel}>Last Visit</Text>
            </View>
          </View>
        </View>

        {/* Treatment History Title */}
        <Text style={styles.sectionTitle}>Treatment History</Text>

        {/* Records List */}
        {isLoadingRecords ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#00BFA6" />
            <Text style={styles.loadingText}>Loading dental records...</Text>
          </View>
        ) : records.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No records found</Text>
            <Text style={styles.emptySubtext}>
              Your dental records will appear here
            </Text>
          </View>
        ) : (
          records.map((record) => (
            <View key={record.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View style={styles.recordType}>
                  <Ionicons name="medical" size={20} color="#00BFA6" />
                  <Text style={styles.recordTypeText}>{record.type}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDownload(record)}
                  style={styles.downloadButton}
                >
                  <Ionicons name="download-outline" size={20} color="#00BFA6" />
                </TouchableOpacity>
              </View>

              <Text style={styles.clinicName}>{record.clinicName}</Text>
              <Text style={styles.doctorName}>Dr. {record.dentistName}</Text>

              <View style={styles.recordDate}>
                <Ionicons name="calendar" size={14} color="#666" />
                <Text style={styles.dateText}>{record.date}</Text>
              </View>

              <Text style={styles.treatment} numberOfLines={2}>
                {record.description}
              </Text>

              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => handleViewRecord(record)}
              >
                <Text style={styles.viewButtonText}>View Full Record</Text>
                <Ionicons name="chevron-forward" size={16} color="#00BFA6" />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Upload Document Button */}
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() =>
            Alert.alert("Upload", "Upload medical document feature coming soon")
          }
        >
          <Ionicons name="cloud-upload" size={20} color="#00BFA6" />
          <Text style={styles.uploadButtonText}>Upload Medical Document</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  homeButton: {
    padding: 5,
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  placeholder: {
    width: 34,
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
    padding: 20,
  },
  summaryCard: {
    backgroundColor: "#2196F3",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    marginBottom: 15,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#E3F2FD",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#64B5F6",
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  recordCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recordType: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F7F4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recordTypeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#00BFA6",
    marginLeft: 5,
  },
  downloadButton: {
    padding: 4,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  recordDate: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  dateText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 5,
  },
  treatment: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00BFA6",
    marginRight: 5,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#00BFA6",
    borderStyle: "dashed",
    marginTop: 10,
    marginBottom: 20,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00BFA6",
    marginLeft: 8,
  },
  loadingState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
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
  emptySubtext: {
    fontSize: 14,
    color: "#BBB",
    marginTop: 5,
  },
});
