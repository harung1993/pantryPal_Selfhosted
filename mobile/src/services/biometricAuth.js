import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = 'BIOMETRIC_ENABLED';
const CREDENTIALS_KEY = 'USER_CREDENTIALS';

/**
 * Check if device supports biometric authentication
 */
export async function isBiometricSupported() {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    return compatible;
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return false;
  }
}

/**
 * Check if biometric is enrolled (user has set up fingerprint/face)
 */
export async function isBiometricEnrolled() {
  try {
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch (error) {
    console.error('Error checking biometric enrollment:', error);
    return false;
  }
}

/**
 * Get available biometric types
 */
export async function getBiometricTypes() {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types;
  } catch (error) {
    console.error('Error getting biometric types:', error);
    return [];
  }
}

/**
 * Get human-readable name for biometric type
 */
export function getBiometricName(types) {
  if (!types || types.length === 0) return 'Biometric';

  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Touch ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris';
  }
  return 'Biometric';
}

/**
 * Check if biometric login is enabled by user
 */
export async function isBiometricEnabled() {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking biometric enabled status:', error);
    return false;
  }
}

/**
 * Enable or disable biometric login
 */
export async function setBiometricEnabled(enabled) {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    return true;
  } catch (error) {
    console.error('Error setting biometric enabled status:', error);
    return false;
  }
}

/**
 * Save credentials securely for biometric login
 */
export async function saveCredentials(username, password) {
  try {
    const credentials = JSON.stringify({ username, password });
    await SecureStore.setItemAsync(CREDENTIALS_KEY, credentials);
    return true;
  } catch (error) {
    console.error('Error saving credentials:', error);
    return false;
  }
}

/**
 * Get saved credentials (returns null if not found)
 */
export async function getSavedCredentials() {
  try {
    const credentials = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    if (credentials) {
      return JSON.parse(credentials);
    }
    return null;
  } catch (error) {
    console.error('Error getting saved credentials:', error);
    return null;
  }
}

/**
 * Delete saved credentials
 */
export async function deleteCredentials() {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    await setBiometricEnabled(false);
    return true;
  } catch (error) {
    console.error('Error deleting credentials:', error);
    return false;
  }
}

/**
 * Authenticate with biometrics
 */
export async function authenticateWithBiometrics(promptMessage = 'Authenticate to access PantryPal') {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // Allow PIN/password fallback
      fallbackLabel: 'Use password',
    });

    return result.success;
  } catch (error) {
    console.error('Error authenticating with biometrics:', error);
    return false;
  }
}

/**
 * Full biometric login flow
 * Returns { success: boolean, credentials: { username, password } | null }
 */
export async function performBiometricLogin() {
  try {
    // Check if biometric is enabled
    const enabled = await isBiometricEnabled();
    if (!enabled) {
      return { success: false, credentials: null };
    }

    // Check if credentials are saved
    const credentials = await getSavedCredentials();
    if (!credentials) {
      return { success: false, credentials: null };
    }

    // Authenticate with biometrics
    const authenticated = await authenticateWithBiometrics('Login to PantryPal');
    if (!authenticated) {
      return { success: false, credentials: null };
    }

    // Return credentials for auto-login
    return { success: true, credentials };
  } catch (error) {
    console.error('Error performing biometric login:', error);
    return { success: false, credentials: null };
  }
}
