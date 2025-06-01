// screens/AdminManageUsersScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert as NativeAlert, ScrollView,
  ActivityIndicator, Platform, TouchableOpacity, FlatList
} from 'react-native';
import apiClient from '../src/api/apiClient'; // Adjust path
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native'; // Added useNavigation hook

// --- THEME (Use your existing app theme or adapt this) ---
const THEME_COLORS = {
  primary: '#0033cc', text_primary: '#212121', text_secondary: '#757575',
  placeholder: '#999999', background: '#F0F2F5', surface: '#FFFFFF',
  border: '#CED4DA', white: '#FFFFFF', error: '#dc3545', success: '#28a745',
  lightText: '#6c757d', disabled: '#E9ECEF', disabled_text: '#6c757d',
  black: '#000000', edit: '#FFB300', // Edit button color
};
const THEME_SIZES = {
  padding: 16, radius: 8, body: 15, caption: 12, h3: 18, inputHeight: 45, buttonHeight: 40
};
// --- End THEME ---

// --- Helper Components (Should be shared or defined if not already) ---
const HeaderButton = ({ title, onPress, iconName, color }) => (
  <TouchableOpacity onPress={onPress} style={styles.headerButton}>
    {iconName && <MaterialIcons name={iconName} size={22} color={color || THEME_COLORS.primary} style={{ marginRight: title ? 5 : 0 }} />}
    {title && <Text style={[styles.headerButtonText, {color: color || THEME_COLORS.primary}]}>{title}</Text>}
  </TouchableOpacity>
);

const CustomAppButton = ({ title, onPress, variant = 'primary', style, textStyle, isLoading, iconName, disabled, iconSize = 18, iconColorOverride }) => {
  let buttonStyle = styles.buttonPrimary;
  let finalTextStyle = styles.buttonTextPrimary;
  let iconColor = iconColorOverride || THEME_COLORS.white;

  if (variant === 'danger') { buttonStyle = styles.buttonDanger; }
  else if (variant === 'secondary') { buttonStyle = styles.buttonSecondary; finalTextStyle = styles.buttonTextSecondary; iconColor = iconColorOverride || THEME_COLORS.primary; }
  else if (variant === 'warning') { buttonStyle = styles.buttonWarning; iconColor = iconColorOverride || THEME_COLORS.text_primary; }

  return (
    <TouchableOpacity
      style={[styles.buttonBase, buttonStyle, disabled && styles.buttonDisabled, style]}
      onPress={onPress} activeOpacity={disabled || isLoading ? 1 : 0.7} disabled={disabled || isLoading}
    >
      {isLoading ? <ActivityIndicator color={iconColor} size="small"/> :
        <>{iconName && <MaterialIcons name={iconName} size={iconSize} color={disabled ? THEME_COLORS.disabled_text : iconColor} style={{marginRight: title ? 6:0}}/>}
          {title && <Text style={[styles.buttonTextBase, finalTextStyle, disabled && styles.buttonTextDisabled, textStyle]}>{title}</Text>}</>}
    </TouchableOpacity>
  );
};
// --- End Helper Components ---

export default function AdminManageUsersScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true); // For initial list load
  const [actionLoading, setActionLoading] = useState(false); // For specific actions like delete
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingEmployeeId, setDeletingEmployeeId] = useState(null); // To show spinner on specific button

  const fetchEmployees = useCallback(async () => {
    const fetchId = `FETCH_EMP-${Date.now()}`;
    console.log(`[AdminManageUsers ${fetchId}] Fetching employees...`);
    setLoading(true);
    setActionLoading(false); // Reset general action loading
    setDeletingEmployeeId(null); // Reset specific delete loading
    try {
      const response = await apiClient.get('/employees');
      setEmployees(response.data || []);
      console.log(`[AdminManageUsers ${fetchId}] Employees fetched:`, response.data?.length);
    } catch (error) {
      console.error(`[AdminManageUsers ${fetchId}] Error fetching employees:`, error.response?.data || error.message);
      NativeAlert.alert('Error', 'Could not fetch employees: ' + (error.response?.data?.error || error.message));
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log("[AdminManageUsers] Screen focused, calling fetchEmployees.");
      fetchEmployees();
      return () => {
        console.log("[AdminManageUsers] Screen unfocused.");
        // Optional cleanup if needed when screen is unfocused
      };
    }, [fetchEmployees])
  );

  const handleSignOut = async () => {
    // Your standard admin sign out logic
    if (Platform.OS === 'web') { try { localStorage.removeItem('adminToken'); localStorage.removeItem('adminUser'); } catch (e) { console.error('localStorage remove error', e); }}
    else { try { const SecureStore = require('expo-secure-store'); await SecureStore.deleteItemAsync('adminToken'); await SecureStore.deleteItemAsync('adminUser');} catch (e) { console.error('SecureStore remove error', e);}}
    navigation.replace('Login');
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Manage Employees',
      headerStyle: { backgroundColor: THEME_COLORS.surface, elevation: Platform.OS === 'android' ? 4 : 0, shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0, },
      headerTintColor: THEME_COLORS.primary, headerTitleStyle: { fontWeight: 'bold'},
      headerLeft: () => (<HeaderButton onPress={() => navigation.navigate('AdminDashboard')} title="Dashboard" iconName="dashboard" />),
      headerRight: () => (<HeaderButton onPress={handleSignOut} title="Sign Out" iconName="logout" />),
    });
  }, [navigation]);

  const confirmDeleteEmployee = (employee) => {
    const confirmId = `CONFIRM_DEL-${Date.now()}`;
    console.log(`[AdminManageUsers ${confirmId}] confirmDeleteEmployee called for: PK_ID=${employee.id}, EmpID=${employee.employee_id}, Name=${employee.name}`);
    NativeAlert.alert(
      'Confirm Delete',
      `Are you sure you want to delete employee ${employee.name} (ID: ${employee.employee_id})?\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => console.log(`[AdminManageUsers ${confirmId}] Delete cancelled for PK ID: ${employee.id}`) },
        { text: 'Delete', style: 'destructive', onPress: () => {
            console.log(`[AdminManageUsers ${confirmId}] Confirmed delete for PK ID: ${employee.id}. Calling handleDeleteEmployee.`);
            handleDeleteEmployee(employee.id); // Pass the primary key (integer id)
          }
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteEmployee = async (employeePkId) => {
    const deleteActionId = `DEL_EMP-${Date.now()}`;
    console.log(`[AdminManageUsers ${deleteActionId}] handleDeleteEmployee started for PK ID: ${employeePkId}. Current actionLoading: ${actionLoading}`);

    if (!employeePkId) {
        console.error(`[AdminManageUsers ${deleteActionId}] handleDeleteEmployee Error: employeePkId is missing.`);
        NativeAlert.alert('Error', 'Employee ID is missing, cannot delete.');
        return;
    }
    if (actionLoading && deletingEmployeeId !== employeePkId) { // Check if another delete is ALREADY in progress
        console.warn(`[AdminManageUsers ${deleteActionId}] handleDeleteEmployee IGNORED: Another delete action is already in progress for PK ID ${deletingEmployeeId}.`);
        NativeAlert.alert('In Progress', 'Another delete operation is already in progress. Please wait.');
        return;
    }
    if (actionLoading && deletingEmployeeId === employeePkId) { // If this specific item's delete was re-triggered
        console.warn(`[AdminManageUsers ${deleteActionId}] handleDeleteEmployee IGNORED: Delete for PK ID ${employeePkId} is already in progress.`);
        return;
    }


    setDeletingEmployeeId(employeePkId);
    setActionLoading(true);

    try {
      const apiUrl = `/employees/${employeePkId}`;
      console.log(`[AdminManageUsers ${deleteActionId}] Sending DELETE request to: ${apiClient.defaults.baseURL}${apiUrl}`);
      const response = await apiClient.delete(apiUrl);
      console.log(`[AdminManageUsers ${deleteActionId}] Delete API response:`, JSON.stringify(response.data, null, 2));

      NativeAlert.alert('Success', response.data.message || 'Employee deleted successfully.');
      setEmployees(prevEmployees => prevEmployees.filter(emp => emp.id !== employeePkId));
    } catch (error) {
      const errorResponse = error.response?.data;
      const errorMessage = errorResponse?.error || errorResponse?.message || error.message || 'Could not delete employee.';
      console.error(`[AdminManageUsers ${deleteActionId}] Error deleting employee:`, JSON.stringify(error.response || error, null, 2));
      NativeAlert.alert('Deletion Failed', errorMessage);
    } finally {
      console.log(`[AdminManageUsers ${deleteActionId}] handleDeleteEmployee FINALLY for PK ID: ${employeePkId}. Resetting loading states.`);
      setActionLoading(false);
      setDeletingEmployeeId(null);
    }
  };

  const navigateToAddUser = () => {
    console.log("[AdminManageUsers] Navigating to AdminAddUserForm");
    navigation.navigate('AdminAddUserForm');
  };

  const navigateToEditUser = (employee) => {
    console.log("[AdminManageUsers] Navigating to AdminEditUserForm for employee PK ID:", employee.id);
    navigation.navigate('AdminEditUserForm', { employeeData: employee });
  };

  const filteredEmployees = employees.filter(emp =>
    (emp.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderEmployeeItem = ({ item }) => (
    <View style={styles.employeeItem}>
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{item.name} <Text style={styles.employeeIdText}>({item.employee_id})</Text></Text>
        <Text style={styles.employeeDetail}>Email: {item.email || 'N/A'}</Text>
        <Text style={styles.employeeDetail}>Dept: {item.department || 'N/A'} | Role: {item.role || 'N/A'}</Text>
        <Text style={styles.employeeDetail}>DB PK: {item.id}</Text>
      </View>
      <View style={styles.employeeActions}>
        <CustomAppButton
            iconName="edit"
            variant="warning"
            onPress={() => navigateToEditUser(item)}
            style={styles.actionButton}
            disabled={actionLoading} // Disable edit if any delete is in progress
        />
        <CustomAppButton
            iconName="delete-forever"
            variant="danger"
            onPress={() => confirmDeleteEmployee(item)}
            style={[styles.actionButton, {marginLeft: 8}]}
            isLoading={actionLoading && deletingEmployeeId === item.id}
            disabled={actionLoading && deletingEmployeeId !== item.id} // Only disable *other* remove buttons
        />
      </View>
    </View>
  );

  if (loading && employees.length === 0 && !searchTerm) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={THEME_COLORS.primary} /><Text style={styles.loadingText}>Loading Employees...</Text></View>;
  }

  return (
    <View style={styles.screenContainer}>
      <View style={styles.headerControls}>
        <View style={styles.searchOuterContainer}>
            <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={22} color={THEME_COLORS.placeholder} style={styles.searchIcon} />
            <TextInput
                style={styles.searchInput}
                placeholder="Search Employees..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor={THEME_COLORS.placeholder}
                clearButtonMode="while-editing"
            />
            </View>
        </View>
        <CustomAppButton
            title="Add Employee"
            iconName="person-add"
            onPress={navigateToAddUser}
            style={styles.addEmployeeButton}
            disabled={actionLoading} // Disable add if a delete is in progress
        />
      </View>

      {loading && searchTerm && <ActivityIndicator size="small" color={THEME_COLORS.primary} style={styles.inlineLoader} />}

      {filteredEmployees.length === 0 && !loading ? (
        <View style={styles.centered}><Text style={styles.noResultsText}>No employees found{searchTerm ? " matching your search." : "."}</Text></View>
      ) : (
        <FlatList
          data={filteredEmployees}
          renderItem={renderEmployeeItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          keyboardShouldPersistTaps="handled"
          extraData={actionLoading || deletingEmployeeId} // Helps FlatList re-render items when these change
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: THEME_COLORS.background, },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: THEME_SIZES.padding },
  loadingText: { marginTop: 10, fontSize: THEME_SIZES.body -1, color: THEME_COLORS.lightText },
  inlineLoader: { marginVertical: THEME_SIZES.padding / 2, alignSelf: 'center' },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME_SIZES.padding,
    paddingTop: THEME_SIZES.padding,
    paddingBottom: THEME_SIZES.padding / 2,
  },
  searchOuterContainer: { flex: 1, marginRight: THEME_SIZES.padding / 2 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: THEME_COLORS.surface,
    paddingHorizontal: THEME_SIZES.padding / 1.5, borderRadius: THEME_SIZES.radius,
    borderWidth: 1, borderColor: THEME_COLORS.border, height: THEME_SIZES.inputHeight + 5,
  },
  searchIcon: { marginRight: THEME_SIZES.padding / 2 },
  searchInput: { flex: 1, fontSize: THEME_SIZES.body -1, color: THEME_COLORS.text_primary },
  addEmployeeButton: {
    paddingHorizontal: THEME_SIZES.padding * 0.6,
    height: THEME_SIZES.inputHeight + 5,
  },
  listContainer: { paddingHorizontal: THEME_SIZES.padding, paddingTop: THEME_SIZES.padding / 2, paddingBottom: 60 /* Extra padding for last item */ },
  employeeItem: {
    backgroundColor: THEME_COLORS.surface, borderRadius: THEME_SIZES.radius,
    padding: THEME_SIZES.padding * 0.9, marginBottom: THEME_SIZES.padding * 0.8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...Platform.select({ ios: { shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: {width: 0, height: 1} }, android: { elevation: 2 } }),
  },
  employeeInfo: { flex: 1, marginRight: THEME_SIZES.padding / 2 },
  employeeName: { fontSize: THEME_SIZES.body, fontWeight: 'bold', color: THEME_COLORS.text_primary, marginBottom: 3 },
  employeeIdText: { fontWeight: 'normal', color: THEME_COLORS.text_secondary, fontSize: THEME_SIZES.body - 2 },
  employeeDetail: { fontSize: THEME_SIZES.caption, color: THEME_COLORS.lightText, marginBottom: 1 },
  employeeActions: { flexDirection: 'row', },
  actionButton: { paddingHorizontal: 8, height: 36, minWidth: 40, justifyContent: 'center', alignItems: 'center' },
  actionButtonText: { fontSize: THEME_SIZES.body - 3 }, // Not used if only icon
  removeButton: {}, // Can add specific overrides here
  noResultsText: { fontSize: THEME_SIZES.body, color: THEME_COLORS.lightText, textAlign: 'center', marginTop: 20 },
  headerButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: THEME_SIZES.padding * 0.75, },
  headerButtonText: { color: THEME_COLORS.primary, fontSize: THEME_SIZES.body -1, fontWeight: '600', },
  buttonBase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: THEME_SIZES.radius -2, paddingVertical: 8, paddingHorizontal: 12 },
  buttonPrimary: { backgroundColor: THEME_COLORS.primary },
  buttonDanger: { backgroundColor: THEME_COLORS.error },
  buttonWarning: { backgroundColor: THEME_COLORS.edit, borderWidth: 1, borderColor: THEME_COLORS.edit },
  buttonSecondary: { backgroundColor: THEME_COLORS.surface, borderWidth: 1, borderColor: THEME_COLORS.primary, },
  buttonDisabled: { backgroundColor: THEME_COLORS.disabled, borderColor: THEME_COLORS.border, borderWidth:1, opacity: 0.7 },
  buttonTextBase: { fontSize: THEME_SIZES.body -2, fontWeight: '600', },
  buttonTextPrimary: { color: THEME_COLORS.white, },
  buttonTextSecondary: { color: THEME_COLORS.primary, },
  buttonTextDisabled: { color: THEME_COLORS.disabled_text, }
});
// --- END OF FILE AdminManageUsersScreen.js ---