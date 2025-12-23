import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius, shadows } from '../styles/colors';
import { getApiBaseUrl } from '../../config';
import api from '../services/api';
import {
  isBiometricSupported,
  isBiometricEnrolled,
  getBiometricTypes,
  getBiometricName,
  saveCredentials,
  setBiometricEnabled,
  performBiometricLogin,
  isBiometricEnabled
} from '../services/biometricAuth';

// Helper function to add timeout to fetch requests
const fetchWithTimeout = async (url, options = {}, timeoutMs = 3000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
};

export default function LoginScreen({ navigation, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricName, setBiometricName] = useState('Biometric');

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const enabled = await isBiometricEnabled();
    const supported = await isBiometricSupported();
    const enrolled = await isBiometricEnrolled();

    if (enabled && supported && enrolled) {
      const types = await getBiometricTypes();
      const name = getBiometricName(types);
      setBiometricName(name);
      setBiometricAvailable(true);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);

    try {
      const result = await performBiometricLogin();

      if (result.success && result.credentials) {
        // Attempt to login with saved credentials
        const baseURL = await getApiBaseUrl();
        const response = await fetchWithTimeout(`${baseURL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.credentials)
        });

        const data = await response.json();

        if (response.ok) {
          await AsyncStorage.setItem('SESSION_TOKEN', data.session_token);
          api.resetApiInstance();
          onLoginSuccess(data.user);
        } else {
          Alert.alert('Login Failed', 'Saved credentials are invalid. Please sign in manually.');
        }
      } else {
        Alert.alert('Authentication Failed', `${biometricName} authentication was cancelled or failed.`);
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert('Error', 'Could not complete biometric login. Please try signing in manually.');
    } finally {
      setLoading(false);
    }
  };

  const promptBiometricEnrollment = async (username, password) => {
    const supported = await isBiometricSupported();
    const enrolled = await isBiometricEnrolled();

    if (!supported || !enrolled) {
      return; // Device doesn't support biometrics or user hasn't set it up
    }

    const types = await getBiometricTypes();
    const biometricName = getBiometricName(types);

    Alert.alert(
      `Enable ${biometricName}?`,
      `Use ${biometricName} for quick login next time?`,
      [
        {
          text: 'Not Now',
          style: 'cancel'
        },
        {
          text: 'Enable',
          onPress: async () => {
            const saved = await saveCredentials(username, password);
            if (saved) {
              await setBiometricEnabled(true);
              Alert.alert('Success', `${biometricName} login enabled!`);
            } else {
              Alert.alert('Error', 'Failed to save credentials');
            }
          }
        }
      ]
    );
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);

    try {
      const baseURL = await getApiBaseUrl();
      const response = await fetchWithTimeout(`${baseURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store session token
        await AsyncStorage.setItem('SESSION_TOKEN', data.session_token);

        // CRITICAL: Reset API instance so it picks up the new session token
        api.resetApiInstance();

        // Prompt for biometric enrollment
        await promptBiometricEnrollment(username.trim(), password);

        // Navigate to app
        onLoginSuccess(data.user);
      } else {
        Alert.alert('Login Failed', data.detail || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Connection Error', 'Could not reach server. Check your connection settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.icon}>🥫</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to PantryPal</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.showPasswordButton}
              >
                <Text style={styles.showPasswordText}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {biometricAvailable && (
            <>
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity
                style={[styles.biometricButton, loading && styles.loginButtonDisabled]}
                onPress={handleBiometricLogin}
                disabled={loading}
              >
                <Text style={styles.biometricIcon}>
                  {biometricName.includes('Face') ? '👤' : '👆'}
                </Text>
                <Text style={styles.biometricButtonText}>
                  Sign in with {biometricName}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.signupPrompt}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  backText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textPrimary,
    opacity: 0.9,
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.large,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 2,
    borderColor: colors.border,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: spacing.sm,
  },
  showPasswordText: {
    fontSize: 20,
  },
  forgotButton: {
    marginBottom: spacing.lg,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.medium,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  biometricButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...shadows.medium,
  },
  biometricIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  biometricButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  signupText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  signupLink: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});