// --- START OF FILE AdminDashboardScreen.js ---
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons'; // For icons

// Conceptual Theme (subset for this file)
const THEME_COLORS = {
  primary: '#0033cc',
  secondary: '#0056b3', // You can use this for the new "Manage Employees" icon if desired
  text: '#333333',
  lightText: '#6c757d',
  background: '#F0F2F5',
  surface: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000', // For iOS shadow
  // danger: '#dc3545', // Keep if you had a remove user card directly here before
};
const THEME_SIZES = {
  padding: 16,
  radius: 12, // Larger radius for cards
  h2: 24,
  body: 16,
  caption: 12, // Added for card description
};

// Custom Header Button Component (Can be moved to a common file)
const HeaderButton = ({ title, onPress, iconName }) => (
  <TouchableOpacity onPress={onPress} style={styles.headerButton}>
    {iconName && <MaterialIcons name={iconName} size={22} color={THEME_COLORS.primary} style={{ marginRight: title ? 5 : 0 }} />}
    {title && <Text style={styles.headerButtonText}>{title}</Text>}
  </TouchableOpacity>
);

// Dashboard Action Card Component
// Added iconColor prop to allow different colors for icons if needed
const ActionCard = ({ title, iconName, onPress, description, iconColor }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.cardIconContainer}>
        <MaterialIcons name={iconName} size={36} color={iconColor || THEME_COLORS.primary} style={styles.cardIcon} />
    </View>
    <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle}>{title}</Text>
        {description && <Text style={styles.cardDescription}>{description}</Text>}
    </View>
    <MaterialIcons name="chevron-right" size={24} color={THEME_COLORS.lightText} style={styles.cardChevron} />
  </TouchableOpacity>
);

export default function AdminDashboardScreen({ navigation }) {
  const deleteStoredItems = async () => {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem('adminToken'); localStorage.removeItem('adminUser'); }
      catch (e) { console.error('[DASHBOARD_SIGN_OUT_WEB] localStorage remove error', e); }
    } else {
      try { const SecureStore = require('expo-secure-store'); await SecureStore.deleteItemAsync('adminToken'); await SecureStore.deleteItemAsync('adminUser'); }
      catch (e) { console.error('[DASHBOARD_SIGN_OUT_NATIVE] SecureStore remove error', e); }
    }
  };

  const handleSignOut = async () => {
    await deleteStoredItems();
    navigation.replace('Login'); // Ensure 'Login' is your main login screen route name
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null, // No back button on dashboard
      headerRight: () => (
        <HeaderButton
          onPress={handleSignOut}
          title="Sign Out"
          iconName="logout"
        />
      ),
      headerBackVisible: false,
      headerStyle: {
        backgroundColor: THEME_COLORS.surface,
        elevation: Platform.OS === 'android' ? 4 : 0,
        shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0,
      },
      headerTintColor: THEME_COLORS.primary,
      headerTitleStyle: { fontWeight: 'bold'},
      title: "Admin Dashboard"
    });
  }, [navigation]);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.headerText}>Admin Control Panel</Text>
      <Text style={styles.subHeaderText}>Manage users and view reports.</Text>

      {/* MODIFIED CARD: Changed "Add New User" to "Manage Employees" */}
      <ActionCard
        title="Manage Employees" // New Title
        iconName="people" // Changed icon (or "group", "manage-accounts")
        // iconColor={THEME_COLORS.secondary} // Optional: use a different color
        description="View, add, edit, or remove employee profiles." // New Description
        onPress={() => navigation.navigate('AdminManageUsers')} // Navigate to the new central management screen
      />
      <ActionCard
        title="View Employee Reports"
        iconName="assessment"
        description="Access attendance and performance data."
        onPress={() => navigation.navigate('AdminViewReports')} // This remains the same
      />
      {/* If you had a direct "Remove User" card here, it's now part of "Manage Employees" screen */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: THEME_COLORS.background,
  },
  container: {
    flexGrow: 1,
    padding: THEME_SIZES.padding,
    backgroundColor: THEME_COLORS.background,
  },
  headerText: {
    fontSize: THEME_SIZES.h2 + 4,
    fontWeight: 'bold',
    color: THEME_COLORS.primary,
    marginBottom: THEME_SIZES.padding / 2,
    textAlign: 'center',
  },
  subHeaderText: {
    fontSize: THEME_SIZES.body,
    color: THEME_COLORS.lightText,
    textAlign: 'center',
    marginBottom: THEME_SIZES.padding * 2,
  },
  card: {
    backgroundColor: THEME_COLORS.surface,
    paddingVertical: THEME_SIZES.padding * 0.75,
    paddingHorizontal: THEME_SIZES.padding,
    borderRadius: THEME_SIZES.radius,
    marginBottom: THEME_SIZES.padding,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: THEME_COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardIconContainer: {
    justifyContent: 'center',
    marginRight: THEME_SIZES.padding,
  },
  cardIcon: {
    // Styles for the icon itself if needed, size is set in MaterialIcons component
  },
  cardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    color: THEME_COLORS.text,
    fontSize: THEME_SIZES.body + 1,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: THEME_SIZES.caption,
    color: THEME_COLORS.lightText,
    marginTop: 2,
  },
  cardChevron: {
    marginLeft: THEME_SIZES.padding / 2,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME_SIZES.padding * 0.75,
    paddingVertical: THEME_SIZES.padding * 0.5,
  },
  headerButtonText: {
    color: THEME_COLORS.primary,
    fontSize: THEME_SIZES.body,
    fontWeight: '600',
  },
});
// --- END OF FILE AdminDashboardScreen.js ---