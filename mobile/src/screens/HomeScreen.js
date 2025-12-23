import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getItems, deleteItem } from '../services/api';
import { colors, spacing, borderRadius, shadows } from '../styles/colors';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [groupedItems, setGroupedItems] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('none');
  const [collapsedSections, setCollapsedSections] = useState(new Set());

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getItems(null, search || null);
      
      const sortedData = [...data].sort((a, b) => {
        if (!a.expiry_date && !b.expiry_date) return 0;
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date) - new Date(b.expiry_date);
      });
      
      setItems(sortedData);
      groupItems(sortedData, groupBy);
    } catch (error) {
      Alert.alert('Error', 'Failed to load items');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, groupBy]);

  const groupItems = (itemsList, groupType) => {
    if (groupType === 'none') {
      setGroupedItems([]);
      return;
    }

    const grouped = {};
    itemsList.forEach(item => {
      const key = groupType === 'location' ? item.location : item.category;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    const sections = Object.keys(grouped)
      .filter(key => grouped[key].length > 0) // Hide empty groups
      .map(key => ({
        title: key,
        data: grouped[key],
        itemCount: grouped[key].length,
      }));

    setGroupedItems(sections);
  };

  const toggleSection = (sectionTitle) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionTitle)) {
        next.delete(sectionTitle);
      } else {
        next.add(sectionTitle);
      }
      return next;
    });
  };

  const getVisibleSections = () => {
    return groupedItems.map(section => ({
      ...section,
      data: collapsedSections.has(section.title) ? [] : section.data,
    }));
  };

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadItems();
    });
    return unsubscribe;
  }, [navigation, loadItems]);

  useEffect(() => {
    groupItems(items, groupBy);
  }, [groupBy, items]);

  // Collapse all sections by default when grouping changes
  useEffect(() => {
    if (groupBy !== 'none') {
      const allTitles = groupedItems.map(s => s.title);
      setCollapsedSections(new Set(allTitles));
    } else {
      setCollapsedSections(new Set());
    }
  }, [groupBy]);

  // Auto-expand sections when search is active and has matches
  useEffect(() => {
    if (search && groupBy !== 'none') {
      const sectionsWithMatches = groupedItems
        .filter(section => section.itemCount > 0)
        .map(section => section.title);

      setCollapsedSections(prev => {
        const next = new Set(prev);
        sectionsWithMatches.forEach(title => next.delete(title));
        return next;
      });
    }
  }, [search, groupedItems, groupBy]);

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 3) return 'critical';
    if (daysUntilExpiry <= 7) return 'warning';
    return 'normal';
  };

  const getExpiryText = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return '⚠️ Expired!';
    if (daysUntilExpiry === 0) return '⚠️ Expires Today!';
    if (daysUntilExpiry === 1) return '⚠️ Expires Tomorrow!';
    if (daysUntilExpiry <= 3) return `⚠️ Expires in ${daysUntilExpiry} days`;
    if (daysUntilExpiry <= 7) return `Expires in ${daysUntilExpiry} days`;
    return null;
  };

  const getExpiryStyle = (status) => {
    switch (status) {
      case 'expired':
      case 'critical':
        return { borderColor: colors.error, borderWidth: 2 };
      case 'warning':
        return { borderColor: colors.warning, borderWidth: 2 };
      default:
        return { borderColor: colors.border, borderWidth: 1 };
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(id);
              loadItems();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const expiryStatus = getExpiryStatus(item.expiry_date);
    const expiryText = getExpiryText(item.expiry_date);
    const expiryStyle = getExpiryStyle(expiryStatus);

    return (
      <TouchableOpacity
        style={[styles.itemCard, expiryStyle]}
        onPress={() => navigation.navigate('ItemDetail', { item })}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        </View>

        <View style={styles.itemDetails}>
          <Text style={styles.detailText}>📍 {item.location}</Text>
          <Text style={styles.detailText}>× {item.quantity}</Text>
        </View>

        {expiryText && (
          <Text style={[
            styles.expiryText,
            expiryStatus === 'expired' || expiryStatus === 'critical' 
              ? styles.expiryTextCritical 
              : styles.expiryTextWarning
          ]}>
            {expiryText}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title, itemCount } }) => {
    const isCollapsed = collapsedSections.has(title);
    return (
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(title)}
        activeOpacity={0.7}
      >
        <Text style={styles.sectionChevron}>{isCollapsed ? '▶' : '▼'}</Text>
        <Text style={styles.sectionTitle}>
          {title} ({itemCount || 0})
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>🥫 PantryPal</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Group By Toggle */}
      <View style={styles.groupByContainer}>
        <TouchableOpacity
          style={[styles.groupButton, groupBy === 'none' && styles.groupButtonActive]}
          onPress={() => setGroupBy('none')}
        >
          <Text style={[styles.groupButtonText, groupBy === 'none' && styles.groupButtonTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.groupButton, groupBy === 'location' && styles.groupButtonActive]}
          onPress={() => setGroupBy('location')}
        >
          <Text style={[styles.groupButtonText, groupBy === 'location' && styles.groupButtonTextActive]}>
            📍 Location
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.groupButton, groupBy === 'category' && styles.groupButtonActive]}
          onPress={() => setGroupBy('category')}
        >
          <Text style={[styles.groupButtonText, groupBy === 'category' && styles.groupButtonTextActive]}>
            🏷️ Category
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      {groupBy === 'none' ? (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadItems();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {loading ? 'Loading...' : 'No items found'}
            </Text>
          }
        />
      ) : (
        <SectionList
          sections={getVisibleSections()}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadItems();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {loading ? 'Loading...' : 'No items found'}
            </Text>
          }
        />
      )}

      {/* Gradient Scan Button - Floating */}
      <View style={styles.scanButtonContainer}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.scanButtonGradient}
        >
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => navigation.navigate('Scanner')}
          >
            <Text style={styles.scanButtonText}>📷 Scan Barcode</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Manual Add Button */}
        <TouchableOpacity
          style={styles.manualAddButton}
          onPress={() => navigation.navigate('ManualAdd')}
        >
          <Text style={styles.manualAddText}>➕ Add Manually</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  settingsButton: {
    padding: spacing.sm,
  },
  settingsIcon: {
    fontSize: 24,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupByContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  groupButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  groupButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  groupButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  groupButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 200,
  },
  sectionHeader: {
    backgroundColor: colors.lightBackground,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionChevron: {
    fontSize: 14,
    color: colors.textDark,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  itemBrand: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  categoryBadge: {
    backgroundColor: colors.lightBackground,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: 12,
    color: colors.textDark,
    fontWeight: '600',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  expiryText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: spacing.sm,
  },
  expiryTextCritical: {
    color: colors.error,
  },
  expiryTextWarning: {
    color: colors.warning,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: spacing.xl,
  },
  scanButtonContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
  },
  scanButtonGradient: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.large,
  },
  scanButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  manualAddButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.medium,
  },
  manualAddText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});