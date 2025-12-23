import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius, shadows } from '../styles/colors';
import { resetApiInstance } from '../services/api';

export default function LandingScreen({ navigation }) {
  const [serverConfigured, setServerConfigured] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    checkServerConfig();
  }, []);

  const checkServerConfig = async () => {
    const stored = await AsyncStorage.getItem('API_BASE_URL');
    if (stored) {
      setServerUrl(stored);
      setServerConfigured(true);
    }
  };

  const handleConfigureServer = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
    
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      Alert.alert('Invalid URL', 'URL must start with http:// or https://');
      return;
    }

    await AsyncStorage.setItem('API_BASE_URL', cleanUrl);
    resetApiInstance(); // Reset API client to pick up new URL
    setServerConfigured(true);
    Alert.alert('Success', '✅ Server configured!\n\nYou can now sign in or sign up.');
  };

  if (!serverConfigured) {
    // Server configuration view
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.icon}>🥫</Text>
          <Text style={styles.title}>PantryPal</Text>
          <Text style={styles.subtitle}>Part of PalStack</Text>
        </View>

        <View style={styles.configCard}>
          <Text style={styles.configTitle}>Connect to PantryPal</Text>
          <Text style={styles.configSubtitle}>
            Enter your PantryPal server URL
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.100"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.hint}>
              Examples:{'\n'}
              • http://192.168.68.119{'\n'}
              • http://macmini.local{'\n'}
              • https://pantrypal.example.com
            </Text>
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleConfigureServer}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>

          <View style={styles.helperBox}>
            <Text style={styles.helperText}>
              💡 This is the URL where your PantryPal backend is running.{'\n'}
              You can find this in your server setup or network settings.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Main landing view (after server is configured)
  return (
    <View style={styles.container}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.icon}>🥫</Text>
        <Text style={styles.title}>PantryPal</Text>
        <Text style={styles.subtitle}>Part of PalStack</Text>
        <Text style={styles.tagline}>Never let food go to waste</Text>
      </View>

      {/* Auth Buttons */}
      <View style={styles.authButtons}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.getStartedButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>

      {/* Change Server Link */}
      <TouchableOpacity
        onPress={async () => {
          await AsyncStorage.removeItem('API_BASE_URL');
          resetApiInstance();
          setServerConfigured(false);
          setServerUrl('');
        }}
        style={styles.serverLinkContainer}
      >
        <Text style={styles.serverLinkText}>Self-hosting? Configure server</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  icon: {
    fontSize: 100,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 52,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textPrimary,
    opacity: 0.85,
    marginBottom: spacing.md,
  },
  tagline: {
    fontSize: 20,
    color: colors.textPrimary,
    opacity: 0.9,
    textAlign: 'center',
  },
  authButtons: {
    marginBottom: spacing.xl,
  },
  getStartedButton: {
    backgroundColor: colors.accent,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.large,
  },
  getStartedButtonText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: 'transparent',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
  loginButtonText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  serverLinkContainer: {
    alignItems: 'center',
    padding: spacing.md,
  },
  serverLinkText: {
    color: colors.textPrimary,
    fontSize: 14,
    opacity: 0.7,
    textDecorationLine: 'underline',
  },
  configCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.large,
  },
  configTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  configSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
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
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.medium,
    marginBottom: spacing.md,
  },
  continueButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  changeServerText: {
    color: colors.textPrimary,
    fontSize: 14,
    opacity: 0.7,
  },
});