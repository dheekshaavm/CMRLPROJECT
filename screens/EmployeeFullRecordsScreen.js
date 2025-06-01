// --- START OF FILE EmployeeFullRecordsScreen.js ---
// This version fetches full history from the MySQL backend via apiClient
// and correctly displays timestamps in local time.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Linking, Platform
} from 'react-native';
import { auth } from '../firebaseConfig'; 
import apiClient from '../src/api/apiClient'; 
import { MaterialIcons } from '@expo/vector-icons';

console.log("<<<<< RUNNING EmployeeFullRecordsScreen - V_API_CLIENT_DATE_FIX_COMPLETE - " + new Date().toISOString() + " >>>>>");

const THEME_COLORS = {
  primary: '#0033cc', secondary: '#0056b3', text: '#333333', lightText: '#6c757d',
  background: '#F0F2F5', surface: '#FFFFFF', border: '#CED4DA', white: '#FFFFFF',
  onTime: '#28a745', late: '#dc3545', clockOutStatus: '#17a2b8', accent: '#ff9800', black: '#000',
  // Added disabled colors for consistency if CustomAppButton is used with disabled prop here
  disabled: '#E9ECEF', disabledText: '#6c757d', 
};
const THEME_SIZES = { 
    padding: 16, radius: 8, body: 16, caption: 12, h3: 20, 
    buttonHeight: 48, // Adjusted for CustomAppButton consistency
    // Added from EmployeeHomeScreen for consistency
    inputHeight: 50, 
    shadow: { shadowColor: THEME_COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, }
};

const HeaderButton = ({ title, onPress, iconName, color }) => (
  <TouchableOpacity onPress={onPress} style={styles.headerButton}>
    {iconName && <MaterialIcons name={iconName} size={24} color={color || THEME_COLORS.white} style={{ marginRight: title ? 5 : 0 }} />}
    {title && <Text style={[styles.headerButtonText, { color: color || THEME_COLORS.white }]}>{title}</Text>}
  </TouchableOpacity>
);

const CustomAppButton = ({ title, onPress, style, textStyle, iconName, secondary, disabled }) => ( // Added disabled prop
  <TouchableOpacity
    style={[
        styles.appButtonBase,
        secondary ? styles.appButtonSecondary : styles.appButtonPrimary,
        disabled && styles.appButtonDisabled, // Use disabled style
        style
    ]}
    onPress={onPress} 
    activeOpacity={disabled ? 1 : 0.8}  // Adjust opacity if disabled
    disabled={disabled} // Pass disabled prop
  >
    {iconName && <MaterialIcons name={iconName} size={20} color={disabled ? THEME_COLORS.disabledText : (secondary ? THEME_COLORS.primary : THEME_COLORS.white)} style={{ marginRight: 8 }} />}
    <Text style={[styles.appButtonTextBase, secondary ? styles.appButtonTextSecondary : styles.appButtonTextPrimary, disabled && styles.appButtonTextDisabled, textStyle]}>{title}</Text>
  </TouchableOpacity>
);

export default function EmployeeFullRecordsScreen({ route, navigation }) {
  const { employeeId, userName, department } = route.params;
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLateOnly, setShowLateOnly] = useState(false);

  const handleSignOut = () => { auth.signOut().then(() => { navigation.replace('Login'); }).catch(error => Alert.alert("Sign Out Error", error.message)); };
  
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: `${userName}'s History`,
      headerStyle: { backgroundColor: THEME_COLORS.primary }, headerTintColor: THEME_COLORS.white, headerTitleStyle: { fontWeight: 'bold' },
      headerLeft: () => ( <HeaderButton onPress={() => navigation.navigate('EmployeeHome', { userName: userName, employeeId: employeeId, department: department })} title="Home" iconName="home" /> ),
      headerRight: () => ( <HeaderButton onPress={handleSignOut} title="Sign Out" iconName="logout" /> ),
    });
  }, [navigation, userName, employeeId, department]);

  const fetchRecords = useCallback(async () => {
    if (!employeeId) { Alert.alert("Error", "Employee ID not provided."); setLoading(false); return; }
    console.log(`[EmpFullRecords API DATE_FIX] Fetching full history for employeeId: ${employeeId}`);
    setLoading(true);
    try {
      const response = await apiClient.get(`/attendance/history/${employeeId}`);
      console.log('[EmpFullRecords API DATE_FIX] API Response:', JSON.stringify(response.data, null, 2));
      if (response.data && Array.isArray(response.data)) {
        setRecords(response.data); 
      } else {
        console.warn('[EmpFullRecords API DATE_FIX] Unexpected data format from API:', response.data);
        setRecords([]);
      }
    } catch (error) {
      console.error('[EmpFullRecords API DATE_FIX] Error fetching full history:', error.response?.data || error.message);
      Alert.alert("Fetch Error", `Could not fetch history: ${error.response?.data?.error || error.message}`);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const openLocationInMap = (lat, lon) => {
    if (lat == null || lon == null) { Alert.alert("Location Missing", "Location data not available."); return; }
    const latitude = parseFloat(lat); const longitude = parseFloat(lon);
    if (isNaN(latitude) || isNaN(longitude)) { Alert.alert("Invalid Location", "Coordinates are invalid."); return; }
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(googleMapsUrl).catch(err => {
        console.error("Couldn't load map", err);
        Alert.alert("Map Error", "Could not open map application.");
    });
  };

  const filteredRecords = showLateOnly 
    ? records.filter(r => r.type === 'clock_in' && r.late === true) 
    : records;

  const renderItem = ({ item }) => { 
    const recordDate = new Date(item.timestamp); 
    let recordTypeIcon = "help-outline";
    let recordTypeColor = THEME_COLORS.lightText;
    let recordTypeText = item.type; 

    if (item.type === 'clock_in') {
        recordTypeIcon = "login"; recordTypeText = item.late ? "Clock In (Late)" : "Clock In (On Time)";
        recordTypeColor = item.late ? THEME_COLORS.late : THEME_COLORS.onTime;
    } else if (item.type === 'clock_out') {
        recordTypeIcon = "logout"; recordTypeText = "Clock Out";
        recordTypeColor = THEME_COLORS.clockOutStatus;
    } else if (item.type === 'login_event') { 
        recordTypeIcon = "meeting_room"; recordTypeText = "System Login";
        recordTypeColor = THEME_COLORS.secondary; 
    }

    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
            <MaterialIcons name={recordTypeIcon} size={22} color={recordTypeColor} />
            <Text style={[styles.recordType, { color: recordTypeColor }]}>{recordTypeText}</Text>
        </View>
        <Text style={styles.recordDateTime}>
          {recordDate.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          {' at '}
          {recordDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {item.type === 'clock_out' && item.earlyCheckoutReason && item.earlyCheckoutReason !== 'SYSTEM_LOGIN' && (
            <Text style={styles.reasonText}>Reason: {item.earlyCheckoutReason}</Text>
        )}
        {(item.latitude != null && item.longitude != null) ? (
          <TouchableOpacity style={styles.mapButton} onPress={() => openLocationInMap(item.latitude, item.longitude)}>
            <MaterialIcons name="location-on" size={16} color={THEME_COLORS.white} />
            <Text style={styles.mapButtonText}>View Location</Text>
          </TouchableOpacity>
        ) : ( <Text style={styles.locationNotAvailable}>Location: Not Captured</Text> )}
      </View>
    );
  };

  if (loading) { return ( <View style={styles.centeredMessageContainer}><ActivityIndicator size="large" color={THEME_COLORS.primary}/><Text style={styles.loadingText}>Loading history...</Text></View> ); }
  
  return ( 
    <View style={styles.container}> 
      <View style={styles.filterButtonContainer}> 
        <CustomAppButton title={showLateOnly ? 'Show All Entries' : 'Show Only Late Clock-Ins'} onPress={() => setShowLateOnly(!showLateOnly)} iconName={showLateOnly ? "visibility" : "filter-alt"} secondary={showLateOnly} /> 
      </View> 
      {filteredRecords.length === 0 ? ( <View style={styles.centeredMessageContainer}><MaterialIcons name="hourglass-empty" size={48} color={THEME_COLORS.lightText} /><Text style={styles.emptyText}>No records found{showLateOnly ? " for late clock-ins." : "."}</Text></View> ) 
      : ( <FlatList data={filteredRecords} keyExtractor={(item) => item.id.toString()} renderItem={renderItem} contentContainerStyle={styles.listContent} /> )} 
    </View> 
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_COLORS.background },
  centeredMessageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: THEME_SIZES.padding * 2 },
  loadingText: { marginTop: THEME_SIZES.padding, fontSize: THEME_SIZES.body, color: THEME_COLORS.lightText },
  filterButtonContainer: { paddingHorizontal: THEME_SIZES.padding, paddingTop: THEME_SIZES.padding, paddingBottom: THEME_SIZES.padding/2 },
  recordCard: { backgroundColor: THEME_COLORS.surface, borderRadius: THEME_SIZES.radius, padding: THEME_SIZES.padding, marginHorizontal: THEME_SIZES.padding, marginBottom: THEME_SIZES.padding, ...Platform.select({ ios: { shadowColor: THEME_COLORS.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, }, android: { elevation: 2, }, }), },
  recordHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: THEME_SIZES.padding / 2, },
  recordType: { fontSize: THEME_SIZES.body, fontWeight: 'bold', marginLeft: THEME_SIZES.padding / 2, },
  recordDateTime: { fontSize: THEME_SIZES.caption + 1, color: THEME_COLORS.lightText, marginBottom: THEME_SIZES.padding / 2, },
  reasonText: { fontSize: THEME_SIZES.caption, fontStyle: 'italic', color: THEME_COLORS.lightText, marginTop: 3, marginBottom: THEME_SIZES.padding / 2, backgroundColor: `${THEME_COLORS.primary}1A`, padding: THEME_SIZES.padding/2, borderRadius: THEME_SIZES.radius/2 },
  mapButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME_COLORS.accent, paddingVertical: 8, paddingHorizontal: 12, borderRadius: THEME_SIZES.radius - 2, marginTop: THEME_SIZES.padding / 2, alignSelf:'flex-start' },
  mapButtonText: { color: THEME_COLORS.white, marginLeft: 8, fontWeight: '600', fontSize: THEME_SIZES.caption },
  locationNotAvailable: { fontSize: THEME_SIZES.caption, color: THEME_COLORS.lightText, marginTop: THEME_SIZES.padding / 2, fontStyle: 'italic' },
  emptyText: { textAlign: 'center', fontSize: THEME_SIZES.body, color: THEME_COLORS.lightText, marginTop: THEME_SIZES.padding, },
  listContent: { paddingTop: THEME_SIZES.padding / 2, paddingBottom: THEME_SIZES.padding, },
  headerButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: THEME_SIZES.padding * 0.75, },
  headerButtonText: { fontSize: THEME_SIZES.body -1, fontWeight: '600', },
  appButtonBase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: THEME_SIZES.buttonHeight, borderRadius: THEME_SIZES.radius, paddingHorizontal: THEME_SIZES.padding, }, // Adjusted height
  appButtonPrimary: { backgroundColor: THEME_COLORS.primary, },
  appButtonSecondary: { backgroundColor: THEME_COLORS.surface, borderWidth: 1.5, borderColor: THEME_COLORS.primary, }, // Adjusted border
  appButtonDisabled: { backgroundColor: THEME_COLORS.disabled, borderWidth: 0 },
  appButtonTextBase: { fontSize: THEME_SIZES.body, fontWeight: 'bold', }, // Adjusted font size
  appButtonTextPrimary: { color: THEME_COLORS.white, },
  appButtonTextSecondary: { color: THEME_COLORS.primary, },
  appButtonTextDisabled: { color: THEME_COLORS.disabledText, } // Added for disabled text
});
// --- END OF FILE EmployeeFullRecordsScreen.js ---