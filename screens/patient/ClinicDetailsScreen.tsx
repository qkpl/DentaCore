import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { Clinic } from "../../data/mockData";

interface ClinicDetailsScreenProps {
  route: any;
  navigation: any;
}

export default function ClinicDetailsScreen({
  route,
  navigation,
}: ClinicDetailsScreenProps) {
  const { clinic }: { clinic: Clinic } = route.params;

  const handleBookAppointment = () => {
    navigation.navigate("BookAppointment", { clinic });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clinic Details</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Clinic Info Card */}
      <View style={styles.clinicCard}>
        <View style={styles.clinicIcon}>
          <Ionicons name="business" size={40} color="#00BFA6" />
        </View>
        <Text style={styles.clinicName}>{clinic.name}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={18} color="#FFB300" />
          <Text style={styles.rating}>{clinic.rating}</Text>
          <Text style={styles.ratingCount}>
            ({clinic.totalPatients} patients)
          </Text>
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>

        <View style={styles.infoRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="location" size={20} color="#1976D2" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoText}>{clinic.address}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="call" size={20} color="#388E3C" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoText}>{clinic.phone}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail" size={20} color="#F57C00" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoText}>{clinic.email}</Text>
          </View>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{clinic.description}</Text>
      </View>

      {/* Services Offered */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services Offered</Text>
        <View style={styles.servicesContainer}>
          {clinic.servicesOffered.map((service, index) => (
            <View key={index} style={styles.serviceChip}>
              <Ionicons name="checkmark-circle" size={16} color="#00BFA6" />
              <Text style={styles.serviceText}>{service}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Operating Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operating Hours</Text>
        {Object.entries(clinic.operatingHours).map(([day, hours]) => (
          <View key={day} style={styles.hourRow}>
            <Text style={styles.dayText}>
              {day.charAt(0).toUpperCase() + day.slice(1)}
            </Text>
            <Text
              style={[
                styles.hoursText,
                hours === "Closed" && styles.closedText,
              ]}
            >
              {hours}
            </Text>
          </View>
        ))}
      </View>

      {/* Book Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={handleBookAppointment}
        >
          <Ionicons name="calendar" size={20} color="#FFF" />
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#FFF",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  clinicCard: {
    backgroundColor: "#FFF",
    margin: 20,
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  clinicIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E0F7F4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  clinicName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rating: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 5,
  },
  ratingCount: {
    fontSize: 14,
    color: "#666",
    marginLeft: 5,
  },
  section: {
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 3,
  },
  infoText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  description: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
  },
  servicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  serviceChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F7F4",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  serviceText: {
    fontSize: 13,
    color: "#00BFA6",
    marginLeft: 5,
    fontWeight: "500",
  },
  hourRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dayText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  hoursText: {
    fontSize: 15,
    color: "#666",
  },
  closedText: {
    color: "#999",
    fontStyle: "italic",
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  bookButton: {
    flexDirection: "row",
    backgroundColor: "#00BFA6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bookButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
});
