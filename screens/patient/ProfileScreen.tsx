import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    MapView,
    Marker,
    PROVIDER_GOOGLE,
    UrlTile,
} from "../../components/maps/MapPrimitives";
import { useAuth } from "../../context/AuthContext";
import {
    getPatientAvatarUri,
    savePatientAvatarUri,
    subscribeToPatientAvatar,
} from "../../services/avatarService";
import { getUpcomingAppointmentsForPatient } from "../../services/dataService";

interface ProfileScreenProps {
  navigation: any;
}

type AddressParts = {
  houseStreet: string;
  barangay: string;
  cityMunicipality: string;
  province: string;
  postalCode: string;
};

const emptyAddressParts = (): AddressParts => ({
  houseStreet: "",
  barangay: "",
  cityMunicipality: "",
  province: "",
  postalCode: "",
});

const parseAddressParts = (address?: string): AddressParts => {
  if (!address?.trim()) {
    return emptyAddressParts();
  }

  const segments = address
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length >= 5) {
    return {
      houseStreet: segments[0],
      barangay: segments[1],
      cityMunicipality: segments[2],
      province: segments.slice(3, -1).join(", "),
      postalCode: segments[segments.length - 1],
    };
  }

  if (segments.length === 4) {
    return {
      houseStreet: segments[0],
      barangay: segments[1],
      cityMunicipality: segments[2],
      province: "",
      postalCode: segments[3],
    };
  }

  return {
    houseStreet: segments[0] ?? "",
    barangay: segments[1] ?? "",
    cityMunicipality: segments[2] ?? "",
    province: "",
    postalCode: segments[3] ?? "",
  };
};

const buildAddressFromParts = (parts: AddressParts): string => {
  const segments = [
    parts.houseStreet.trim(),
    parts.barangay.trim(),
    parts.cityMunicipality.trim(),
    parts.province.trim(),
    parts.postalCode.trim(),
  ].filter(Boolean);

  return segments.join(", ");
};

const defaultPin = { lat: 14.5995, lng: 120.9842 };

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profilePhone, setProfilePhone] = useState(user?.phone ?? "");
  const [addressParts, setAddressParts] = useState<AddressParts>(() =>
    parseAddressParts(user?.address),
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isAvatarActionPending, setIsAvatarActionPending] = useState(false);
  const [isAddressMapModalVisible, setIsAddressMapModalVisible] = useState(false);
  const [mapPin, setMapPin] = useState(defaultPin);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isNotificationsModalVisible, setIsNotificationsModalVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  const [isPreferencesModalVisible, setIsPreferencesModalVisible] = useState(false);
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);
  const [profileVisibilityAdminOnly, setProfileVisibilityAdminOnly] = useState(true);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(true);
  const [darkThemeEnabled, setDarkThemeEnabled] = useState(false);
  const [language, setLanguage] = useState("English");
  const mapProvider = Platform.OS === "android" ? PROVIDER_GOOGLE : undefined;

  const upcomingNotifications = useMemo(() => {
    if (!user?.id) {
      return [];
    }

    return getUpcomingAppointmentsForPatient(user.id, 8).map((appointment) => ({
      id: appointment.id,
      title: `Upcoming appointment at ${appointment.clinicName}`,
      body: `${appointment.type} · ${appointment.date} · ${appointment.time}`,
      priority: "medium",
      status: "unread",
      timestamp: `${appointment.date} ${appointment.time}`,
    }));
  }, [user?.id]);

  const loginActivity = useMemo(
    () => [
      {
        id: "login-1",
        device: "Android device",
        timestamp: new Date().toLocaleString(),
        location: user?.address || "Unknown location",
      },
      {
        id: "login-2",
        device: "Web browser",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toLocaleString(),
        location: "Metro Manila",
      },
    ],
    [user?.address],
  );

  useEffect(() => {
    let isMounted = true;

    const loadAvatar = async () => {
      const uri = await getPatientAvatarUri(user?.id ?? null);
      if (isMounted) {
        setAvatarUri(uri);
      }
    };

    void loadAvatar();

    if (!user?.id) {
      return () => {
        isMounted = false;
      };
    }

    const unsubscribe = subscribeToPatientAvatar(({ userId, uri }) => {
      if (isMounted && userId === user.id) {
        setAvatarUri(uri);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.id]);

  const userInitials = useMemo(() => {
    if (!user?.name) {
      return "PT";
    }
    const initials = user.name
      .split(" ")
      .filter(Boolean)
      .map((segment) => segment[0]?.toUpperCase() || "")
      .join("");
    return initials || "PT";
  }, [user?.name]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          logout();
          navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
        },
      },
    ]);
  };

  const handleEditProfile = () => {
    if (user) {
      setProfileName(user.name ?? "");
      setProfilePhone(user.phone ?? "");
      setAddressParts(parseAddressParts(user.address));
    }
    setIsEditModalVisible(true);
  };

  const handleAddressPartChange = (key: keyof AddressParts, value: string) => {
    setAddressParts((prev) => ({ ...prev, [key]: value }));
  };

  const geocodeCurrentAddressForPin = async () => {
    const currentAddress = buildAddressFromParts(addressParts);
    if (!currentAddress) {
      return false;
    }

    try {
      const result = await Location.geocodeAsync(`${currentAddress}, Philippines`);
      const point = result?.[0];
      if (!point) {
        return false;
      }

      setMapPin({ lat: point.latitude, lng: point.longitude });
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleOpenMapPicker = async () => {
    const hasAddressPin = await geocodeCurrentAddressForPin();
    if (hasAddressPin) {
      setIsAddressMapModalVisible(true);
      return;
    }

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.granted) {
        const current = await Location.getCurrentPositionAsync({});
        setMapPin({
          lat: current.coords.latitude,
          lng: current.coords.longitude,
        });
      }
    } catch (error) {
      // Keep default pin if location fetch fails.
    }

    setIsAddressMapModalVisible(true);
  };

  const handleMapPress = (event: {
    nativeEvent: { coordinate: { latitude: number; longitude: number } };
  }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMapPin({ lat: latitude, lng: longitude });
  };

  const handleUsePinnedAddress = async () => {
    setIsResolvingAddress(true);
    try {
      const reverse = await Location.reverseGeocodeAsync({
        latitude: mapPin.lat,
        longitude: mapPin.lng,
      });
      const first = reverse?.[0];

      if (!first) {
        Alert.alert(
          "Address lookup failed",
          "We couldn't read an address from this pin. Try a nearby road pin.",
        );
        return;
      }

      const postalDigits = (first.postalCode ?? "").replace(/[^0-9]/g, "");

      setAddressParts((prev) => ({
        houseStreet:
          [first.streetNumber, first.street].filter(Boolean).join(" ") ||
          first.name ||
          prev.houseStreet,
        barangay: first.district || prev.barangay,
        cityMunicipality:
          first.city || first.subregion || prev.cityMunicipality,
        province: first.region || prev.province,
        postalCode: postalDigits.slice(0, 4) || prev.postalCode,
      }));

      setIsAddressMapModalVisible(false);
    } catch (error) {
      Alert.alert(
        "Address lookup failed",
        "We couldn't resolve this pinned location. Please try another pin.",
      );
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const handleChangePassword = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsPasswordModalVisible(true);
  };

  const pickAvatar = async (mode: "camera" | "library") => {
    if (!user?.id) {
      Alert.alert(
        "Unable to update",
        "Please sign in again to update your photo.",
      );
      return;
    }

    try {
      setIsAvatarActionPending(true);
      const permission =
        mode === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          mode === "camera"
            ? "Camera access is required to take a profile photo."
            : "Photo library access is required to choose a profile photo.",
        );
        return;
      }

      const pickerResult =
        mode === "camera"
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

      if (pickerResult.canceled) {
        return;
      }

      const selectedUri = pickerResult.assets?.[0]?.uri;
      if (selectedUri) {
        await savePatientAvatarUri(user.id, selectedUri);
        setAvatarUri(selectedUri);
      }
    } catch (error) {
      Alert.alert(
        "Photo error",
        "We couldn't update your photo. Please try again.",
      );
    } finally {
      setIsAvatarActionPending(false);
    }
  };

  const handleAvatarUpdate = () => {
    if (!user) {
      Alert.alert("Not available", "Please log in to update your photo.");
      return;
    }

    Alert.alert("Update photo", "Choose how to update your profile picture", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Take Photo",
        onPress: () => {
          void pickAvatar("camera");
        },
      },
      {
        text: "Choose Photo",
        onPress: () => {
          void pickAvatar("library");
        },
      },
    ]);
  };

  const handleSaveProfile = async () => {
    if (isSavingProfile) {
      return;
    }

    const trimmedName = profileName.trim();
    if (!trimmedName) {
      Alert.alert("Missing info", "Name is required.");
      return;
    }

    const houseStreet = addressParts.houseStreet.trim();
    const barangay = addressParts.barangay.trim();
    const cityMunicipality = addressParts.cityMunicipality.trim();
    const province = addressParts.province.trim();
    const postalCode = addressParts.postalCode.trim();

    if (!houseStreet || !barangay || !cityMunicipality || !postalCode) {
      Alert.alert(
        "Incomplete address",
        "Please fill House/Street, Barangay, City/Municipality, and 4-digit Postal Code.",
      );
      return;
    }

    if (!/^\d{4}$/.test(postalCode)) {
      Alert.alert(
        "Invalid postal code",
        "Postal code must be exactly 4 digits (e.g., 1101).",
      );
      return;
    }

    const normalizedAddress = buildAddressFromParts({
      houseStreet,
      barangay,
      cityMunicipality,
      province,
      postalCode,
    });

    setIsSavingProfile(true);
    const response = await updateProfile({
      name: trimmedName,
      phone: profilePhone,
      address: normalizedAddress,
    });
    setIsSavingProfile(false);

    if (response.success) {
      Alert.alert("Profile updated", response.message);
      setIsEditModalVisible(false);
    } else {
      Alert.alert("Update failed", response.message);
    }
  };

  const handleSubmitPasswordChange = async () => {
    if (isUpdatingPassword) {
      return;
    }

    const trimmedNewPassword = newPassword.trim();
    if (trimmedNewPassword !== confirmPassword.trim()) {
      Alert.alert("Password mismatch", "New passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    const response = await changePassword(currentPassword, trimmedNewPassword);
    setIsUpdatingPassword(false);

    if (response.success) {
      Alert.alert("Password updated", response.message);
      setIsPasswordModalVisible(false);
    } else {
      Alert.alert("Update failed", response.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home-outline" size={24} color="#00BFA6" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
                onError={() => setAvatarUri(null)}
              />
            ) : (
              <Text style={styles.avatarText}>{userInitials}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.editAvatarButton}
            onPress={handleAvatarUpdate}
            disabled={isAvatarActionPending}
          >
            {isAvatarActionPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="camera" size={16} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user?.name || "Patient"}</Text>
        <Text style={styles.userRole}>Patient</Text>
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail" size={20} color="#00BFA6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || "Not set"}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="call" size={20} color="#00BFA6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user?.phone || "Not set"}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="location" size={20} color="#00BFA6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{user?.address || "Not set"}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleEditProfile}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="person-circle-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Edit Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleChangePassword}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="lock-closed-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setIsNotificationsModalVisible(true)}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <View style={styles.settingRight}>
            <Text style={styles.settingValue}>On</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setIsPrivacyModalVisible(true)}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Privacy & Security</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setIsPreferencesModalVisible(true)}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="options-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Preferences</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
      </View>

      {/* Help & Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Help & Support</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setIsHelpModalVisible(true)}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="help-circle-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Help Center</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() =>
            Alert.alert("About", "DentaCore v1.0.0\nYour Dental Care Companion")
          }
        >
          <View style={styles.settingLeft}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color="#666"
            />
            <Text style={styles.settingText}>About DentaCore</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#F44336" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>DentaCore v1.0.0</Text>

      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter your full name"
                value={profileName}
                onChangeText={setProfileName}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                value={profilePhone}
                onChangeText={setProfilePhone}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>House No./Street</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="24 C.V. UP Campus"
                value={addressParts.houseStreet}
                onChangeText={(value) =>
                  handleAddressPartChange("houseStreet", value)
                }
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Barangay</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="UP Campus"
                value={addressParts.barangay}
                onChangeText={(value) =>
                  handleAddressPartChange("barangay", value)
                }
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>City/Municipality</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Quezon City"
                value={addressParts.cityMunicipality}
                onChangeText={(value) =>
                  handleAddressPartChange("cityMunicipality", value)
                }
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Province (if applicable)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Metro Manila"
                value={addressParts.province}
                onChangeText={(value) =>
                  handleAddressPartChange("province", value)
                }
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Postal Code (4 digits)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="1101"
                keyboardType="number-pad"
                maxLength={4}
                value={addressParts.postalCode}
                onChangeText={(value) =>
                  handleAddressPartChange("postalCode", value.replace(/[^0-9]/g, ""))
                }
              />
              <Text style={styles.modalHint}>
                Format saved: House/Street, Barangay, City/Municipality,
                Province, 4-digit Postal Code
              </Text>
            </View>

            <TouchableOpacity
              style={styles.mapPickerButton}
              onPress={() => {
                void handleOpenMapPicker();
              }}
              disabled={isSavingProfile}
            >
              <Ionicons name="map-outline" size={18} color="#0F766E" />
              <Text style={styles.mapPickerButtonText}>
                Pin address on Google Map
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setIsEditModalVisible(false)}
                disabled={isSavingProfile}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimaryButton]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalPrimaryButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isAddressMapModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddressMapModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.mapModalCard}>
            <Text style={styles.modalTitle}>Pin Your Address</Text>
            <Text style={styles.modalDescription}>
              Tap on the map to pin your exact location, then use that pin to
              fill your address fields.
            </Text>

            <MapView
              style={styles.mapPickerView}
              provider={mapProvider as any}
              mapType={Platform.OS === "android" ? "none" : "standard"}
              region={{
                latitude: mapPin.lat,
                longitude: mapPin.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={handleMapPress}
            >
              {Platform.OS === "android" && (
                <UrlTile
                  urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maximumZ={19}
                  flipY={false}
                />
              )}
              <Marker
                coordinate={{ latitude: mapPin.lat, longitude: mapPin.lng }}
              />
            </MapView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setIsAddressMapModalVisible(false)}
                disabled={isResolvingAddress}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimaryButton]}
                onPress={() => {
                  void handleUsePinnedAddress();
                }}
                disabled={isResolvingAddress}
              >
                {isResolvingAddress ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalPrimaryButtonText}>Use This Pin</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isPasswordModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPasswordModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.modalDescription}>
              Enter your current password, then choose a new one at least 6
              characters long.
            </Text>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Current Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  secureTextEntry={!showCurrentPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowCurrentPassword((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showCurrentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                >
                  <Ionicons
                    name={
                      showCurrentPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>New Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowNewPassword((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showNewPassword ? "Hide new password" : "Show new password"
                  }
                >
                  <Ionicons
                    name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Confirm New Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setIsPasswordModalVisible(false)}
                disabled={isUpdatingPassword}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimaryButton]}
                onPress={handleSubmitPasswordChange}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalPrimaryButtonText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isNotificationsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsNotificationsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <ScrollView style={styles.utilityList}>
              {upcomingNotifications.length === 0 ? (
                <Text style={styles.utilityEmptyText}>No notifications yet.</Text>
              ) : (
                upcomingNotifications.map((item) => (
                  <View key={item.id} style={styles.utilityCard}>
                    <Text style={styles.utilityTitle}>{item.title}</Text>
                    <Text style={styles.utilityBody}>{item.body}</Text>
                    <Text style={styles.utilityMeta}>
                      {item.timestamp} · {item.status} · {item.priority}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setIsNotificationsModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isPrivacyModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPrivacyModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Privacy & Security</Text>
            <ScrollView style={styles.utilityList}>
              <View style={styles.utilityCard}>
                <Text style={styles.utilityTitle}>Profile Visibility</Text>
                <TouchableOpacity
                  style={styles.utilityAction}
                  onPress={() => setProfileVisibilityAdminOnly((v) => !v)}
                >
                  <Text style={styles.utilityActionText}>
                    {profileVisibilityAdminOnly ? "Admin-only" : "Visible to others"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.utilityCard}>
                <Text style={styles.utilityTitle}>Location Sharing</Text>
                <TouchableOpacity
                  style={styles.utilityAction}
                  onPress={() => setLocationSharingEnabled((v) => !v)}
                >
                  <Text style={styles.utilityActionText}>
                    {locationSharingEnabled ? "Enabled" : "Disabled"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.utilityCard}>
                <Text style={styles.utilityTitle}>Login Activity</Text>
                {loginActivity.map((item) => (
                  <Text key={item.id} style={styles.utilityMeta}>
                    {item.device} · {item.timestamp} · {item.location}
                  </Text>
                ))}
                <TouchableOpacity
                  style={styles.utilityAction}
                  onPress={() =>
                    Alert.alert("Logged out", "All other active sessions were signed out.")
                  }
                >
                  <Text style={styles.utilityActionText}>Log out from all devices</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setIsPrivacyModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isPreferencesModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPreferencesModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Preferences</Text>
            <View style={styles.utilityCard}>
              <Text style={styles.utilityTitle}>Theme</Text>
              <TouchableOpacity
                style={styles.utilityAction}
                onPress={() => setDarkThemeEnabled((v) => !v)}
              >
                <Text style={styles.utilityActionText}>
                  {darkThemeEnabled ? "Dark" : "Light"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.utilityCard}>
              <Text style={styles.utilityTitle}>Language</Text>
              <TouchableOpacity
                style={styles.utilityAction}
                onPress={() =>
                  setLanguage((prev) => (prev === "English" ? "Filipino" : "English"))
                }
              >
                <Text style={styles.utilityActionText}>{language}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setIsPreferencesModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isHelpModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsHelpModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Help Center</Text>
            <ScrollView style={styles.utilityList}>
              <View style={styles.utilityCard}>
                <Text style={styles.utilityTitle}>FAQs</Text>
                <Text style={styles.utilityMeta}>• How to create an account</Text>
                <Text style={styles.utilityMeta}>• How to book an appointment</Text>
                <Text style={styles.utilityMeta}>• How to cancel or reschedule</Text>
                <Text style={styles.utilityMeta}>• How to ask AI for nearby clinics</Text>
                <Text style={styles.utilityMeta}>• What to do if AI does not understand your question</Text>
                <Text style={styles.utilityMeta}>• Payment or transaction concerns</Text>
              </View>

              <View style={styles.utilityCard}>
                <Text style={styles.utilityTitle}>Policies / Legal</Text>
                <TouchableOpacity
                  style={styles.utilityAction}
                  onPress={() => Alert.alert("Privacy Policy", "Privacy Policy link placeholder")}
                >
                  <Text style={styles.utilityActionText}>Privacy Policy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.utilityAction}
                  onPress={() => Alert.alert("Terms & Conditions", "Terms & Conditions link placeholder")}
                >
                  <Text style={styles.utilityActionText}>Terms & Conditions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.utilityAction}
                  onPress={() => Alert.alert("Data usage", "Data usage / consent info placeholder")}
                >
                  <Text style={styles.utilityActionText}>Data usage / consent info</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setIsHelpModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
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
  navHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  homeButton: {
    padding: 5,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: "bold",
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
  avatarContainer: {
    position: "relative",
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFF",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFF",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1976D2",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#00BFA6",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 5,
  },
  userRole: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
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
    flex: 1,
  },
  settingText: {
    fontSize: 15,
    color: "#333",
    marginLeft: 12,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingValue: {
    fontSize: 14,
    color: "#999",
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: 30,
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
  version: {
    textAlign: "center",
    fontSize: 12,
    color: "#999",
    marginVertical: 30,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 13,
    color: "#555",
    marginBottom: 16,
  },
  modalField: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111",
    backgroundColor: "#FAFAFA",
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  mapPickerButton: {
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#99F6E4",
    backgroundColor: "#F0FDFA",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapPickerButtonText: {
    fontSize: 13,
    color: "#0F766E",
    fontWeight: "600",
  },
  mapModalCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
  },
  mapPickerView: {
    height: 250,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#ECEFF1",
    marginLeft: 10,
  },
  modalButtonText: {
    fontSize: 15,
    color: "#546E7A",
    fontWeight: "600",
  },
  modalPrimaryButton: {
    backgroundColor: "#00BFA6",
  },
  modalPrimaryButtonText: {
    fontSize: 15,
    color: "#FFF",
    fontWeight: "600",
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 8,
    height: 52,
  },
  passwordInput: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
    backgroundColor: "transparent",
  },
  passwordToggle: {
    paddingHorizontal: 8,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  utilityList: {
    maxHeight: 320,
  },
  utilityCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  utilityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  utilityBody: {
    color: "#334155",
    fontSize: 13,
  },
  utilityMeta: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
  },
  utilityEmptyText: {
    color: "#64748B",
    fontSize: 13,
    marginBottom: 10,
  },
  utilityAction: {
    marginTop: 8,
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  utilityActionText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "700",
  },
});
