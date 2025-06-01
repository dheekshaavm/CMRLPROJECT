// screens/EmployeeSetPasswordScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, ScrollView,
  ActivityIndicator, TouchableOpacity, Platform
} from 'react-native';
import apiClient from '../src/api/apiClient'; // Adjust path if necessary
import { MaterialIcons } from '@expo/vector-icons';

const THEME_COLORS = {
  primary: '#0033cc', text: '#333333', placeholder: '#999999',
  background: '#F0F2F5', surface: '#FFFFFF', border: '#CED4DA',
  white: '#FFFFFF', error: '#dc3545', success: '#28a745',
  black: '#000000', // for shadow
};
const THEME_SIZES = {
  padding: 16, radius: 8, body: 16, h3: 20, inputHeight: 50,
};

export default function EmployeeSetPasswordScreen({ route, navigation }) {
  // Ensure employeeProfile and employeeId exist
  const employeeProfile = route.params?.employeeProfile || {};
  const employeeIdFromProfile = employeeProfile.employeeId;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Set Your Password',
      headerStyle: { backgroundColor: THEME_COLORS.primary },
      headerTintColor: THEME_COLORS.white,
      headerTitleStyle: { fontWeight: 'bold' },
      headerLeft: () => null,
      headerBackVisible: false,
    });
  }, [navigation]);

  const handleSetPassword = async () => {
    console.log('[EmployeeSetPasswordScreen] handleSetPassword initiated.'); // Log start

    if (!employeeIdFromProfile) {
        console.error('[EmployeeSetPasswordScreen] Critical Error: employeeId is missing from route params.');
        Alert.alert('Error', 'Cannot set password. Employee details are missing. Please go back and try logging in again.');
        setLoading(false); // Ensure loading is off
        return;
    }

    if (!newPassword || !confirmPassword) {
      Alert.alert('Validation Error', 'Please fill both password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    const payload = {
      employeeId: employeeIdFromProfile, // Use the validated employeeId
      newPassword: newPassword,
    };

    // ***** NEW DETAILED LOGGING FOR PAYLOAD *****
    console.log('[EmployeeSetPasswordScreen] Attempting to set password. Payload sending to /auth/employee/set-password:', JSON.stringify(payload, null, 2));
    // ***** END OF NEW DETAILED LOGGING *****

    try {
      const response = await apiClient.post('/auth/employee/set-password', payload);
      console.log('[EmployeeSetPasswordScreen] API response from /set-password:', response.data); // Log success response

      Alert.alert(
        'Success',
        response.data.message || 'Password set successfully! Please log in again.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } catch (error) {
      console.error(
        '[EmployeeSetPasswordScreen] API Error from /set-password:',
        error.response ? JSON.stringify(error.response.data, null, 2) : error.message
      ); // Log error response
      Alert.alert(
        'Error Setting Password',
        error.response?.data?.error || error.response?.data?.message || 'Could not set password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Display a message if employeeId is somehow missing, though LoginScreen should pass it.
  if (!employeeIdFromProfile) {
    return (
        <View style={[styles.container, styles.centeredMessageContainer]}>
            <MaterialIcons name="error-outline" size={48} color={THEME_COLORS.error} />
            <Text style={styles.errorText}>Critical Error: Employee information is missing.</Text>
            <Text style={styles.errorSubText}>Please return to the login screen and try again.</Text>
            <TouchableOpacity style={styles.button} onPress={() => navigation.replace('Login')}>
                <Text style={styles.buttonText}>Go to Login</Text>
            </TouchableOpacity>
        </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.formContainer}>
        <MaterialIcons name="lock-person" size={48} color={THEME_COLORS.primary} style={styles.iconHeader} />
        <Text style={styles.title}>Create Your Secure Password</Text>
        <Text style={styles.subtitle}>
          Welcome, {employeeProfile.name || 'Employee'}! For account (ID: {employeeIdFromProfile}), please set a password.
        </Text>

        <View style={styles.inputWrapper}>
          <MaterialIcons name="vpn-key" size={20} color={THEME_COLORS.placeholder} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="New Password (min. 6 characters)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholderTextColor={THEME_COLORS.placeholder}
            editable={!loading}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputWrapper}>
          <MaterialIcons name="vpn-key" size={20} color={THEME_COLORS.placeholder} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholderTextColor={THEME_COLORS.placeholder}
            editable={!loading}
            autoCapitalize="none"
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={THEME_COLORS.primary} style={styles.loader} />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleSetPassword} activeOpacity={0.8} disabled={loading}>
            <Text style={styles.buttonText}>Set Password & Proceed</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: THEME_SIZES.padding,
    backgroundColor: THEME_COLORS.background,
    justifyContent: 'center',
  },
  centeredMessageContainer: { // For error display if employeeId is missing
    alignItems: 'center',
    paddingHorizontal: THEME_SIZES.padding * 2,
  },
  errorText: {
    fontSize: THEME_SIZES.h3,
    color: THEME_COLORS.error,
    textAlign: 'center',
    marginBottom: THEME_SIZES.padding / 2,
    fontWeight: 'bold',
  },
  errorSubText: {
    fontSize: THEME_SIZES.body,
    color: THEME_COLORS.text,
    textAlign: 'center',
    marginBottom: THEME_SIZES.padding * 1.5,
  },
  formContainer: {
    backgroundColor: THEME_COLORS.surface,
    padding: THEME_SIZES.padding * 1.5,
    borderRadius: THEME_SIZES.radius,
    ...Platform.select({
      ios: { shadowColor: THEME_COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, },
      android: { elevation: 3, },
    }),
    alignItems: 'center',
  },
  iconHeader: {
    marginBottom: THEME_SIZES.padding,
  },
  title: {
    fontSize: THEME_SIZES.h3 + 1,
    fontWeight: 'bold',
    marginBottom: THEME_SIZES.padding * 0.75,
    textAlign: 'center',
    color: THEME_COLORS.primary,
  },
  subtitle: {
    fontSize: THEME_SIZES.body - 1,
    textAlign: 'center',
    color: THEME_COLORS.text,
    marginBottom: THEME_SIZES.padding * 1.5,
    lineHeight: THEME_SIZES.body * 1.4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: THEME_SIZES.radius,
    marginBottom: THEME_SIZES.padding,
    height: THEME_SIZES.inputHeight,
    paddingHorizontal: THEME_SIZES.padding / 1.5,
    backgroundColor: THEME_COLORS.white,
    width: '100%',
  },
  inputIcon: {
    marginRight: THEME_SIZES.padding / 1.5,
  },
  input: {
    flex: 1,
    fontSize: THEME_SIZES.body,
    color: THEME_COLORS.text,
  },
  button: {
    backgroundColor: THEME_COLORS.primary,
    paddingVertical: THEME_SIZES.padding * 0.75,
    borderRadius: THEME_SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    height: THEME_SIZES.inputHeight,
    width: '100%',
    marginTop: THEME_SIZES.padding * 0.5,
  },
  buttonText: {
    color: THEME_COLORS.white,
    fontSize: THEME_SIZES.body,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: THEME_SIZES.padding,
    height: THEME_SIZES.inputHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});