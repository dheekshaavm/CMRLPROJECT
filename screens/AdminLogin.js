// AdminLogin.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ActivityIndicator,
  Platform, Alert, TouchableOpacity, ScrollView, Image
} from 'react-native';
import apiClient from '../src/api/apiClient';

// Conceptual Theme (subset for this file)
const THEME_COLORS = {
  primary: '#0033cc',
  text: '#333333',
  placeholder: '#999999',
  background: '#F0F2F5', // Changed for overall screen
  surface: '#FFFFFF',   // For the login card
  border: '#CED4DA',
  white: '#FFFFFF',
  error: '#dc3545',
  disabled: '#E9ECEF',
  disabledText: '#6c757d',
};
const THEME_SIZES = {
  padding: 16,
  radius: 8,
  h2: 24,
  body: 16,
  inputHeight: 50,
};

export default function AdminLogin({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const storeToken = async (key, value) => {
    // ... (same as original)
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      const SecureStore = require('expo-secure-store'); // Require it dynamically for native
      await SecureStore.setItemAsync(key, value);
    }
  };

  const handleLogin = async () => {
    // ... (same as original, no UI changes here)
    console.log('AdminLogin: handleLogin triggered for backend.');
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    console.log(`AdminLogin: Attempting backend login with email: ${email.trim()}`);
    try {
      const response = await apiClient.post('/auth/admin/login', {
        email: email.trim(),
        password: password,
      });

      console.log('AdminLogin: Backend response received:', response.data);
      const { token, admin } = response.data;

      if (token && admin && admin.id) {
        await storeToken('adminToken', token);
        await storeToken('adminUser', JSON.stringify(admin));

        // Alert.alert('Success', `Admin ${admin.name || 'User'} logged in`); // Can be removed if navigation is quick
        navigation.replace('AdminDashboard');
      } else {
        console.error('AdminLogin: Invalid data received from server', response.data);
        Alert.alert('Login Failed', 'Received invalid data received from server. Please try again.');
      }
    } catch (error) {
      console.error(
        'AdminLogin: API Login Failed.',
        error.response ? error.response.data : error.message
      );
      if (error.request && !error.response) {
        console.error('AdminLogin: Network error or server not responding. URL attempted:', error.config?.url);
        Alert.alert('Network Error', 'Could not connect to the server. Please ensure the backend is running and accessible.');
      } else {
        Alert.alert(
          'Login Failed',
          error.response?.data?.message || 'An error occurred. Please check your credentials or network.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // This screen is part of a stack, so it will inherit header styling.
  // If it were standalone, you'd add React.useLayoutEffect for header.

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Image source={require('../assets/gov_logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Admin Login</Text>
        <Text style={styles.subtitle}>Access the CMRL Admin Panel</Text>

        <View style={styles.formContainer}>
          <TextInput
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={THEME_COLORS.placeholder}
            editable={!loading}
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholderTextColor={THEME_COLORS.placeholder}
            editable={!loading}
          />
          {loading ? (
            <ActivityIndicator size="large" color={THEME_COLORS.primary} style={styles.loader} />
          ) : (
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Optionally, add a "Forgot Password?" link or other elements here */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: THEME_COLORS.background,
  },
  container: {
    flex: 1,
    padding: THEME_SIZES.padding * 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: THEME_SIZES.padding,
  },
  title: {
    fontSize: THEME_SIZES.h2 + 2,
    fontWeight: 'bold',
    marginBottom: THEME_SIZES.padding / 2,
    textAlign: 'center',
    color: THEME_COLORS.primary,
  },
  subtitle: {
    fontSize: THEME_SIZES.body,
    color: THEME_COLORS.lightText,
    textAlign: 'center',
    marginBottom: THEME_SIZES.padding * 2,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: THEME_COLORS.surface,
    padding: THEME_SIZES.padding * 1.5,
    borderRadius: THEME_SIZES.radius,
    ...Platform.select({
      ios: {
        shadowColor: THEME_COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  input: {
    height: THEME_SIZES.inputHeight,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: THEME_SIZES.radius,
    paddingHorizontal: THEME_SIZES.padding,
    marginBottom: THEME_SIZES.padding,
    fontSize: THEME_SIZES.body,
    backgroundColor: THEME_COLORS.white,
    color: THEME_COLORS.text,
  },
  button: {
    backgroundColor: THEME_COLORS.primary,
    paddingVertical: THEME_SIZES.padding * 0.75,
    borderRadius: THEME_SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    height: THEME_SIZES.inputHeight,
  },
  buttonText: {
    color: THEME_COLORS.white,
    fontSize: THEME_SIZES.body,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: THEME_SIZES.padding / 2, // Adjust loader position
    height: THEME_SIZES.inputHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
// --- END OF FILE AdminLogin.js ---