import AsyncStorage from "@react-native-async-storage/async-storage";

const buildStorageKey = (userId: string): string => `patient-avatar:${userId}`;

type AvatarListener = (payload: { userId: string; uri: string | null }) => void;

const avatarListeners = new Set<AvatarListener>();

export const subscribeToPatientAvatar = (
  listener: AvatarListener,
): (() => void) => {
  avatarListeners.add(listener);
  return () => avatarListeners.delete(listener);
};

const notifyAvatarListeners = (userId: string, uri: string | null): void => {
  avatarListeners.forEach((listener) => {
    try {
      listener({ userId, uri });
    } catch (error) {
      // swallow listener errors to avoid breaking emit loop
    }
  });
};

export const getPatientAvatarUri = async (
  userId: string | undefined | null,
): Promise<string | null> => {
  if (!userId) {
    return null;
  }

  try {
    const storedValue = await AsyncStorage.getItem(buildStorageKey(userId));
    return storedValue ?? null;
  } catch (error) {
    return null;
  }
};

export const savePatientAvatarUri = async (
  userId: string,
  uri: string | null,
): Promise<void> => {
  const storageKey = buildStorageKey(userId);
  try {
    if (uri) {
      await AsyncStorage.setItem(storageKey, uri);
    } else {
      await AsyncStorage.removeItem(storageKey);
    }
  } finally {
    notifyAvatarListeners(userId, uri);
  }
};
