import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    MapView,
    Marker,
    PROVIDER_GOOGLE,
    type Region,
} from "../../components/maps/MapPrimitives";
import { Clinic } from "../../data/mockData";
import {
    getClinicById,
    refreshClinicsFromFirestore,
} from "../../services/dataService";

interface ClinicDetailsScreenProps {
  route: any;
  navigation: any;
}

export default function ClinicDetailsScreen({
  route,
  navigation,
}: ClinicDetailsScreenProps) {
  const navigationClinic: Clinic | undefined = route?.params?.clinic;
  const [clinic, setClinic] = useState<Clinic | null>(navigationClinic ?? null);
  const [syncingPin, setSyncingPin] = useState(false);
  const clinicId = navigationClinic?.id ?? clinic?.id;

  useEffect(() => {
    if (navigationClinic) {
      setClinic(navigationClinic);
    }
  }, [navigationClinic]);

  const syncLatestClinic = useCallback(async () => {
    if (!clinicId) {
      return;
    }
    setSyncingPin(true);
    try {
      await refreshClinicsFromFirestore();
      const refreshed = getClinicById(clinicId);
      if (refreshed) {
        setClinic(refreshed);
      }
    } catch (error) {
      const fallback = getClinicById(clinicId);
      if (fallback) {
        setClinic(fallback);
      }
    } finally {
      setSyncingPin(false);
    }
  }, [clinicId]);

  useFocusEffect(
    useCallback(() => {
      if (!clinicId) {
        return;
      }
      void syncLatestClinic();
    }, [clinicId, syncLatestClinic]),
  );

  const contactItems = useMemo(
    () => [
      {
        key: "address",
        label: "Address",
        value: clinic?.address,
        icon: "location" as const,
        color: "#1976D2",
      },
      {
        key: "phone",
        label: "Phone",
        value: clinic?.phone,
        icon: "call" as const,
        color: "#388E3C",
      },
      {
        key: "email",
        label: "Email",
        value: clinic?.email,
        icon: "mail" as const,
        color: "#F57C00",
      },
    ],
    [clinic?.address, clinic?.email, clinic?.phone],
  );

  const mapSubtitle = useMemo(() => {
    const address = (clinic?.address || "").trim();
    if (!address) {
      return "No address provided";
    }

    const segments = address
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (segments.length >= 3) {
      return `${segments[1]}, ${segments[2]}`;
    }

    if (segments.length >= 2) {
      return `${segments[0]}, ${segments[1]}`;
    }

    return address;
  }, [clinic?.address]);

  const hasCoords = useMemo(
    () =>
      Number.isFinite(clinic?.location?.lat) &&
      Number.isFinite(clinic?.location?.lng),
    [clinic?.location?.lat, clinic?.location?.lng],
  );

  const mapRegion: Region = useMemo(
    () =>
      hasCoords
        ? {
            latitude: clinic!.location!.lat,
            longitude: clinic!.location!.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }
        : {
            latitude: 14.5995,
            longitude: 120.9842,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
          },
    [clinic?.location, hasCoords],
  );

  const handleBookAppointment = () => {
    if (!clinic) {
      return;
    }
    navigation.navigate("BookAppointment", { clinic });
  };

  const handleOpenMap = useCallback(async () => {
    if (!clinic || !hasCoords) {
      return;
    }

    const { lat, lng } = clinic.location!;
    const encodedLabel = encodeURIComponent(clinic.address || clinic.name);
    const appleUrl = `http://maps.apple.com/?ll=${lat},${lng}&q=${encodedLabel}`;
    const androidUrl = `geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`;
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const targetUrl =
      Platform.select({ ios: appleUrl, android: androidUrl }) || fallbackUrl;

    try {
      const canOpen = await Linking.canOpenURL(targetUrl);
      await Linking.openURL(canOpen ? targetUrl : fallbackUrl);
    } catch (error) {
      Alert.alert(
        "Map unavailable",
        "We couldn't open your maps app. Please try again or check your internet connection.",
      );
    }
  }, [clinic, hasCoords]);

  if (!clinic) {
    return (
      <View style={[styles.container, styles.centeredState]}>
        <Ionicons name="business" size={40} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>Clinic unavailable</Text>
        <Text style={styles.emptySubtitle}>
          We couldn’t load this clinic’s details. Please go back and try again.
        </Text>
        <TouchableOpacity
          style={[styles.bookButton, styles.tryAgainButton]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={18} color="#FFF" />
          <Text style={styles.bookButtonText}>Return to list</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

      {/* Map Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Map Location</Text>
        <View style={styles.mapContainer}>
          {syncingPin && (
            <View style={styles.mapSyncBadge}>
              <ActivityIndicator size="small" color="#00BFA6" />
              <Text style={styles.mapSyncText}>Syncing latest pin…</Text>
            </View>
          )}
          <MapView
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_GOOGLE as any}
            region={mapRegion}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            {hasCoords ? (
              <Marker
                coordinate={{
                  latitude: clinic.location!.lat,
                  longitude: clinic.location!.lng,
                }}
                title={clinic.name}
                description={clinic.address}
              />
            ) : null}
          </MapView>

          {!hasCoords && (
            <View style={styles.mapFallback}>
              <Ionicons name="pin" size={28} color="#6B7280" />
              <Text style={styles.mapFallbackTitle}>No pin yet</Text>
              <Text style={styles.mapFallbackText}>
                Ask the clinic to pin their exact location to help patients find
                them easily.
              </Text>
            </View>
          )}

          <View style={styles.mapBadge}>
            <Text style={styles.mapBadgeTitle}>{clinic.name}</Text>
            <Text style={styles.mapBadgeSubtitle} numberOfLines={1}>
              {mapSubtitle}
            </Text>
          </View>
        </View>
        <Text style={styles.mapHint}>
          {hasCoords
            ? "Pinned by clinic team · Used for patient map search"
            : "This clinic hasn’t pinned their map location yet."}
        </Text>
        <TouchableOpacity
          style={[
            styles.directionsButton,
            !hasCoords && styles.directionsButtonDisabled,
          ]}
          onPress={handleOpenMap}
          disabled={!hasCoords}
        >
          <Ionicons
            name="navigate"
            size={16}
            color={hasCoords ? "#0F766E" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.directionsButtonText,
              !hasCoords && styles.directionsButtonTextDisabled,
            ]}
          >
            Open in Maps
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>

        {contactItems.map((item) => (
          <View key={item.key} style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={item.value ? styles.infoText : styles.infoTextMuted}>
                {item.value || "Not provided"}
              </Text>
            </View>
          </View>
        ))}
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
          {(clinic.servicesOffered ?? []).map((service, index) => (
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
        {Object.entries(clinic.operatingHours ?? {}).map(([day, hours]) => (
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
  centeredState: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  tryAgainButton: {
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
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
  infoTextMuted: {
    fontSize: 15,
    color: "#9CA3AF",
  },
  description: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
  },
  mapContainer: {
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  mapSyncBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    zIndex: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  mapSyncText: {
    fontSize: 12,
    color: "#036666",
    fontWeight: "600",
  },
  mapBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  mapBadgeTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: "#111827",
  },
  mapBadgeSubtitle: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
  },
  mapFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  mapFallbackTitle: {
    fontWeight: "700",
    color: "#111827",
  },
  mapFallbackText: {
    color: "#4B5563",
    paddingHorizontal: 20,
    textAlign: "center",
  },
  mapHint: {
    marginTop: 8,
    color: "#6B7280",
    fontSize: 12,
  },
  directionsButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFEF8",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  directionsButtonDisabled: {
    backgroundColor: "#F3F4F6",
  },
  directionsButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F766E",
  },
  directionsButtonTextDisabled: {
    color: "#9CA3AF",
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
