import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

import { getAllClinics } from "../../services/dataService";

interface ClinicPin {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export default function ExploreMapScreen() {
  const clinics = useMemo<ClinicPin[]>(
    () =>
      getAllClinics().map((clinic) => ({
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        lat: clinic.location?.lat ?? 0,
        lng: clinic.location?.lng ?? 0,
      })),
    [],
  );

  const fallbackRegion: Region = clinics.length
    ? {
        latitude: clinics[0].lat,
        longitude: clinics[0].lng,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }
    : {
        latitude: 14.5995,
        longitude: 120.9842,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };

  const [region, setRegion] = useState<Region | null>(fallbackRegion);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<ClinicPin | null>(null);

  useEffect(() => {
    const requestLocation = async () => {
      setIsRequesting(true);
      setPermissionError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionError(
          "Location permission denied. Showing clinics near default area.",
        );
        setIsRequesting(false);
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      const coords = {
        lat: current.coords.latitude,
        lng: current.coords.longitude,
      };
      setUserCoords(coords);
      setRegion({
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
      setIsRequesting(false);
    };

    void requestLocation();
  }, []);

  // Pre-select the first clinic with coordinates so patients immediately see a pinned address
  useEffect(() => {
    if (selectedClinic) return;
    const firstWithCoords = clinics.find(
      (c) => Number.isFinite(c.lat) && Number.isFinite(c.lng),
    );
    if (firstWithCoords) {
      setSelectedClinic(firstWithCoords);
      setRegion(
        (prev) =>
          prev ?? {
            latitude: firstWithCoords.lat,
            longitude: firstWithCoords.lng,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          },
      );
    }
  }, [clinics, selectedClinic]);

  const recenterOnUser = () => {
    if (!userCoords) return;
    setRegion({
      latitude: userCoords.lat,
      longitude: userCoords.lng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Dental Clinics</Text>
        <Text style={styles.subtitle}>
          See clinics around you and tap pins for details.
        </Text>
      </View>

      <View style={styles.mapWrapper}>
        {!region ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#00BFA6" />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        ) : (
          <MapView
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            region={region}
            onRegionChangeComplete={setRegion}
          >
            {userCoords && (
              <Marker
                coordinate={{
                  latitude: userCoords.lat,
                  longitude: userCoords.lng,
                }}
                title="You are here"
                pinColor="#00BFA6"
              />
            )}

            {clinics
              .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
              .map((clinic) => (
                <Marker
                  key={clinic.id}
                  coordinate={{ latitude: clinic.lat, longitude: clinic.lng }}
                  title={clinic.name}
                  description={clinic.address}
                  onPress={() => setSelectedClinic(clinic)}
                />
              ))}
          </MapView>
        )}

        <View style={styles.fabGroup}>
          <TouchableOpacity
            style={[styles.fabButton, isRequesting && styles.fabDisabled]}
            disabled={isRequesting}
            onPress={() => {
              setRegion(fallbackRegion);
            }}
          >
            <Text style={styles.fabText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.fabButton,
              (!userCoords || isRequesting) && styles.fabDisabled,
            ]}
            disabled={!userCoords || isRequesting}
            onPress={recenterOnUser}
          >
            <Text style={styles.fabText}>My Location</Text>
          </TouchableOpacity>
        </View>
      </View>

      {permissionError ? (
        <Text style={styles.errorText}>{permissionError}</Text>
      ) : null}
      <Text style={styles.hintText}>
        Clinics are plotted from their saved addresses. Ask clinics to pin their
        exact location for best accuracy.
      </Text>

      {selectedClinic && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>{selectedClinic.name}</Text>
              <Text style={styles.infoSubtitle}>{selectedClinic.address}</Text>
            </View>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() =>
                setRegion({
                  latitude: selectedClinic.lat,
                  longitude: selectedClinic.lng,
                  latitudeDelta: 0.04,
                  longitudeDelta: 0.04,
                })
              }
            >
              <Text style={styles.infoButtonText}>Center</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FB",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1D2939",
  },
  subtitle: {
    marginTop: 4,
    color: "#4B5563",
  },
  mapWrapper: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    color: "#4B5563",
  },
  fabGroup: {
    position: "absolute",
    right: 12,
    bottom: 12,
    gap: 8,
  },
  fabButton: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  fabDisabled: {
    opacity: 0.6,
  },
  fabText: {
    color: "#FFF",
    fontWeight: "700",
  },
  errorText: {
    color: "#B91C1C",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  hintText: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#6B7280",
  },
  infoCard: {
    marginHorizontal: 12,
    marginBottom: 16,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00BFA6",
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  infoSubtitle: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
  },
  infoButton: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  infoButtonText: {
    color: "#FFF",
    fontWeight: "700",
  },
});
