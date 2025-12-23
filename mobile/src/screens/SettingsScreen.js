import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch, LayoutAnimation
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../styles/colors';
import api from '../services/api';
import { getDefaultLocations, getDefaultCategories, saveDefaultLocations, saveDefaultCategories, DEFAULT_LOCATIONS, DEFAULT_CATEGORIES } from '../utils/defaults';
import {
  isBiometricSupported,
  isBiometricEnrolled,
  isBiometricEnabled,
  setBiometricEnabled,
  getBiometricTypes,
  getBiometricName,
  deleteCredentials
} from '../services/biometricAuth';

export default function SettingsScreen({ navigation, currentUser, onLogout }) {
  // Connection settings
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [useApiKey, setUseApiKey] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState({ email: '', full_name: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    current_password: '', new_password: '', confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Admin state
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  
  // Invite user state
  const [inviteData, setInviteData] = useState({
    username: '', email: '', full_name: '', password: ''
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  // Preferences state
  const [locations, setLocations] = useState(DEFAULT_LOCATIONS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [editingLocation, setEditingLocation] = useState(null);
  const [editLocationValue, setEditLocationValue] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [biometricToggle, setBiometricToggle] = useState(false);

  // Collapsed sections state
  const [collapsedSections, setCollapsedSections] = useState(new Set([
    'connection', 'security', 'profile', 'password', 'stats', 'invite', 'users', 'preferences', 'about'
  ]));

  // Check if user is logged in
  const isActualUser = !!currentUser; // Any logged in user
  const isAdmin = currentUser?.is_admin;

  useEffect(() => {
    loadConnectionSettings();
    loadPreferences();
    loadBiometricSettings();

    // Only load profile for actual logged-in users
    if (isActualUser) {
      loadProfile();
      if (isAdmin) {
        loadUsers();
        loadStats();
      }
    }
  }, [currentUser, isActualUser, isAdmin]);

  const loadConnectionSettings = async () => {
    const url = await AsyncStorage.getItem('API_BASE_URL');
    const key = await AsyncStorage.getItem('API_KEY');
    setServerUrl(url || '');
    setApiKey(key || '');
    setUseApiKey(!!key);
  };

  const saveConnectionSettings = async () => {
    try {
      if (!serverUrl.trim()) {
        Alert.alert('Error', 'Please enter a server URL');
        return;
      }
      await AsyncStorage.setItem('API_BASE_URL', serverUrl);
      if (useApiKey && apiKey) {
        await AsyncStorage.setItem('API_KEY', apiKey);
      } else {
        await AsyncStorage.removeItem('API_KEY');
      }
      Alert.alert('Success', 'Connection settings saved. Please restart the app.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const loadProfile = async () => {
    try {
      const data = await api.get('/api/users/me');
      setProfile({ email: data.email || '', full_name: data.full_name || '' });
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleUpdateProfile = async () => {
    setProfileLoading(true);
    try {
      await api.patch('/api/users/me', profile);
      Alert.alert('Success', '✅ Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (passwordData.new_password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    setPasswordLoading(true);
    try {
      await api.post('/api/users/me/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      Alert.alert('Success', '✅ Password changed successfully');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const loadUsers = async () => {
    setAdminLoading(true);
    try {
      const data = await api.get('/api/admin/users');
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } finally {
      setAdminLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.get('/api/admin/stats');
      setStats(data || null);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteData.username || !inviteData.email || !inviteData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (inviteData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    
    setInviteLoading(true);
    try {
      await api.post('/api/auth/register', inviteData);
      Alert.alert('Success', `✅ User ${inviteData.username} created successfully!`);
      setInviteData({ username: '', email: '', full_name: '', password: '' });
      loadUsers();
      loadStats();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create user');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.patch(`/api/admin/users/${userId}`, { is_active: !currentStatus });
      loadUsers();
      loadStats();
      Alert.alert('Success', `User ${currentStatus ? 'disabled' : 'enabled'} successfully`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete "${username}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/users/${userId}`);
              loadUsers();
              loadStats();
              Alert.alert('Success', 'User deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  // Preferences functions
  const loadPreferences = async () => {
    const locs = await getDefaultLocations();
    const cats = await getDefaultCategories();
    setLocations(locs);
    setCategories(cats);
  };

  const addLocation = () => {
    if (newLocation.trim() && !locations.includes(newLocation.trim())) {
      setLocations([...locations, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const removeLocation = (location) => {
    setLocations(locations.filter(l => l !== location));
  };

  const startEditLocation = (location) => {
    setEditingLocation(location);
    setEditLocationValue(location);
  };

  const saveEditLocation = () => {
    if (editLocationValue.trim() && editLocationValue.trim() !== editingLocation) {
      const updatedLocations = locations.map(l =>
        l === editingLocation ? editLocationValue.trim() : l
      );
      setLocations(updatedLocations);
    }
    setEditingLocation(null);
    setEditLocationValue('');
  };

  const cancelEditLocation = () => {
    setEditingLocation(null);
    setEditLocationValue('');
  };

  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const removeCategory = (category) => {
    setCategories(categories.filter(c => c !== category));
  };

  const startEditCategory = (category) => {
    setEditingCategory(category);
    setEditCategoryValue(category);
  };

  const saveEditCategory = () => {
    if (editCategoryValue.trim() && editCategoryValue.trim() !== editingCategory) {
      const updatedCategories = categories.map(c =>
        c === editingCategory ? editCategoryValue.trim() : c
      );
      setCategories(updatedCategories);
    }
    setEditingCategory(null);
    setEditCategoryValue('');
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryValue('');
  };

  const savePreferences = async () => {
    try {
      await saveDefaultLocations(locations);
      await saveDefaultCategories(categories);
      Alert.alert('Success', '✅ Preferences saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  const loadBiometricSettings = async () => {
    const supported = await isBiometricSupported();
    const enrolled = await isBiometricEnrolled();

    if (supported && enrolled) {
      const types = await getBiometricTypes();
      const name = getBiometricName(types);
      setBiometricType(name);
      setBiometricAvailable(true);

      const enabled = await isBiometricEnabled();
      setBiometricToggle(enabled);
    } else {
      setBiometricAvailable(false);
    }
  };

  const handleBiometricToggle = async (value) => {
    if (value) {
      // Enabling biometric - need to prompt for password to save credentials
      Alert.alert(
        `Enable ${biometricType}`,
        'To enable biometric login, you need to log out and log back in.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'OK',
            onPress: () => {
              Alert.alert('Info', 'Please log out and log back in to enable biometric login.');
            }
          }
        ]
      );
    } else {
      // Disabling biometric
      Alert.alert(
        `Disable ${biometricType}`,
        'This will remove your saved credentials. You will need to enter your password manually next time.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              const success = await deleteCredentials();
              if (success) {
                setBiometricToggle(false);
                Alert.alert('Success', `${biometricType} login disabled`);
              } else {
                Alert.alert('Error', 'Failed to disable biometric login');
              }
            }
          }
        ]
      );
    }
  };

  const toggleSection = (sectionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* User Info Bar */}
      {currentUser && (
        <View style={styles.userInfo}>
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>{currentUser.username}</Text>
            {currentUser.email && (
              <Text style={styles.userEmail}>{currentUser.email}</Text>
            )}
          </View>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* CONNECTION SECTION */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeaderClickable}
            onPress={() => toggleSection('connection')}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>
              {collapsedSections.has('connection') ? '▶' : '▼'} 🌐 Connection
            </Text>
          </TouchableOpacity>

          {!collapsedSections.has('connection') && (
            <>
              <Text style={styles.sectionDescription}>Configure your PantryPal server connection</Text>

              <View style={styles.inputGroup}>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.100"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Use API Key</Text>
            <Switch
              value={useApiKey}
              onValueChange={setUseApiKey}
              trackColor={{ false: '#d1d5db', true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          {useApiKey && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>API Key</Text>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Enter your API key"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

              <TouchableOpacity style={styles.button} onPress={saveConnectionSettings}>
                <Text style={styles.buttonText}>💾 Save Connection</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* SECURITY SECTION - Only for actual logged in users */}
        {isActualUser && biometricAvailable && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeaderClickable}
              onPress={() => toggleSection('security')}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>
                {collapsedSections.has('security') ? '▶' : '▼'} 🔐 Security
              </Text>
            </TouchableOpacity>

            {!collapsedSections.has('security') && (
              <>
                <Text style={styles.sectionDescription}>Manage your security settings</Text>

                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{biometricType} Login</Text>
                    <Text style={styles.hint}>
                      Use {biometricType} for quick and secure access
                    </Text>
                  </View>
                  <Switch
                    value={biometricToggle}
                    onValueChange={handleBiometricToggle}
                    trackColor={{ false: '#d1d5db', true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>

                {biometricToggle && (
                  <View style={[styles.infoBox, { backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.md }]}>
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                      ✓ {biometricType} is enabled{'\n'}
                      Your credentials are stored securely on this device
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* PROFILE SECTION - Only for actual logged in users */}
        {isActualUser && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeaderClickable}
              onPress={() => toggleSection('profile')}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>
                {collapsedSections.has('profile') ? '▶' : '▼'} 👤 My Profile
              </Text>
            </TouchableOpacity>

            {!collapsedSections.has('profile') && (
              <>
                <Text style={styles.sectionDescription}>Update your account information</Text>

                <View style={styles.inputGroup}>
              <Text style={styles.label}>Username (read-only)</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={currentUser.username}
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>📧 Email Address</Text>
              <TextInput
                style={styles.input}
                value={profile.email}
                onChangeText={(text) => setProfile({ ...profile, email: text })}
                placeholder="your.email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={profile.full_name}
                onChangeText={(text) => setProfile({ ...profile, full_name: text })}
                placeholder="John Doe"
              />
            </View>

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleUpdateProfile}
                  disabled={profileLoading}
                >
                  {profileLoading ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.buttonText}>💾 Save Changes</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* PASSWORD SECTION - Only for actual logged in users */}
        {isActualUser && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeaderClickable}
              onPress={() => toggleSection('password')}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>
                {collapsedSections.has('password') ? '▶' : '▼'} 🔒 Change Password
              </Text>
            </TouchableOpacity>

            {!collapsedSections.has('password') && (
              <>
                <View style={styles.sectionHeader}>
                  <View />
                  <TouchableOpacity onPress={() => setShowPasswords(!showPasswords)}>
                    <Text style={styles.showPasswordText}>
                      {showPasswords ? '🙈 Hide' : '👁️ Show'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={passwordData.current_password}
                onChangeText={(text) => setPasswordData({ ...passwordData, current_password: text })}
                placeholder="Enter current password"
                secureTextEntry={!showPasswords}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                value={passwordData.new_password}
                onChangeText={(text) => setPasswordData({ ...passwordData, new_password: text })}
                placeholder="Enter new password"
                secureTextEntry={!showPasswords}
                autoCapitalize="none"
              />
              <Text style={styles.hint}>Minimum 8 characters</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={passwordData.confirm_password}
                onChangeText={(text) => setPasswordData({ ...passwordData, confirm_password: text })}
                placeholder="Confirm new password"
                secureTextEntry={!showPasswords}
                autoCapitalize="none"
              />
            </View>

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleChangePassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.buttonText}>🔑 Change Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ADMIN SECTION */}
        {isAdmin && (
          <>
            {/* Stats */}
            {stats && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.sectionHeaderClickable}
                  onPress={() => toggleSection('stats')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionTitle}>
                    {collapsedSections.has('stats') ? '▶' : '▼'} 📊 Statistics
                  </Text>
                </TouchableOpacity>

                {!collapsedSections.has('stats') && (
                  <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.total_users}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.active_users}</Text>
                    <Text style={styles.statLabel}>Active</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.inactive_users}</Text>
                    <Text style={styles.statLabel}>Inactive</Text>
                  </View>
                    <View style={styles.statCard}>
                      <Text style={[styles.statValue, { color: colors.primary }]}>{stats.admin_users}</Text>
                      <Text style={styles.statLabel}>Admins</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Invite User */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeaderClickable}
                onPress={() => toggleSection('invite')}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>
                  {collapsedSections.has('invite') ? '▶' : '▼'} ➕ Invite User
                </Text>
              </TouchableOpacity>

              {!collapsedSections.has('invite') && (
                <>
                  <Text style={styles.sectionDescription}>Create a new user account</Text>

                  <View style={styles.inputGroup}>
                <Text style={styles.label}>Username *</Text>
                <TextInput
                  style={styles.input}
                  value={inviteData.username}
                  onChangeText={(text) => setInviteData({ ...inviteData, username: text })}
                  placeholder="username"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={inviteData.email}
                  onChangeText={(text) => setInviteData({ ...inviteData, email: text })}
                  placeholder="user@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={inviteData.full_name}
                  onChangeText={(text) => setInviteData({ ...inviteData, full_name: text })}
                  placeholder="John Doe"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={inviteData.password}
                  onChangeText={(text) => setInviteData({ ...inviteData, password: text })}
                  placeholder="Min 8 characters"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleInviteUser}
                    disabled={inviteLoading}
                  >
                    {inviteLoading ? (
                      <ActivityIndicator color={colors.textPrimary} />
                    ) : (
                      <Text style={styles.buttonText}>✉️ Create User</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* User Management */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeaderClickable}
                onPress={() => toggleSection('users')}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>
                  {collapsedSections.has('users') ? '▶' : '▼'} 👥 User Management
                </Text>
              </TouchableOpacity>

              {!collapsedSections.has('users') && (
                <>
                  {adminLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.xl }} />
              ) : users.length === 0 ? (
                <Text style={styles.emptyText}>No users found</Text>
              ) : (
                users.map((user) => (
                  <View key={user.id} style={styles.userCard}>
                    <View style={styles.userCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.userCardName}>
                          {user.username}
                          {user.is_admin && <Text style={{ color: colors.primary }}> (Admin)</Text>}
                        </Text>
                        <Text style={styles.userCardEmail}>{user.email}</Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: user.is_active ? '#10b981' : '#ef4444' }
                      ]}>
                        <Text style={styles.statusBadgeText}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.userCardActions}>
                      <TouchableOpacity
                        style={[styles.userActionButton, { backgroundColor: user.is_active ? '#fef3c7' : '#d1fae5' }]}
                        onPress={() => handleToggleUserStatus(user.id, user.is_active)}
                      >
                        <Text style={[styles.userActionButtonText, { color: user.is_active ? '#92400e' : '#065f46' }]}>
                          {user.is_active ? 'Disable' : 'Enable'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.userActionButton, { backgroundColor: '#fee2e2' }]}
                        onPress={() => handleDeleteUser(user.id, user.username)}
                      >
                        <Text style={[styles.userActionButtonText, { color: '#991b1b' }]}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                    </View>
                  ))
                )}
                </>
              )}
            </View>
          </>
        )}

        {/* PREFERENCES SECTION */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeaderClickable}
            onPress={() => toggleSection('preferences')}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>
              {collapsedSections.has('preferences') ? '▶' : '▼'} ⚙️ Preferences
            </Text>
          </TouchableOpacity>

          {!collapsedSections.has('preferences') && (
            <>
              <Text style={styles.sectionDescription}>Manage default locations and categories</Text>

              {/* Locations */}
              <Text style={[styles.label, { marginTop: spacing.lg }]}>📍 Default Locations</Text>
          {locations.map((location, index) => (
            <View key={index} style={styles.preferenceItem}>
              {editingLocation === location ? (
                <View style={{ flex: 1, flexDirection: 'row', gap: spacing.sm }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={editLocationValue}
                    onChangeText={setEditLocationValue}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: colors.primary }]}
                    onPress={saveEditLocation}
                  >
                    <Text style={[styles.smallButtonText, { color: '#ffffff' }]}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: colors.border }]}
                    onPress={cancelEditLocation}
                  >
                    <Text style={styles.smallButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.preferenceText}>{location}</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => startEditLocation(location)}
                    >
                      <Text style={{ fontSize: 18, color: colors.textSecondary }}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => removeLocation(location)}
                    >
                      <Text style={{ fontSize: 20, color: '#ef4444' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))}

          <View style={styles.addItemRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newLocation}
              onChangeText={setNewLocation}
              placeholder="New location name"
              placeholderTextColor={colors.textTertiary}
            />
            <TouchableOpacity style={styles.addButton} onPress={addLocation}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <Text style={[styles.label, { marginTop: spacing.xl }]}>🏷️ Default Categories</Text>
          {categories.map((category, index) => (
            <View key={index} style={styles.preferenceItem}>
              {editingCategory === category ? (
                <View style={{ flex: 1, flexDirection: 'row', gap: spacing.sm }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={editCategoryValue}
                    onChangeText={setEditCategoryValue}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: colors.primary }]}
                    onPress={saveEditCategory}
                  >
                    <Text style={[styles.smallButtonText, { color: '#ffffff' }]}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: colors.border }]}
                    onPress={cancelEditCategory}
                  >
                    <Text style={styles.smallButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.preferenceText}>{category}</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => startEditCategory(category)}
                    >
                      <Text style={{ fontSize: 18, color: colors.textSecondary }}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => removeCategory(category)}
                    >
                      <Text style={{ fontSize: 20, color: '#ef4444' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))}

          <View style={styles.addItemRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="New category name"
              placeholderTextColor={colors.textTertiary}
            />
            <TouchableOpacity style={styles.addButton} onPress={addCategory}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

              <TouchableOpacity style={styles.button} onPress={savePreferences}>
                <Text style={styles.buttonText}>💾 Save Preferences</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* LOGOUT SECTION - Only for actual logged in users */}
        {isActualUser && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.button, styles.logoutButton]}
              onPress={onLogout}
            >
              <Text style={[styles.buttonText, { color: '#ffffff' }]}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ABOUT SECTION */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeaderClickable}
            onPress={() => toggleSection('about')}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>
              {collapsedSections.has('about') ? '▶' : '▼'} ℹ️ About PantryPal
            </Text>
          </TouchableOpacity>

          {!collapsedSections.has('about') && (
            <>
              <Text style={styles.aboutText}>Version 1.3.0</Text>
              <Text style={styles.aboutText}>
                Self-hosted pantry management for your home.{'\n'}
                Part of the PalStack ecosystem.
              </Text>
              <Text style={[styles.aboutText, { fontStyle: 'italic', marginTop: spacing.md }]}>
                "That's what pals do – they show up and help with the everyday stuff."
              </Text>
            </>
          )}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: spacing.xl,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  userInfo: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  adminBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  adminBadgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.card,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  sectionHeaderClickable: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: colors.textSecondary,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    marginTop: 0,
  },
  showPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    marginHorizontal: -spacing.xs,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    margin: spacing.xs,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  userCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  userCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  userCardEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  userCardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  userActionButton: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  userActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
    paddingVertical: spacing.xl,
  },
  aboutText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  preferenceText: {
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
  },
  iconButton: {
    padding: spacing.xs,
  },
  smallButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  addItemRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});