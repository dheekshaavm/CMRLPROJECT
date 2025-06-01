// screens/LoginScreen.js
import React, { useState } from 'react';
import apiClient from '../src/api/apiClient'; // Adjust path if necessary
import { Platform, ActivityIndicator, View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';

// --- THEME_COLORS, THEME_SIZES, StyledInput, StyledButton components ---
// (Ensure these are defined as in your previous correct version of LoginScreen.js)
const THEME_COLORS = {
  primary: '#0033cc', secondary: '#0056b3', text: '#333333', lightText: '#6c757d',
  placeholder: '#999999', background: '#F0F2F5', surface: '#FFFFFF', border: '#CED4DA',
  white: '#FFFFFF', disabled: '#E9ECEF', disabledText: '#6c757d', black: '#000000',
};
const THEME_SIZES = {
  padding: 16, radius: 8, body: 16, caption: 12, h1: 28, h3: 20,
  inputHeight: 50, buttonHeight: 50,
};

const StyledInput = ({ iconName, placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, editable }) => (
  <View style={styles.inputContainer}>
    {iconName && <MaterialIcons name={iconName} size={20} color={THEME_COLORS.placeholder} style={styles.inputIcon} />}
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      placeholderTextColor={THEME_COLORS.placeholder}
      editable={editable}
    />
  </View>
);

const StyledButton = ({ title, onPress, disabled, loading }) => (
  <TouchableOpacity
    style={[styles.loginButton, (disabled || loading) && styles.disabledButton]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator color={THEME_COLORS.white} />
    ) : (
      <Text style={styles.loginButtonText}>{title}</Text>
    )}
  </TouchableOpacity>
);
// --- End Helper Components ---

export default function LoginScreen({ navigation }) {
  const [userType, setUserType] = useState('employee');
  const [employeeId, setEmployeeId] = useState('');
  // Name and Department fields are removed from state and UI for employee login
  const [employeePassword, setEmployeePassword] = useState('');

  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const storeToken = async (key, value) => { // For Admin login
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch (e) { console.error('Failed to save to localStorage', e); Alert.alert("Storage Error", "Could not save login session on web."); }
    } else {
      try {
        const SecureStore = require('expo-secure-store');
        await SecureStore.setItemAsync(key, value);
      } catch (e) { console.error('Failed to save to SecureStore', e); Alert.alert("Storage Error", "Could not save login session securely."); }
    }
  };

  const handleLogin = async () => {
    console.log(`[LoginScreen_V2] handleLogin triggered. UserType: ${userType}`);
    

    if (userType === 'employee') {
      if (!employeeId.trim()) {
        Alert.alert('Validation Error', 'Please enter Employee ID');
        return; // setLoading(false) not needed as it wasn't set to true yet
      }
      setLoading(true); // Set loading before API call

      try {
        console.log(`[LoginScreen_V2] Attempting employee login with ID: ${employeeId.trim()}, PwdProvided: ${!!employeePassword}`);

        const loginPayload = {
          employeeId: employeeId.trim(),
          password: employeePassword, // Send password; backend decides if it's first time or not
          // Name and Department are NO LONGER SENT from client for login
          // Optional: Add latitude/longitude here if you want to record on login event
          // latitude: someLat,
          // longitude: someLon,
        };

        const response = await apiClient.post('/auth/employee/login', loginPayload);
        console.log('[LoginScreen_V2] Employee login API response:', response.data);

        if (response.data.actionRequired === 'SET_PASSWORD') {
          console.log("[LoginScreen_V2] Action required is SET_PASSWORD. Preparing alert to navigate.");
          // setLoading(false); // Handled in finally
          Alert.alert(
            'Set Your Password',
            response.data.message || 'This is your first login. Please set a password for your account.',
            [{ text: 'OK', onPress: () => {
                console.log("[LoginScreen_V2] Navigating to EmployeeSetPassword with profile:", response.data.employeeProfile);
                navigation.navigate('EmployeeSetPassword', {
                  employeeProfile: response.data.employeeProfile // Backend sends fetched name, dept, role
                });
              }
            }]
          );
        } else if (response.data && response.data.employeeProfile && !response.data.actionRequired) {
          // setLoading(false); // Handled in finally
          console.log("[LoginScreen_V2] Direct login successful. Navigating to EmployeeHome.");
          const { employeeProfile } = response.data; // This profile comes from backend with all details
          navigation.replace('EmployeeHome', {
            employeeId: employeeProfile.employeeId, // Use employeeId fromDB
            userName: employeeProfile.name,
            department: employeeProfile.department,
            role: employeeProfile.role
          });
        } else {
          // setLoading(false); // Handled in finally
          console.warn("[LoginScreen_V2] Login failed or unexpected response structure:", response.data);
          Alert.alert('Login Failed', response.data?.error || response.data?.message || 'Invalid employee details or unknown server error.');
        }
      } catch (error) {
        console.error('[LoginScreen_V2] Employee login - API Error:', error.response ? JSON.stringify(error.response.data) : error.message);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Could not log in as employee. Please check your details or network connection.';
        Alert.alert('Login Failed', errorMessage);
      } finally {
        if(loading) {
            console.log("[LoginScreen_V2] Employee logic: In finally block, setting loading to false.");
            setLoading(false);
        }
      }

    } else { // Admin Login
      if (!adminEmail.trim() || !adminPassword.trim()) {
        Alert.alert('Validation Error', 'Please enter admin email and password');
        return;
      }
      setLoading(true); // Set loading before API call

      try {
        console.log(`[LoginScreen_V2] Attempting admin login with email: ${adminEmail.trim()}`);
        const response = await apiClient.post('/auth/admin/login', {
          email: adminEmail.trim(),
          password: adminPassword,
        });
        console.log('[LoginScreen_V2] Admin login API response:', response.data);
        const { token, admin } = response.data;
        if (token && admin && admin.id) {
          console.log("[LoginScreen_V2] Admin login successful. Navigating to AdminDashboard.");
          await storeToken('adminToken', token);
          await storeToken('adminUser', JSON.stringify(admin));
          navigation.replace('AdminDashboard');
        } else {
          console.warn("[LoginScreen_V2] Admin login failed or unexpected response:", response.data);
          Alert.alert('Login Failed', response.data?.message || 'Invalid admin credentials or server error.');
        }
      } catch (error) {
        console.error('[LoginScreen_V2] Admin login - API Error:', error.response ? JSON.stringify(error.response.data) : error.message);
        const adminErrorMessage = error.response?.data?.message || error.response?.data?.error || 'An error occurred during admin login.';
        Alert.alert('Admin Login Failed', adminErrorMessage);
      } finally {
        if(loading) {
            console.log("[LoginScreen_V2] Admin logic: In finally block, setting loading to false.");
            setLoading(false);
        }
      }
    }
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.logoHeaderContainer}>
        <Image source={require('../assets/gov_logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>CHENNAI METRO RAIL LIMITED</Text>
          <Text style={styles.subtitle}>Employee & Admin Portal</Text>
        </View>
        <Image source={require('../assets/tn_logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Login Access</Text>
        <View style={styles.pickerOuterContainer}>
            <MaterialIcons name="people" size={20} color={THEME_COLORS.placeholder} style={styles.pickerIcon}/>
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={userType}
                    onValueChange={(itemValue) => setUserType(itemValue)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                    enabled={!loading}
                >
                    <Picker.Item label="Employee Login" value="employee" />
                    <Picker.Item label="Admin Login" value="admin" />
                </Picker>
            </View>
        </View>

        {userType === 'employee' && (
          <>
            <StyledInput
              iconName="badge"
              placeholder="Employee ID (e.g., E1001)"
              value={employeeId}
              onChangeText={setEmployeeId}
              editable={!loading}
            />
            {/* Name and Department input fields are REMOVED for employee login */}
            <StyledInput
              iconName="lock"
              placeholder="Password (leave blank if first login)"
              value={employeePassword}
              onChangeText={setEmployeePassword}
              secureTextEntry
              editable={!loading}
            />
          </>
        )}

        {userType === 'admin' && (
          <>
            <StyledInput
              iconName="email"
              placeholder="Admin Email"
              value={adminEmail}
              onChangeText={setAdminEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            <StyledInput
              iconName="lock"
              placeholder="Password"
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry
              editable={!loading}
            />
          </>
        )}

        <StyledButton
          title="LOGIN"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
        />
      </View>
      <Text style={styles.footerText}>© {new Date().getFullYear()} Chennai Metro Rail Limited. All rights reserved.</Text>
    </ScrollView>
  );
}

// --- Styles ---
// Ensure this styles object is the same as your last working version of LoginScreen.js
const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: THEME_SIZES.padding * 2,
    backgroundColor: THEME_COLORS.background,
  },
  logoHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: THEME_SIZES.padding,
    marginBottom: THEME_SIZES.padding * 1.5,
  },
  logo: {
    width: 70,
    height: 70,
  },
  titleContainer: {
    alignItems: 'center',
    flexShrink: 1,
    paddingHorizontal: THEME_SIZES.padding / 2,
  },
  mainTitle: {
    fontSize: THEME_SIZES.body + 2,
    fontWeight: 'bold',
    color: THEME_COLORS.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: THEME_SIZES.caption + 1,
    color: THEME_COLORS.lightText,
    textAlign: 'center',
    marginTop: 2,
  },
  formCard: {
    width: '90%',
    maxWidth: 450,
    backgroundColor: THEME_COLORS.surface,
    padding: THEME_SIZES.padding * 1.5,
    borderRadius: THEME_SIZES.radius * 1.5,
    ...Platform.select({
      ios: { shadowColor: THEME_COLORS.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, },
      android: { elevation: 5, },
    }),
    marginBottom: THEME_SIZES.padding * 2,
  },
  formTitle: {
    fontSize: THEME_SIZES.h3,
    fontWeight: 'bold',
    color: THEME_COLORS.primary,
    textAlign: 'center',
    marginBottom: THEME_SIZES.padding * 1.5,
  },
  pickerOuterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: THEME_SIZES.radius,
    marginBottom: THEME_SIZES.padding,
    height: THEME_SIZES.inputHeight,
    paddingHorizontal: THEME_SIZES.padding / 2,
    backgroundColor: THEME_COLORS.white,
  },
  pickerIcon: {
    marginRight: THEME_SIZES.padding / 2,
  },
  pickerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  picker: {
    height: '100%',
    width: '100%',
    color: THEME_COLORS.text,
    backgroundColor: 'transparent',
  },
  pickerItem: {
    fontSize: THEME_SIZES.body,
    color: THEME_COLORS.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: THEME_SIZES.radius,
    marginBottom: THEME_SIZES.padding,
    height: THEME_SIZES.inputHeight,
    paddingHorizontal: THEME_SIZES.padding / 2,
    backgroundColor: THEME_COLORS.white,
  },
  inputIcon: {
    marginRight: THEME_SIZES.padding / 2,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: THEME_SIZES.body,
    color: THEME_COLORS.text,
  },
  loginButton: {
    backgroundColor: THEME_COLORS.primary,
    height: THEME_SIZES.buttonHeight,
    borderRadius: THEME_SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME_SIZES.padding / 2,
  },
  loginButtonText: {
    color: THEME_COLORS.white,
    fontWeight: 'bold',
    fontSize: THEME_SIZES.body,
  },
  disabledButton: {
    backgroundColor: THEME_COLORS.disabled,
  },
  footerText: {
    fontSize: THEME_SIZES.caption,
    color: THEME_COLORS.lightText,
    textAlign: 'center',
    marginTop: THEME_SIZES.padding,
  }
});