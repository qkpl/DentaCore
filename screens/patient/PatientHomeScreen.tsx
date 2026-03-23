import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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
import { Clinic } from "../../data/mockData";
import { filterClinics, searchClinics } from "../../services/dataService";

interface PatientHomeScreenProps {
  navigation: any;
}

export default function PatientHomeScreen({
  navigation,
}: PatientHomeScreenProps) {
  const { user, refreshClinics } = useAuth();
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredClinics, setFilteredClinics] = useState<Clinic[]>([]);
  const [allClinics, setAllClinics] = useState<Clinic[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshingClinics, setRefreshingClinics] = useState(false);

  // Filter states
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"name" | "rating" | "patients">("name");

  const availableServices = [
    "General Dentistry",
    "Orthodontics",
    "Teeth Whitening",
    "Root Canal",
    "Dental Implants",
    "Pediatric Dentistry",
  ];

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedServices, minRating, sortBy]);

  const applyFilters = () => {
    let results = searchClinics(searchQuery);

    // Apply additional filters
    if (selectedServices.length > 0 || minRating > 0 || sortBy !== "name") {
      results = filterClinics({
        services: selectedServices.length > 0 ? selectedServices : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        sortBy: sortBy,
      }).filter((clinic) =>
        searchQuery
          ? clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            clinic.address.toLowerCase().includes(searchQuery.toLowerCase())
          : true,
      );
    }

    setFilteredClinics(results);
    if (
      searchQuery === "" &&
      selectedServices.length === 0 &&
      minRating === 0
    ) {
      setAllClinics(results);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service],
    );
  };

  const clearFilters = () => {
    setSelectedServices([]);
    setMinRating(0);
    setSortBy("name");
  };

  const activeFiltersCount =
    selectedServices.length +
    (minRating > 0 ? 1 : 0) +
    (sortBy !== "name" ? 1 : 0);

  const handleClinicPress = (clinic: Clinic) => {
    navigation.navigate("ClinicDetails", { clinic });
  };

  const handleRefreshClinics = async () => {
    if (refreshingClinics) {
      return;
    }

    setRefreshingClinics(true);
    try {
      await refreshClinics();
      applyFilters();
    } catch (error) {
      Alert.alert("Refresh Failed", "Unable to refresh clinic list right now.");
    } finally {
      setRefreshingClinics(false);
    }
  };

  return (
    <View style={styles.pageContainer}>
      <ScrollView style={styles.container} scrollEnabled={!showWelcomeSplash}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.name || "Guest"}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate("Profile")}
          >
            <Ionicons name="person-circle" size={40} color="#00BFA6" />
          </TouchableOpacity>
        </View>

        {/* AI Welcome Card */}
        <View style={styles.aiCard}>
          <View style={styles.aiCardIcon}>
            <Ionicons name="chatbubbles" size={20} color="#FFF" />
          </View>
          <View style={styles.aiCardText}>
            <Text style={styles.aiCardTitle}>
              Hi {user?.name?.split(" ")[0] || "there"}!
            </Text>
            <Text style={styles.aiCardSubtitle}>
              Your dental assistant is ready. Ask about appointments, services,
              or care.
            </Text>
          </View>
        </View>

        {/* Search Bar with Filters */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clinics by name or location..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options" size={20} color="#00BFA6" />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Appointments")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="calendar" size={24} color="#1976D2" />
            </View>
            <Text style={styles.actionText}>Appointments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Records")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="document-text" size={24} color="#388E3C" />
            </View>
            <Text style={styles.actionText}>Records</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("AIAssistant")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="chatbubbles" size={24} color="#F57C00" />
            </View>
            <Text style={styles.actionText}>AI Assistant</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              Alert.alert("Reminders", "You have no upcoming reminders")
            }
          >
            <View style={[styles.actionIcon, { backgroundColor: "#FCE4EC" }]}>
              <Ionicons name="notifications" size={24} color="#C2185B" />
            </View>
            <Text style={styles.actionText}>Reminders</Text>
          </TouchableOpacity>
        </View>

        {/* Clinics List */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? "Search Results" : "Nearby Clinics"}
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefreshClinics}
              disabled={refreshingClinics}
            >
              {refreshingClinics ? (
                <ActivityIndicator size="small" color="#00BFA6" />
              ) : (
                <Ionicons name="refresh" size={16} color="#00BFA6" />
              )}
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>
            {filteredClinics.length} clinic
            {filteredClinics.length !== 1 ? "s" : ""} found
          </Text>

          {filteredClinics.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={60} color="#CCC" />
              <Text style={styles.emptyText}>
                {searchQuery || selectedServices.length > 0 || minRating > 0
                  ? "No clinics found"
                  : "No clinics available yet"}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery || selectedServices.length > 0 || minRating > 0
                  ? "Try adjusting your search or filters"
                  : "Clinics will appear here once they register in the system"}
              </Text>
            </View>
          ) : (
            filteredClinics.map((clinic) => (
              <TouchableOpacity
                key={clinic.id}
                style={styles.clinicCard}
                onPress={() => handleClinicPress(clinic)}
              >
                <View style={styles.clinicIcon}>
                  <Ionicons name="business" size={28} color="#00BFA6" />
                </View>
                <View style={styles.clinicInfo}>
                  <Text style={styles.clinicName}>{clinic.name}</Text>
                  <View style={styles.clinicLocation}>
                    <Ionicons name="location" size={14} color="#666" />
                    <Text style={styles.clinicAddress}>{clinic.address}</Text>
                  </View>
                  <View style={styles.clinicMeta}>
                    <View style={styles.rating}>
                      <Ionicons name="star" size={14} color="#FFB300" />
                      <Text style={styles.ratingText}>{clinic.rating}</Text>
                    </View>
                    <Text style={styles.metaDivider}>•</Text>
                    <Text style={styles.patients}>
                      {clinic.totalPatients} patients
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#CCC" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Filter Modal */}
        <Modal
          visible={showFilters}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Services Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Services Offered</Text>
                <View style={styles.servicesGrid}>
                  {availableServices.map((service) => (
                    <TouchableOpacity
                      key={service}
                      style={[
                        styles.serviceChip,
                        selectedServices.includes(service) &&
                          styles.serviceChipSelected,
                      ]}
                      onPress={() => toggleService(service)}
                    >
                      <Text
                        style={[
                          styles.serviceChipText,
                          selectedServices.includes(service) &&
                            styles.serviceChipTextSelected,
                        ]}
                      >
                        {service}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Rating Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Minimum Rating</Text>
                <View style={styles.ratingOptions}>
                  {[0, 3, 4, 4.5].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[
                        styles.ratingOption,
                        minRating === rating && styles.ratingOptionSelected,
                      ]}
                      onPress={() => setMinRating(rating)}
                    >
                      <Ionicons
                        name="star"
                        size={20}
                        color={minRating === rating ? "#FFF" : "#FFB300"}
                      />
                      <Text
                        style={[
                          styles.ratingOptionText,
                          minRating === rating &&
                            styles.ratingOptionTextSelected,
                        ]}
                      >
                        {rating === 0 ? "All" : `${rating}+`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sort By */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Sort By</Text>
                <View style={styles.sortOptions}>
                  <TouchableOpacity
                    style={[
                      styles.sortOption,
                      sortBy === "name" && styles.sortOptionSelected,
                    ]}
                    onPress={() => setSortBy("name")}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        sortBy === "name" && styles.sortOptionTextSelected,
                      ]}
                    >
                      Name (A-Z)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortOption,
                      sortBy === "rating" && styles.sortOptionSelected,
                    ]}
                    onPress={() => setSortBy("rating")}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        sortBy === "rating" && styles.sortOptionTextSelected,
                      ]}
                    >
                      Highest Rated
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortOption,
                      sortBy === "patients" && styles.sortOptionSelected,
                    ]}
                    onPress={() => setSortBy("patients")}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        sortBy === "patients" && styles.sortOptionTextSelected,
                      ]}
                    >
                      Most Popular
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Apply Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>
                  Apply Filters ({filteredClinics.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>

      <Modal
        visible={showWelcomeSplash}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          // Keep modal open until user explicitly taps Okay.
        }}
      >
        <View style={styles.splashOverlay}>
          <View style={styles.splashCard}>
            <Text style={styles.splashTitle}>Welcome to DentaCore AI</Text>
            <Text style={styles.splashText}>
              Get personalized dental guidance and appointment help using our AI
              assistant.
            </Text>
            <TouchableOpacity
              style={styles.splashButton}
              onPress={() => setShowWelcomeSplash(false)}
            >
              <Text style={styles.splashButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.chatFab}
        onPress={() => navigation.navigate("AIAssistant")}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFF" />
      </TouchableOpacity>
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#E3F7F2",
  },
  greeting: {
    fontSize: 16,
    color: "#666",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 5,
  },
  profileButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    margin: 20,
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  pageContainer: {
    flex: 1,
  },
  aiCard: {
    marginHorizontal: 20,
    backgroundColor: "#E3F7F2",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  aiCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00BFA6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  aiCardText: {
    flex: 1,
  },
  aiCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#064D44",
  },
  aiCardSubtitle: {
    fontSize: 13,
    color: "#333",
    marginTop: 4,
  },
  chatFab: {
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  actionCard: {
    width: "23%",
    alignItems: "center",
    marginBottom: 15,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
  },
  section: {
    padding: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F7F4",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  refreshButtonText: {
    color: "#00BFA6",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  clinicCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clinicIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E0F7F4",
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
    marginBottom: 5,
  },
  clinicLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  clinicAddress: {
    fontSize: 13,
    color: "#666",
    marginLeft: 5,
  },
  clinicMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 13,
    color: "#333",
    marginLeft: 3,
    fontWeight: "600",
  },
  metaDivider: {
    marginHorizontal: 8,
    color: "#CCC",
  },
  patients: {
    fontSize: 13,
    color: "#666",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
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
  // Filter Modal Styles
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
  clearText: {
    fontSize: 16,
    color: "#00BFA6",
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    paddingVertical: 10,
  },
  filterSection: {
    backgroundColor: "#FFF",
    padding: 20,
    marginBottom: 10,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  serviceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginRight: 8,
    marginBottom: 8,
  },
  serviceChipSelected: {
    backgroundColor: "#00BFA615",
    borderColor: "#00BFA6",
  },
  serviceChipText: {
    fontSize: 14,
    color: "#666",
  },
  serviceChipTextSelected: {
    color: "#00BFA6",
    fontWeight: "600",
  },
  ratingOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ratingOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginHorizontal: 5,
    alignItems: "center",
  },
  ratingOptionSelected: {
    backgroundColor: "#00BFA615",
    borderColor: "#00BFA6",
  },
  ratingOptionText: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  ratingOptionTextSelected: {
    color: "#00BFA6",
    fontWeight: "600",
  },
  sortOptions: {
    gap: 10,
  },
  sortOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  sortOptionSelected: {
    backgroundColor: "#00BFA615",
    borderColor: "#00BFA6",
  },
  sortOptionText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },
  sortOptionTextSelected: {
    color: "#00BFA6",
    fontWeight: "600",
  },
  modalFooter: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  applyButton: {
    backgroundColor: "#00BFA6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    margin: 20,
    gap: 10,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: "#FFF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FFB300",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  starIcon: {
    marginBottom: 2,
  },
  splashOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  splashCard: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  splashTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  splashText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 18,
  },
  splashButton: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 22,
  },
  splashButtonText: {
    color: "#FFF",
    fontWeight: "700",
  },
});
