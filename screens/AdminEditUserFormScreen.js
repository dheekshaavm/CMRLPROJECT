// screens/AdminEditUserFormScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert as NativeAlert, ScrollView,
  ActivityIndicator, Platform, TouchableOpacity
} from 'react-native';
import apiClient from '../src/api/apiClient'; // Adjust path
import { MaterialIcons } from '@expo/vector-icons';

// --- THEME (Use your existing app theme or adapt this) ---
const THEME_COLORS = {
  primary: '#0033cc', text: '#333333', placeholder: '#999999',
  background: '#F0F2F5', surface: '#FFFFFF', border: '#CED4DA',
  white: '#FFFFFF', error: '#dc3545',
};
const THEME_SIZES = {
  padding: 16, radius: 8, body: 16, h3: 20, inputHeight: 50,
};
// --- End THEME ---

// Custom Header Button Component (Can be moved to a common file) 
const HeaderButton = ({ title, onPress, iconName, color }) => (
  <TouchableOpacity onPress={onPress} style={styles.headerButton}>
    {iconName && <MaterialIcons name={iconName} size={22} color={color || THEME_COLORS.primary} style={{ marginRight: title ? 5 : 0 }} />}
    {title && <Text style={[styles.headerButtonText, {color: color || THEME_COLORS.primary}]}>{title}</Text>}
  </TouchableOpacity>
);

export default function AdminEditUserFormScreen({ route, navigation }) {
  const { employeeData } = route.params; // Employee data passed from AdminManageUsersScreen

  const [employeeIdStr, setEmployeeIdStr] = useState(employeeData?.employee_id || ''); // String employee_id
  const [name, setName] = useState(employeeData?.name || '');
  const [email, setEmail] = useState(employeeData?.email || '');
  const [department, setDepartment] = useState(employeeData?.department || '');
  const [role, setRole] = useState(employeeData?.role || '');
  const [dateOfJoining, setDateOfJoining] = useState(employeeData?.date_of_joining?.split('T')[0] || ''); // Format if it's ISO
  const [loading, setLoading] = useState(false);

  // The primary key (integer id) from the database, needed for the PUT request
  const employeePkId = employeeData?.id;

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: `Edit ${employeeData?.name || 'Employee'}`,
      headerStyle: { backgroundColor: THEME_COLORS.surface }, headerTintColor: THEME_COLORS.primary,
      headerLeft: () => (<HeaderButton onPress={() => navigation.goBack()} iconName="arrow-back" />),
    });
  }, [navigation, employeeData]);

  const handleUpdateUser = async () => {
    if (!employeePkId) {
        NativeAlert.alert('Error', 'Employee primary key is missing. Cannot update.');
        return;
    }
    if (!employeeIdStr.trim() || !name.trim() || !email.trim() || !department.trim() || !role.trim() || !dateOfJoining.trim()) {
      NativeAlert.alert('Validation Error', 'Please fill all fields.'); return;
    }
    // ... (other validations for email, date format as in AddUser) ...

    setLoading(true);
    const updatedUserData = {
      employeeId: employeeIdStr.trim(), // This is employee_id (string)
      name: name.trim(),
      email: email.trim(),
      department: department.trim(),
      role: role.trim(),
      dateOfJoining: dateOfJoining.trim(),
    };

    try {
      // API endpoint expects the primary key 'id' in the URL
      const response = await apiClient.put(`/employees/${employeePkId}`, updatedUserData); // PUT /api/employees/:id
      NativeAlert.alert('Success', response.data.message || 'User updated successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      NativeAlert.alert('API Error', error.response?.data?.error || error.response?.data?.message || 'Could not update user.');
    } finally {
      setLoading(false);
    }
  };

  if (!employeeData) {
    return <View style={styles.centered}><Text>Error: Employee data not found.</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.formContainer}>
        <TextInput style={styles.input} placeholder="Employee ID (e.g., E1001)" value={employeeIdStr} onChangeText={setEmployeeIdStr} placeholderTextColor={THEME_COLORS.placeholder} />
        <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} placeholderTextColor={THEME_COLORS.placeholder} />
        <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={THEME_COLORS.placeholder} />
        <TextInput style={styles.input} placeholder="Department" value={department} onChangeText={setDepartment} placeholderTextColor={THEME_COLORS.placeholder} />
        <TextInput style={styles.input} placeholder="Role (e.g., Engineer)" value={role} onChangeText={setRole} placeholderTextColor={THEME_COLORS.placeholder} />
        <TextInput style={styles.input} placeholder="Date of Joining (YYYY-MM-DD)" value={dateOfJoining} onChangeText={setDateOfJoining} placeholderTextColor={THEME_COLORS.placeholder} />
        {loading ? (<ActivityIndicator size="large" color={THEME_COLORS.primary} style={styles.loader} />)
         : (<TouchableOpacity style={styles.button} onPress={handleUpdateUser} activeOpacity={0.8}><Text style={styles.buttonText}>Update Employee</Text></TouchableOpacity>)}
      </View>
    </ScrollView>
  );
}

// Styles (Can be very similar to AdminAddUserFormScreen styles)
const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: THEME_SIZES.padding, backgroundColor: THEME_COLORS.background, justifyContent: 'center', },
  formContainer: { backgroundColor: THEME_COLORS.surface, padding: THEME_SIZES.padding * 1.5, borderRadius: THEME_SIZES.radius, ...Platform.select({ ios: { shadowColor: THEME_COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, }, android: { elevation: 3, }, }), },
  input: { height: THEME_SIZES.inputHeight, borderWidth: 1, borderColor: THEME_COLORS.border, borderRadius: THEME_SIZES.radius, paddingHorizontal: THEME_SIZES.padding, marginBottom: THEME_SIZES.padding, fontSize: THEME_SIZES.body, backgroundColor: THEME_COLORS.white, color: THEME_COLORS.text, },
  button: { backgroundColor: THEME_COLORS.primary, paddingVertical: THEME_SIZES.padding * 0.75, borderRadius: THEME_SIZES.radius, alignItems: 'center', justifyContent: 'center', height: THEME_SIZES.inputHeight, marginTop: THEME_SIZES.padding * 0.5, },
  buttonText: { color: THEME_COLORS.white, fontSize: THEME_SIZES.body, fontWeight: 'bold', },
  loader: { marginTop: THEME_SIZES.padding, },
  headerButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: THEME_SIZES.padding * 0.75, paddingVertical: THEME_SIZES.padding * 0.5, },
  headerButtonText: { color: THEME_COLORS.primary, fontSize: THEME_SIZES.body, fontWeight: '600', },
});
// --- END OF FILE AdminEditUserFormScreen.js ---