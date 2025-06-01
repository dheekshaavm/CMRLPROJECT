// screens/AdminAddUserFormScreen.js
import React, { useState } from 'react';
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

const HeaderButton = ({ title, onPress, iconName, color }) => (
  <TouchableOpacity onPress={onPress} style={styles.headerButton}>
    {iconName && <MaterialIcons name={iconName} size={22} color={color || THEME_COLORS.primary} style={{ marginRight: title ? 5 : 0 }} />}
    {title && <Text style={[styles.headerButtonText, {color: color || THEME_COLORS.primary}]}>{title}</Text>}
  </TouchableOpacity>
);

export default function AdminAddUserFormScreen({ navigation }) {
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [loading, setLoading] = useState(false);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Add New Employee',
      headerStyle: { backgroundColor: THEME_COLORS.surface }, headerTintColor: THEME_COLORS.primary,
      headerLeft: () => (<HeaderButton onPress={() => navigation.goBack()} iconName="arrow-back" />),
    });
  }, [navigation]);

  const handleAddUser = async () => {
    if (!employeeId.trim() || !name.trim() || !email.trim() || !department.trim() || !role.trim() || !dateOfJoining.trim()) {
      NativeAlert.alert('Validation Error', 'Please fill all fields.'); return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      NativeAlert.alert('Validation Error', 'Please enter a valid email address.'); return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfJoining.trim())) {
      NativeAlert.alert('Validation Error', 'Date of Joining must be in YYYY-MM-DD format.'); return;
    }

    setLoading(true);
    const userData = { employeeId: employeeId.trim(), name: name.trim(), email: email.trim(), department: department.trim(), role: role.trim(), dateOfJoining: dateOfJoining.trim() };
    try {
      const response = await apiClient.post('/employees', userData); // POST /api/employees
      NativeAlert.alert('Success', response.data.message || 'New user added successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }] // Go back after success
      );
      // Optionally clear fields if staying on screen:
      // setEmployeeId(''); setName(''); setEmail(''); setDepartment(''); setRole(''); setDateOfJoining('');
    } catch (error) {
      NativeAlert.alert('API Error', error.response?.data?.error || error.response?.data?.message || 'Could not add user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.formContainer}>
        {/* Reusing styles from your original AdminAddUserScreen */}
        <TextInput style={styles.input} placeholder="Employee ID (e.g., E1001)" value={employeeId} onChangeText={setEmployeeId} placeholderTextColor={THEME_COLORS.placeholder} />
        <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} placeholderTextColor={THEME_COLORS.placeholder} />
        <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={THEME_COLORS.placeholder} />
        <TextInput style={styles.input} placeholder="Department" value={department} onChangeText={setDepartment} placeholderTextColor={THEME_COLORS.placeholder} />
        <TextInput style={styles.input} placeholder="Role (e.g., Engineer)" value={role} onChangeText={setRole} placeholderTextColor={THEME_COLORS.placeholder} />
        <TextInput style={styles.input} placeholder="Date of Joining (YYYY-MM-DD)" value={dateOfJoining} onChangeText={setDateOfJoining} placeholderTextColor={THEME_COLORS.placeholder} />
        {loading ? (<ActivityIndicator size="large" color={THEME_COLORS.primary} style={styles.loader} />)
         : (<TouchableOpacity style={styles.button} onPress={handleAddUser} activeOpacity={0.8}><Text style={styles.buttonText}>Add Employee</Text></TouchableOpacity>)}
      </View>
    </ScrollView>
  );
}

// Styles (largely from your original AdminAddUserScreen, ensure consistency)
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
// --- END OF FILE AdminAddUserFormScreen.js ---