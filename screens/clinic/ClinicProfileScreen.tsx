import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import {
    MapView,
    Marker,
    PROVIDER_GOOGLE,
} from "../../components/maps/MapPrimitives";
import { useAuth } from "../../context/AuthContext";
import {
    getUpcomingAppointmentsForClinic,
    refreshClinicsFromFirestore,
    updateClinic,
} from "../../services/dataService";

interface ClinicProfileScreenProps {
  navigation: any;
}

type GeocodeStatus = "idle" | "loading" | "success" | "error";

type PlacesAutocompleteData = {
  description?: string;
};

type PlacesAutocompleteDetails = {
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
};

const isStructuredAddressFormat = (value: string): boolean => {
  const segments = value
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length < 4) {
    return false;
  }

  const postalCode = segments[segments.length - 1];
  return /^\d{4}$/.test(postalCode);
};

const normalizeAddressForGeocoding = (value: string): string => {
  if (/philippines/i.test(value)) {
    return value;
  }

  return `${value}, Philippines`;
};

export default function ClinicProfileScreen({
  navigation,
}: ClinicProfileScreenProps) {
  const { clinic, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showPrivacySettingsModal, setShowPrivacySettingsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [clinicName, setClinicName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});
  const [operatingHours, setOperatingHours] = useState<any>({});
  const [newService, setNewService] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [locationCoords, setLocationCoords] = useState({
    lat: 14.5995,
    lng: 120.9842,
  });
  const [geocodeStatus, setGeocodeStatus] = useState<GeocodeStatus>("idle");
  const [geocodeMessage, setGeocodeMessage] = useState("");
  const [lastPinnedAddress, setLastPinnedAddress] = useState("");
  const [allowUserNameAccess, setAllowUserNameAccess] = useState(true);
  const [allowUserContactAccess, setAllowUserContactAccess] = useState(true);
  const [allowUserLocationAccess, setAllowUserLocationAccess] = useState(false);
  const [enableThirdPartySharing, setEnableThirdPartySharing] = useState(false);
  const [dataRetentionDays, setDataRetentionDays] = useState("365");
  const [systemNotificationsEnabled, setSystemNotificationsEnabled] = useState(true);
  const [notificationFrequency, setNotificationFrequency] = useState("Real-time");
  const [defaultTimezone, setDefaultTimezone] = useState("Asia/Manila");
  const [defaultClinicView, setDefaultClinicView] = useState("List");
  const [appLanguage, setAppLanguage] = useState("English");
  const deviceGeocodePermission = useRef<"unknown" | "granted" | "denied">(
    "unknown",
  );

  const clinicNotifications = useMemo(() => {
    if (!clinic?.id) {
      return [];
    }

    return getUpcomingAppointmentsForClinic(clinic.id, 12).map((appointment) => {
      const dayDiff =
        (new Date(`${appointment.date}T00:00:00`).getTime() -
          new Date().setHours(0, 0, 0, 0)) /
        (1000 * 60 * 60 * 24);

      const priority = dayDiff <= 1 ? "high" : dayDiff <= 3 ? "medium" : "low";
      return {
        id: appointment.id,
        title: `Upcoming patient: ${appointment.patientName}`,
        message: `${appointment.type} on ${appointment.date} at ${appointment.time}`,
        timestamp: `${appointment.date} ${appointment.time}`,
        status: "unread",
        priority,
      };
    });
  }, [clinic?.id]);

  const googleMapsApiKey = useMemo(() => {
    const envKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    const configKey =
      Constants.expoConfig?.extra?.googleMapsApiKey ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Constants as any)?.manifest?.extra?.googleMapsApiKey;
    return envKey ?? configKey ?? "";
  }, []);

  const supportsGooglePlaces = googleMapsApiKey.length > 0;

  const ensureDeviceGeocodePermission = useCallback(async () => {
    if (deviceGeocodePermission.current === "granted") {
      return true;
    }

    try {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.granted) {
        deviceGeocodePermission.current = "granted";
        return true;
      }

      const requested = await Location.requestForegroundPermissionsAsync();
      if (requested.granted) {
        deviceGeocodePermission.current = "granted";
        return true;
      }

      deviceGeocodePermission.current = "denied";
      return false;
    } catch (error) {
      console.warn("Unable to query location permission", error);
      return false;
    }
  }, []);

  const geocodeAddressWithGoogle = useCallback(
    async (targetAddress: string) => {
      if (!supportsGooglePlaces || !targetAddress) {
        return null;
      }

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(normalizeAddressForGeocoding(targetAddress))}&key=${googleMapsApiKey}`,
        );
        const json = await response.json();
        if (
          json.status === "OK" &&
          Array.isArray(json.results) &&
          json.results.length > 0
        ) {
          const { lat, lng } = json.results[0].geometry.location;
          return { lat, lng };
        }
      } catch (error) {
        console.warn("Failed to geocode with Google Maps", error);
      }

      return null;
    },
    [googleMapsApiKey, supportsGooglePlaces],
  );

  const geocodeAddressWithDevice = useCallback(
    async (targetAddress: string) => {
      if (!targetAddress) {
        return null;
      }

      const hasPermission = await ensureDeviceGeocodePermission();
      if (!hasPermission) {
        const error = new Error("permission-denied");
        (error as { code?: string }).code = "permission-denied";
        throw error;
      }

      try {
        const results = await Location.geocodeAsync(
          normalizeAddressForGeocoding(targetAddress),
        );
        const first = results?.[0];
        if (
          first &&
          typeof first.latitude === "number" &&
          Number.isFinite(first.latitude) &&
          typeof first.longitude === "number" &&
          Number.isFinite(first.longitude)
        ) {
          return { lat: first.latitude, lng: first.longitude };
        }
      } catch (error) {
        console.warn("Failed to geocode with device services", error);
        throw error;
      }

      return null;
    },
    [ensureDeviceGeocodePermission],
  );

  const syncCoordsForAddress = useCallback(
    async (targetAddress: string) => {
      if (!targetAddress) {
        return false;
      }

      if (
        lastPinnedAddress &&
        lastPinnedAddress !== "__manual__" &&
        targetAddress.localeCompare(lastPinnedAddress, undefined, {
          sensitivity: "accent",
        }) === 0
      ) {
        return true;
      }

      let coords: { lat: number; lng: number } | null = null;
      let method: "google" | "device" | null = null;

      if (supportsGooglePlaces) {
        const googleCoords = await geocodeAddressWithGoogle(targetAddress);
        if (googleCoords) {
          coords = googleCoords;
          method = "google";
        }
      }

      let devicePermissionDenied = false;

      if (!coords) {
        try {
          const deviceCoords = await geocodeAddressWithDevice(targetAddress);
          if (deviceCoords) {
            coords = deviceCoords;
            method = "device";
          }
        } catch (error) {
          if ((error as { code?: string }).code === "permission-denied") {
            devicePermissionDenied = true;
          }
        }
      }

      if (!coords) {
        if (devicePermissionDenied) {
          setGeocodeStatus("error");
          setGeocodeMessage(
            "Enable location permissions to auto-pin using built-in lookup, or drop a pin manually.",
          );
        }
        return false;
      }

      setLocationCoords(coords);
      setLastPinnedAddress(targetAddress);
      setGeocodeStatus("success");
      setGeocodeMessage(
        method === "google"
          ? "Address pinned using Google Maps."
          : "Address pinned using built-in location lookup.",
      );
      return true;
    },
    [
      geocodeAddressWithDevice,
      geocodeAddressWithGoogle,
      lastPinnedAddress,
      supportsGooglePlaces,
    ],
  );

  useEffect(() => {
    if (clinic) {
      setClinicName(clinic.name);
      setAddress(clinic.address);
      setPhone(clinic.phone);
      setEmail(clinic.email);
      setDescription(clinic.description);
      setServices([...clinic.servicesOffered]);
      setServicePrices(clinic.servicePrices ?? {});
      setOperatingHours({ ...clinic.operatingHours });
      setLocationCoords({
        lat: clinic.location?.lat ?? 14.5995,
        lng: clinic.location?.lng ?? 120.9842,
      });
      setLastPinnedAddress(clinic.address ?? "");
    }
  }, [clinic]);

  useEffect(() => {
    if (!isEditing) {
      setGeocodeStatus("idle");
      setGeocodeMessage("");
    }
  }, [isEditing]);

  if (!clinic) {
    return null;
  }

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    const trimmedName = clinicName.trim();
    const trimmedAddress = address.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedAddress || !trimmedPhone || !trimmedEmail) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!isStructuredAddressFormat(trimmedAddress)) {
      Alert.alert(
        "Invalid clinic address",
        "Use this format: House No./Street, Barangay, City/Municipality, Province (if applicable), 4-digit Postal Code.",
      );
      return;
    }

    const ensuredServices =
      services.length > 0 ? services : ["General Dentistry"];

    const normalizedServicePrices: Record<string, number> = {};
    for (const serviceName of ensuredServices) {
      const price = servicePrices[serviceName];
      if (!Number.isFinite(price) || price <= 0) {
        Alert.alert(
          "Missing service price",
          `Please provide a valid price for ${serviceName}.`,
        );
        return;
      }
      normalizedServicePrices[serviceName] = Math.round(price);
    }

    setIsSaving(true);
    try {
      const shouldAutoPinBeforeSave =
        trimmedAddress.length > 0 && lastPinnedAddress !== "__manual__";

      if (shouldAutoPinBeforeSave) {
        setGeocodeStatus("loading");
        setGeocodeMessage("Verifying address with auto-pin service…");
        const couldSync = await syncCoordsForAddress(trimmedAddress);
        if (!couldSync) {
          setGeocodeStatus("error");
          setGeocodeMessage(
            "We couldn't auto-pin this address. Drop a pin manually before saving.",
          );
          Alert.alert(
            "Pin required",
            "We couldn't auto-pin this address. Please refine it or drop a pin on the map before saving.",
          );
          return;
        }
      }

      const success = await updateClinic(clinic.id, {
        name: trimmedName,
        address: trimmedAddress,
        phone: trimmedPhone,
        email: trimmedEmail,
        description: description,
        servicesOffered: ensuredServices,
        servicePrices: normalizedServicePrices,
        operatingHours: operatingHours,
        location: {
          lat: Number(locationCoords.lat),
          lng: Number(locationCoords.lng),
        },
      });

      if (success) {
        // keep local form in sync
        setClinicName(trimmedName);
        setAddress(trimmedAddress);
        setPhone(trimmedPhone);
        setEmail(trimmedEmail);
        setServices(ensuredServices);
        setServicePrices(normalizedServicePrices);
        await refreshClinicsFromFirestore();
        Alert.alert("Success", "Profile updated successfully");
        setIsEditing(false);
      } else {
        Alert.alert("Error", "Failed to update profile");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setClinicName(clinic.name);
    setAddress(clinic.address);
    setPhone(clinic.phone);
    setEmail(clinic.email);
    setDescription(clinic.description);
    setServices([...clinic.servicesOffered]);
    setServicePrices(clinic.servicePrices ?? {});
    setOperatingHours({ ...clinic.operatingHours });
    setLocationCoords({
      lat: clinic.location?.lat ?? 14.5995,
      lng: clinic.location?.lng ?? 120.9842,
    });
    setLastPinnedAddress(clinic.address ?? "");
    setGeocodeStatus("idle");
    setGeocodeMessage("");
    setIsEditing(false);
  };

  const handleAddService = () => {
    const serviceName = newService.trim();
    const priceValue = Number(newServicePrice.trim());

    if (!serviceName) {
      Alert.alert("Missing service", "Please enter a service name.");
      return;
    }

    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      Alert.alert("Invalid price", "Please provide a valid service price.");
      return;
    }

    if (!services.includes(serviceName)) {
      setServices([...services, serviceName]);
    }

    setServicePrices((prev) => ({ ...prev, [serviceName]: Math.round(priceValue) }));
    setNewService("");
    setNewServicePrice("");
  };

  const handleRemoveService = (index: number) => {
    const serviceName = services[index];
    setServices(services.filter((_, i) => i !== index));
    setServicePrices((prev) => {
      const next = { ...prev };
      delete next[serviceName];
      return next;
    });
  };

  const handleServicePriceChange = (serviceName: string, value: string) => {
    const numeric = Number(value.replace(/[^0-9]/g, ""));
    setServicePrices((prev) => ({
      ...prev,
      [serviceName]: Number.isFinite(numeric) && numeric > 0 ? numeric : 0,
    }));
  };

  const handleUpdateHours = (day: string, hours: string) => {
    setOperatingHours({ ...operatingHours, [day]: hours });
  };

  const handleAddressChange = (text: string) => {
    setAddress(text);
    setGeocodeStatus("idle");
    setGeocodeMessage("");
  };

  const handlePlaceSelect = (
    data: PlacesAutocompleteData,
    details: PlacesAutocompleteDetails | null = null,
  ) => {
    const formatted =
      details?.formatted_address || data?.description || address;

    if (formatted) {
      setAddress(formatted);
    }

    const geometryLocation = details?.geometry?.location;
    if (
      geometryLocation?.lat !== undefined &&
      geometryLocation?.lng !== undefined
    ) {
      setLocationCoords({
        lat: geometryLocation.lat,
        lng: geometryLocation.lng,
      });
      if (formatted) {
        setLastPinnedAddress(formatted);
      }
      setGeocodeStatus("success");
      setGeocodeMessage("Address pinned via Google Maps search.");
    } else if (formatted) {
      setGeocodeStatus("loading");
      setGeocodeMessage("Fetching coordinates from Google Maps…");
      void syncCoordsForAddress(formatted).then((success) => {
        if (!success) {
          setGeocodeStatus("error");
          setGeocodeMessage(
            "Couldn't fetch coordinates. Tap the map to pin manually.",
          );
        }
      });
    }
  };

  const handleMapPress = (event: {
    nativeEvent: { coordinate: { latitude: number; longitude: number } };
  }) => {
    if (!isEditing) return;
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLocationCoords({ lat: latitude, lng: longitude });
    setLastPinnedAddress("__manual__");
    setGeocodeStatus("success");
    setGeocodeMessage("Map pin updated manually.");
  };

  const handleCoordinateChange = (axis: "lat" | "lng", value: string) => {
    const numeric = Number(value);
    setLocationCoords((prev) => ({
      ...prev,
      [axis]: Number.isFinite(numeric) ? numeric : prev[axis],
    }));
    setLastPinnedAddress("__manual__");
    setGeocodeStatus("success");
    setGeocodeMessage("Coordinates updated manually.");
  };

  const handleAutoPinFromAddress = async () => {
    const trimmedAddress = address.trim();

    if (!trimmedAddress) {
      Alert.alert("Missing address", "Please enter an address first.");
      return;
    }

    if (!isStructuredAddressFormat(trimmedAddress)) {
      Alert.alert(
        "Invalid address format",
        "Use: House No./Street, Barangay, City/Municipality, Province (if applicable), 4-digit Postal Code.",
      );
      return;
    }

    setGeocodeStatus("loading");
    setGeocodeMessage("Locating address…");

    const synced = await syncCoordsForAddress(trimmedAddress);
    if (!synced) {
      setGeocodeStatus("error");
      setGeocodeMessage(
        "We couldn't find this address. Try refining it or drop a pin manually.",
      );
      Alert.alert(
        "Location not found",
        "We couldn't locate this address automatically. Please adjust the map pin manually.",
      );
      return;
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();

          let rootNavigation = navigation;
          while (rootNavigation?.getParent?.()) {
            rootNavigation = rootNavigation.getParent();
          }

          if (rootNavigation?.reset) {
            rootNavigation.reset({ index: 0, routes: [{ name: "Auth" }] });
            return;
          }

          if (navigation?.replace) {
            navigation.replace("Auth");
          }
        },
      },
    ]);
  };

  if (!clinic) {
    return null;
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Ionicons name="grid-outline" size={24} color="#00BFA6" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Clinic Profile</Text>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Ionicons name="create-outline" size={24} color="#00BFA6" />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.clinicAvatar}>
          <Ionicons name="business" size={40} color="#FFF" />
        </View>
        {isEditing ? (
          <TextInput
            style={styles.headerInput}
            value={clinicName}
            onChangeText={setClinicName}
            placeholder="Clinic Name"
          />
        ) : (
          <Text style={styles.clinicName}>{clinicName}</Text>
        )}
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={18} color="#FFB300" />
          <Text style={styles.rating}>{clinic.rating}</Text>
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="location" size={20} color="#00BFA6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              {isEditing ? (
                supportsGooglePlaces ? (
                  <View style={styles.autocompleteWrapper}>
                    <GooglePlacesAutocomplete
                      placeholder="Search clinic address"
                      fetchDetails
                      onPress={handlePlaceSelect}
                      query={{
                        key: googleMapsApiKey,
                        language: "en",
                      }}
                      debounce={300}
                      minLength={3}
                      enablePoweredByContainer={false}
                      textInputProps={{
                        value: address,
                        onChangeText: handleAddressChange,
                        multiline: true,
                      }}
                      styles={{
                        textInput: styles.autocompleteInput,
                        container: styles.autocompleteContainer,
                        row: styles.autocompleteRow,
                        listView: styles.autocompleteList,
                        separator: styles.autocompleteSeparator,
                        description: styles.autocompleteDescription,
                      }}
                    />
                  </View>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={address}
                    onChangeText={handleAddressChange}
                    placeholder="24 C.V. UP Campus, UP Campus, Quezon City, Metro Manila, 1101"
                    multiline
                  />
                )
              ) : (
                <Text style={styles.infoValue}>{address}</Text>
              )}
              {isEditing && (
                <Text style={styles.addressFormatHint}>
                  Format: House No./Street, Barangay, City/Municipality,
                  Province (if applicable), 4-digit Postal Code
                </Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="call" size={20} color="#00BFA6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>{phone}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail" size={20} color="#00BFA6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.infoValue}>{email}</Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Map Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Map Location</Text>
        <View style={styles.mapCard}>
          <MapView
            style={styles.mapView}
            provider={PROVIDER_GOOGLE as any}
            initialRegion={{
              latitude: locationCoords.lat,
              longitude: locationCoords.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            region={{
              latitude: locationCoords.lat,
              longitude: locationCoords.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={handleMapPress}
          >
            <Marker
              coordinate={{
                latitude: locationCoords.lat,
                longitude: locationCoords.lng,
              }}
              title={clinicName}
              description={address}
            />
          </MapView>

          {isEditing ? (
            <>
              <Text style={styles.mapHint}>
                Tap on the map to pin your exact clinic location or adjust the
                coordinates below.
              </Text>
              <TouchableOpacity
                style={styles.mapHintButton}
                onPress={handleAutoPinFromAddress}
              >
                <Ionicons name="navigate" size={16} color="#059669" />
                <Text style={styles.mapHintButtonText}>
                  Auto-pin from address
                </Text>
              </TouchableOpacity>
              {geocodeMessage.length > 0 && (
                <Text
                  style={[
                    styles.mapHint,
                    geocodeStatus === "error"
                      ? styles.mapHintError
                      : geocodeStatus === "loading"
                        ? styles.mapHintLoading
                        : styles.mapHintSuccess,
                  ]}
                >
                  {geocodeMessage}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.mapHint}>
              Pinned by clinic team · Used for patient map search
            </Text>
          )}

          {isEditing && (
            <View style={styles.coordRow}>
              <View style={styles.coordField}>
                <Text style={styles.coordLabel}>Latitude</Text>
                <TextInput
                  style={styles.coordInput}
                  value={String(locationCoords.lat)}
                  onChangeText={(text) => handleCoordinateChange("lat", text)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.coordField}>
                <Text style={styles.coordLabel}>Longitude</Text>
                <TextInput
                  style={styles.coordInput}
                  value={String(locationCoords.lng)}
                  onChangeText={(text) => handleCoordinateChange("lng", text)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.descriptionCard}>
          {isEditing ? (
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter clinic description"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          ) : (
            <Text style={styles.descriptionText}>{description}</Text>
          )}
        </View>
      </View>

      {/* Services Offered */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services Offered</Text>
          {isEditing && (
            <TouchableOpacity onPress={() => setShowServicesModal(true)}>
              <Text style={styles.editButton}>Manage</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.servicesContainer}>
          {services.map((service, index) => (
            <View key={index} style={styles.serviceChip}>
              <Ionicons name="checkmark-circle" size={16} color="#00BFA6" />
              <Text style={styles.serviceText}>{service}</Text>
              {isEditing && (
                <TouchableOpacity onPress={() => handleRemoveService(index)}>
                  <Ionicons name="close-circle" size={16} color="#F44336" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Operating Hours */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          {isEditing && (
            <TouchableOpacity onPress={() => setShowHoursModal(true)}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.hoursCard}>
          {Object.entries(operatingHours).map(([day, hours]) => (
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
                {hours as string}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowNotificationsModal(true)}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() =>
            Alert.alert("Password", "Change password feature coming soon")
          }
        >
          <View style={styles.settingLeft}>
            <Ionicons name="lock-closed-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowPrivacySettingsModal(true)}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Privacy & Security</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
      </View>

      {/* Platform Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Information</Text>
        <View style={styles.platformCard}>
          <Text style={styles.platformText}>
            DentaCore v1.0.0 - Clinic Portal
          </Text>
          <Text style={styles.platformSubtext}>
            Last updated: February 23, 2026
          </Text>
        </View>
      </View>

      {/* Save/Cancel Buttons */}
      {isEditing && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>
              {isSaving ? "Saving…" : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Logout Button */}
      {!isEditing && (
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#F44336" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      )}

      <View style={styles.footer} />

      {/* Services Management Modal */}
      <Modal
        visible={showServicesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowServicesModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowServicesModal(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Manage Services</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.addServiceSection}>
              <Text style={styles.modalSectionTitle}>Add New Service</Text>
              <View style={styles.addServiceRow}>
                <TextInput
                  style={styles.serviceInput}
                  value={newService}
                  onChangeText={setNewService}
                  placeholder="Enter service name"
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={styles.servicePriceInput}
                  value={newServicePrice}
                  onChangeText={(value) =>
                    setNewServicePrice(value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="Price"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleAddService}
                >
                  <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.currentServicesSection}>
              <Text style={styles.modalSectionTitle}>Current Services</Text>
              {services.map((service, index) => (
                <View key={index} style={styles.serviceItem}>
                  <View style={styles.serviceItemCopy}>
                    <Text style={styles.serviceItemText}>{service}</Text>
                    <Text style={styles.servicePriceText}>
                      ₱{(servicePrices[service] ?? 0).toLocaleString()}
                    </Text>
                  </View>
                  <TextInput
                    style={styles.inlinePriceInput}
                    value={String(servicePrices[service] ?? "")}
                    onChangeText={(value) => handleServicePriceChange(service, value)}
                    keyboardType="number-pad"
                    placeholder="Price"
                  />
                  <TouchableOpacity onPress={() => handleRemoveService(index)}>
                    <Ionicons name="trash-outline" size={20} color="#F44336" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowServicesModal(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Operating Hours Modal */}
      <Modal
        visible={showHoursModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHoursModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowHoursModal(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Operating Hours</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {Object.entries(operatingHours).map(([day, hours]) => (
              <View key={day} style={styles.hoursEditRow}>
                <Text style={styles.dayEditText}>
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </Text>
                <TextInput
                  style={styles.hoursInput}
                  value={hours as string}
                  onChangeText={(text) => handleUpdateHours(day, text)}
                  placeholder="e.g., 9:00 AM - 5:00 PM or Closed"
                  placeholderTextColor="#999"
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowHoursModal(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showNotificationsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Clinic Notifications</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {clinicNotifications.length === 0 ? (
              <View style={styles.notificationCard}>
                <Text style={styles.notificationTitle}>No notifications yet</Text>
                <Text style={styles.notificationMeta}>Upcoming patient alerts will appear here.</Text>
              </View>
            ) : (
              clinicNotifications.map((item) => (
                <View key={item.id} style={styles.notificationCard}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  <Text style={styles.notificationBody}>{item.message}</Text>
                  <Text style={styles.notificationMeta}>
                    {item.timestamp} · {item.status} · {item.priority}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showPrivacySettingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacySettingsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPrivacySettingsModal(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Privacy & System Settings</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.settingsBlock}>
              <Text style={styles.modalSectionTitle}>Privacy Settings</Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Admin can view user names</Text>
                <TouchableOpacity onPress={() => setAllowUserNameAccess((v) => !v)}>
                  <Text style={styles.toggleValue}>{allowUserNameAccess ? "On" : "Off"}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Admin can view user contact</Text>
                <TouchableOpacity onPress={() => setAllowUserContactAccess((v) => !v)}>
                  <Text style={styles.toggleValue}>{allowUserContactAccess ? "On" : "Off"}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Admin can view user location</Text>
                <TouchableOpacity onPress={() => setAllowUserLocationAccess((v) => !v)}>
                  <Text style={styles.toggleValue}>{allowUserLocationAccess ? "On" : "Off"}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Third-party data sharing</Text>
                <TouchableOpacity onPress={() => setEnableThirdPartySharing((v) => !v)}>
                  <Text style={styles.toggleValue}>{enableThirdPartySharing ? "Enabled" : "Disabled"}</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={dataRetentionDays}
                onChangeText={(value) => setDataRetentionDays(value.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                placeholder="Data retention days"
              />
            </View>

            <View style={styles.settingsBlock}>
              <Text style={styles.modalSectionTitle}>System Settings</Text>
              <TextInput style={styles.input} value={appLanguage} onChangeText={setAppLanguage} placeholder="Language" />
              <TextInput style={styles.input} value={notificationFrequency} onChangeText={setNotificationFrequency} placeholder="Notification frequency" />
              <TextInput style={styles.input} value={defaultClinicView} onChangeText={setDefaultClinicView} placeholder="Default clinic view" />
              <TextInput style={styles.input} value={defaultTimezone} onChangeText={setDefaultTimezone} placeholder="Default timezone" />
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>System notifications</Text>
                <TouchableOpacity onPress={() => setSystemNotificationsEnabled((v) => !v)}>
                  <Text style={styles.toggleValue}>{systemNotificationsEnabled ? "Enabled" : "Disabled"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
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
    backgroundColor: "#00BFA6",
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: "center",
  },
  clinicAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFF",
    marginBottom: 15,
  },
  clinicName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rating: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
    marginLeft: 5,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  editButton: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00BFA6",
  },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0F7F4",
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
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
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
  },
  serviceText: {
    fontSize: 13,
    color: "#00BFA6",
    marginLeft: 5,
    fontWeight: "500",
  },
  hoursCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
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
  },
  hoursText: {
    fontSize: 15,
    color: "#666",
  },
  closedText: {
    color: "#999",
    fontStyle: "italic",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingText: {
    fontSize: 15,
    color: "#333",
    marginLeft: 12,
  },
  platformCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  platformText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    marginBottom: 5,
  },
  platformSubtext: {
    fontSize: 12,
    color: "#999",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F44336",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F44336",
    marginLeft: 8,
  },
  footer: {
    height: 40,
  },
  // Edit Mode Styles
  headerInput: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 15,
    marginBottom: 8,
    textAlign: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#00BFA6",
  },
  input: {
    fontSize: 14,
    color: "#333",
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginTop: 5,
  },
  autocompleteWrapper: {
    zIndex: 20,
  },
  autocompleteContainer: {
    flex: 0,
  },
  autocompleteInput: {
    fontSize: 14,
    color: "#333",
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  autocompleteList: {
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: "#FFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  autocompleteRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  autocompleteSeparator: {
    height: 1,
    backgroundColor: "#F0F0F0",
  },
  autocompleteDescription: {
    color: "#111827",
    fontSize: 14,
  },
  addressFormatHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  textArea: {
    fontSize: 14,
    color: "#333",
    backgroundColor: "#F9F9F9",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minHeight: 100,
  },
  descriptionCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  mapCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  mapView: {
    height: 220,
    borderRadius: 12,
  },
  mapHint: {
    color: "#4B5563",
    fontSize: 12,
    marginTop: 4,
  },
  mapHintButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    marginTop: 8,
    gap: 6,
  },
  mapHintButtonText: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "600",
  },
  mapHintSuccess: {
    color: "#059669",
  },
  mapHintError: {
    color: "#DC2626",
  },
  mapHintLoading: {
    color: "#6B7280",
  },
  coordRow: {
    flexDirection: "row",
    gap: 12,
  },
  coordField: {
    flex: 1,
  },
  coordLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },
  coordInput: {
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#111827",
  },
  actionButtons: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#00BFA6",
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
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
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  addServiceSection: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  addServiceRow: {
    flexDirection: "row",
    gap: 10,
  },
  serviceInput: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    fontSize: 15,
    color: "#333",
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#00BFA6",
    alignItems: "center",
    justifyContent: "center",
  },
  currentServicesSection: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
  },
  serviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  serviceItemCopy: {
    flex: 1,
    marginRight: 8,
  },
  serviceItemText: {
    fontSize: 15,
    color: "#333",
  },
  servicePriceText: {
    fontSize: 12,
    color: "#0F766E",
    fontWeight: "700",
    marginTop: 2,
  },
  servicePriceInput: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 10,
    paddingVertical: 12,
    minWidth: 90,
    marginRight: 8,
    color: "#333",
  },
  inlinePriceInput: {
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 88,
    marginRight: 8,
    color: "#111",
    textAlign: "right",
  },
  hoursEditRow: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dayEditText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  hoursInput: {
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    fontSize: 15,
    color: "#333",
  },
  modalFooter: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  doneButton: {
    backgroundColor: "#00BFA6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  notificationCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  notificationTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  notificationBody: {
    color: "#374151",
    fontSize: 13,
    marginTop: 4,
  },
  notificationMeta: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 4,
  },
  settingsBlock: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  toggleLabel: {
    color: "#334155",
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  toggleValue: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "700",
  },
});
