// screens/EmployeeHomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Alert as NativeAlert, ScrollView, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator, Platform, Linking, Modal
} from 'react-native';
import * as Location from 'expo-location';
import apiClient from '../src/api/apiClient'; // Adjust path if necessary
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

console.log("<<<<< RUNNING EmployeeHomeScreen - V_ACTION_LOCATION_FIX - " + new Date().toISOString() + " >>>>>");

// --- THEME ---
const THEME_COLORS = {
  primary: '#0D47A1', primary_variant: '#1976D2', secondary: '#FFB300',
  text_primary: '#212121', text_secondary: '#757575', lightText: '#9E9E9E',
  background: '#F4F6F8', surface: '#FFFFFF', border: '#CED4DA', border_light: '#E0E0E0',
  white: '#FFFFFF', black: '#000000',
  success: '#4CAF50', error: '#F44336',
  disabled: '#E0E0E0', disabled_text: '#BDBDBD',
  green_50: '#E8F5E9', green_500: '#4CAF50', green_700: '#2E7D32',
  yellow_200: '#FFF9C4', yellow_800: '#795548',
  orange_200: '#FFE0B2', orange_800: '#E65100',
  blue_500: '#1976D2',
  gray_50: '#FAFAFA', gray_200: '#EEEEEE', gray_500: '#9E9E9E', gray_600: '#757575',
  infoBackground: '#e9f5fe', infoText: '#004085', infoBorder: '#c3d9ec',
};
const THEME_SIZES = {
    padding: 20, card_padding: 16, radius: 8, body: 15, caption: 12, label: 13,
    h1: 28, h3: 18, buttonHeight: 48, inputHeight: 50,
    shadow: { shadowColor: THEME_COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, }
};
const OFFICIAL_START_HOUR = 13;
const OFFICIAL_START_MINUTE = 0;
const MIN_WORK_DURATION_HOURS = 8;
const MIN_ENGAGEMENT_SECONDS_FOR_EARLY_CHECKOUT_PROMPT = 1;

// --- Helper Components ---
const CustomAppButton = ({ title, onPress, variant = 'primary', style, textStyle, isLoading, iconName, disabled }) => {
  let buttonStyle = styles.buttonPrimary;
  let buttonTextStyle = styles.buttonTextPrimary;
  let iconColor = THEME_COLORS.white;
  if (variant === 'danger') { buttonStyle = styles.buttonDanger; }
  else if (variant === 'secondary') { buttonStyle = styles.buttonSecondary; buttonTextStyle = styles.buttonTextSecondary; iconColor = THEME_COLORS.primary_variant; }
  return (
    <TouchableOpacity
      style={[styles.buttonBase, buttonStyle, disabled && styles.buttonDisabled, style]}
      onPress={onPress} activeOpacity={disabled || isLoading ? 1 : 0.7} disabled={disabled || isLoading}
    >
      {isLoading ? <ActivityIndicator color={variant === 'secondary' ? THEME_COLORS.primary_variant : THEME_COLORS.white} size="small"/> :
        <>{iconName && <MaterialIcons name={iconName} size={20} color={disabled ? THEME_COLORS.disabled_text : iconColor} style={{ marginRight: 8 }} />}
          <Text style={[styles.buttonTextBase, buttonTextStyle, disabled && styles.buttonTextDisabled, textStyle]}>{title}</Text></>}
    </TouchableOpacity>
  );
};
const Card = ({ title, children, style }) => (
  <View style={[styles.card, style]}>
    {title && <Text style={styles.cardTitle}>{title}</Text>}{children}
  </View>
);
const CustomAlert = ({ type = 'error', message, onClose }) => (
  <View style={[styles.customAlert, type === 'error' ? styles.alertError : styles.alertInfo]}>
    <Text style={type === 'error' ? styles.alertErrorText : styles.alertInfoText}>{message}</Text>
    {onClose && <TouchableOpacity onPress={onClose} style={styles.alertCloseButton}><MaterialIcons name="close" size={20} color={type === 'error' ? THEME_COLORS.error : THEME_COLORS.infoText} /></TouchableOpacity>}
  </View>
);
const formatDateTime = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    const datePart = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timePart = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart}, ${timePart}`;
  } catch (e) { return 'Invalid Date'; }
};
// --- End Helper Components ---

export default function EmployeeHomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const currentUser = {
    employee_id: route.params?.employeeId || 'N/A',
    name: route.params?.userName || 'Guest',
    department: route.params?.department || 'N/A',
    role: route.params?.role || 'Employee',
  };

  const [currentStatus, setCurrentStatus] = useState({
    isClockedIn: false, lastClockInId: null, clockInTime: undefined,
    clockInLocation: undefined, isLateAtClockIn: undefined,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // Unified loading state for clock in/out actions
  const [error, setError] = useState(null);
  const [showEarlyCheckoutModal, setShowEarlyCheckoutModal] = useState(false);
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState("");

  const getEmployeeStatusAndActivity = async (employeeIdStr) => {
    const callId = `GET_STATUS_ACTIVITY-${Date.now()}`;
    console.log(`[EHS ${callId}] getEmployeeStatusAndActivity called for: ${employeeIdStr}`);
    if (!employeeIdStr || employeeIdStr === 'N/A') {
      return { records: [], currentStatusInfo: { isClockedIn: false, lastClockInId: null, clockInTime: undefined, clockInLocation: undefined, isLateAtClockIn: undefined } };
    }
    const statusRes = await apiClient.get(`/attendance/status/${employeeIdStr}`);
    console.log(`[EHS ${callId}] /attendance/status response:`, JSON.stringify(statusRes.data, null, 2));
    const recentRes = await apiClient.get(`/attendance/recent/${employeeIdStr}`);
    console.log(`[EHS ${callId}] /attendance/recent RAW response data (first 500 chars):`, JSON.stringify(recentRes.data, null, 2).substring(0,500)+"...");

    let currentStatusInfo = { isClockedIn: false, lastClockInId: null, clockInTime: undefined, clockInLocation: undefined, isLateAtClockIn: undefined };
    if (statusRes.data && statusRes.data.type === 'clock_in') {
        currentStatusInfo = {
            isClockedIn: true,
            lastClockInId: statusRes.data.id,
            clockInTime: statusRes.data.timestamp,
            clockInLocation: (statusRes.data.latitude != null && statusRes.data.longitude != null) ? { latitude: parseFloat(statusRes.data.latitude), longitude: parseFloat(statusRes.data.longitude) } : undefined,
            isLateAtClockIn: statusRes.data.is_late, // Ensure backend sends this as boolean or 0/1
        };
    }
    const flatRecentRecords = Array.isArray(recentRes.data) ? recentRes.data.flatMap(dayGroup => dayGroup.records.map(r => ({...r, key: r.id || `${dayGroup.date}-${r.timestamp}` }))) : [];
    flatRecentRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (flatRecentRecords.length > 0) {
        const sampleClockIn = flatRecentRecords.find(r => r.type === 'clock_in');
        if (sampleClockIn) {
            console.log(`[EHS ${callId}] Sample CLOCK_IN from recent (frontend):`, JSON.stringify(sampleClockIn, null, 2));
        }
    }
    console.log(`[EHS ${callId}] getEmployeeStatusAndActivity returning currentStatusInfo:`, JSON.stringify(currentStatusInfo, null, 2));
    return { records: flatRecentRecords.slice(0, 10), currentStatusInfo };
  };

  const clockInEmployee = async (employeeData, uniqueActionId) => {
    console.log(`[EHS ${uniqueActionId}] clockInEmployee called`);
    // ... (location permission and fetching logic remains the same)
    const { status } = await Location.requestForegroundPermissionsAsync(); if (status !== 'granted') throw new Error('Location permission denied.');
    const locData = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    console.log(`[EHS ${uniqueActionId}] Location for clock-in:`, locData.coords);
    const now = new Date();
    const officialStart = new Date(now); officialStart.setHours(OFFICIAL_START_HOUR, OFFICIAL_START_MINUTE, 0, 0);
    const isLate = now > officialStart;
    console.log(`[EHS ${uniqueActionId}] Clock-In Time: Now: ${now.toISOString()}, OfficialStart: ${officialStart.toISOString()}, IsLate: ${isLate}`);
    const payload = { employeeId: employeeData.employee_id, userName: employeeData.name, department: employeeData.department, timestamp: now.toISOString(), latitude: locData.coords.latitude, longitude: locData.coords.longitude, late: isLate };
    console.log(`[EHS ${uniqueActionId}] Clock-In Payload:`, JSON.stringify(payload));
    const response = await apiClient.post('/attendance/clock-in', payload);
    console.log(`[EHS ${uniqueActionId}] Clock-In API Response:`, JSON.stringify(response.data));
    return response;
  };

  const clockOutEmployee = async (employeeData, clockInId, reasonForCheckout, uniqueActionId) => {
    console.log(`[EHS ${uniqueActionId}] clockOutEmployee. clockInId: ${clockInId}, Reason: ${reasonForCheckout}`);
    // ... (location permission and fetching logic remains the same)
    if (!clockInId) { throw new Error("Cannot clock out: Missing clock-in reference ID."); }
    const { status } = await Location.requestForegroundPermissionsAsync(); if (status !== 'granted') throw new Error('Location permission denied.');
    const locData = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    console.log(`[EHS ${uniqueActionId}] Location for clock-out:`, locData.coords);
    const payload = { employeeId: employeeData.employee_id, clockInRefId: clockInId, timestamp: new Date().toISOString(), latitude: locData.coords.latitude, longitude: locData.coords.longitude, earlyCheckoutReason: reasonForCheckout || null };
    console.log(`[EHS ${uniqueActionId}] Clock-Out Payload:`, JSON.stringify(payload));
    const response = await apiClient.post('/attendance/clock-out', payload);
    console.log(`[EHS ${uniqueActionId}] Clock-Out API Response:`, JSON.stringify(response.data));
    return response;
  };

  const fetchStatusAndActivity = useCallback(async () => {
    const fetchId = `FSA-${Date.now()}`;
    console.log(`[EHS ${fetchId}] fetchStatusAndActivity triggered. employee_id: ${currentUser.employee_id}`);
    if (!currentUser || currentUser.employee_id === 'N/A') { setIsLoading(false); setError("Employee details not available."); return; }
    setIsLoading(true); setError(null);
    try {
      const { records, currentStatusInfo } = await getEmployeeStatusAndActivity(currentUser.employee_id);
      setRecentActivity(records); setCurrentStatus(currentStatusInfo);
    } catch (err) { console.error(`[EHS ${fetchId}] Error in fetchStatusAndActivity:`, err); setError(err.message || "Failed to fetch data."); setCurrentStatus({ isClockedIn: false, lastClockInId: null, clockInTime: undefined, clockInLocation: undefined, isLateAtClockIn: undefined }); setRecentActivity([]); }
    finally { setIsLoading(false); }
  }, [currentUser.employee_id]);

  useFocusEffect(fetchStatusAndActivity);

  const handleClockIn = async () => {
    const uniqueActionId = `CIN-${Date.now()}`;
    console.log(`[EHS ${uniqueActionId}] handleClockIn initiated. Current actionLoading: ${actionLoading}`);
    if (actionLoading) { console.warn(`[EHS ${uniqueActionId}] IGNORED: Action already in progress.`); return; }
    setActionLoading(true); setError(null);
    try {
      await clockInEmployee(currentUser, uniqueActionId);
      NativeAlert.alert("Success", "Clocked in successfully!");
      await fetchStatusAndActivity();
    } catch (err) { console.error(`[EHS ${uniqueActionId}] handleClockIn Error:`, err); setError(err.message || "Clock-in failed."); NativeAlert.alert("Error", err.response?.data?.error || err.message || "Clock-in failed.");}
    finally { setActionLoading(false); }
  };

  const handleClockOut = async () => {
    const uniqueActionId = `COUT_HANDLER-${Date.now()}`;
    console.log(`[EHS ${uniqueActionId}] handleClockOut initiated. actionLoading: ${actionLoading}, isClockedIn: ${currentStatus.isClockedIn}`);
    if (actionLoading) { console.warn(`[EHS ${uniqueActionId}] IGNORED: Action already in progress.`); return; }
    if (currentStatus.isClockedIn && currentStatus.clockInTime) {
      const clockInDate = new Date(currentStatus.clockInTime); const now = new Date(); const durationMillis = now.getTime() - clockInDate.getTime(); const durationHours = durationMillis / 3600000; const durationSeconds = durationMillis / 1000;
      if (durationHours < MIN_WORK_DURATION_HOURS && durationSeconds > MIN_ENGAGEMENT_SECONDS_FOR_EARLY_CHECKOUT_PROMPT) {
        console.log(`[EHS ${uniqueActionId}] Early checkout condition met. Showing modal.`); setShowEarlyCheckoutModal(true); return;
      }
    } else if (!currentStatus.isClockedIn) { NativeAlert.alert("Info", "You are not currently clocked in."); fetchStatusAndActivity(); return; }
    console.log(`[EHS ${uniqueActionId}] Proceeding with normal clock-out.`);
    performClockOut(undefined, uniqueActionId + "_direct");
  };

  const performClockOut = async (reasonFromModal, parentActionId = "UNKNOWN") => {
    const uniqueActionId = `PERFORM_COUT-${Date.now()}`;
    console.log(`[EHS ${uniqueActionId} (from ${parentActionId})] performClockOut. Reason: ${reasonFromModal}, lastClockInId: ${currentStatus.lastClockInId}, actionLoading: ${actionLoading}`);
    if (actionLoading) { console.warn(`[EHS ${uniqueActionId}] IGNORED: Action already in progress.`); return; }
    if (!currentStatus.lastClockInId) { const msg = "Cannot clock out: Missing lastClockInId."; setError(msg); NativeAlert.alert("Error", msg); setActionLoading(false); fetchStatusAndActivity(); return; }
    setActionLoading(true); setError(null); if (showEarlyCheckoutModal) setShowEarlyCheckoutModal(false);
    try {
      await clockOutEmployee(currentUser, currentStatus.lastClockInId, reasonFromModal || earlyCheckoutReason, uniqueActionId);
      NativeAlert.alert("Success", "Clocked out successfully!"); setEarlyCheckoutReason("");
      await fetchStatusAndActivity();
    } catch (err) { console.error(`[EHS ${uniqueActionId}] performClockOut Error:`, err); setError(err.message || "Clock-out failed."); NativeAlert.alert("Error", err.response?.data?.error || err.message || "Clock-out failed."); }
    finally { setActionLoading(false); }
  };
  const handleSignOut = async () => {
    console.log('[EHS_DIAG] Sign out for:', currentUser.employee_id);
    try { if (currentUser.employee_id && currentUser.employee_id !== 'N/A') { await apiClient.post('/auth/employee/logout', { employeeId: currentUser.employee_id }); }}
    catch (error){ console.error("[EHS_DIAG] Logout API Error:", error.response?.data || error.message); } finally { navigation.replace('Login'); }
  };
  React.useLayoutEffect(() => {
    navigation.setOptions({ title: `Employee Portal`, headerStyle: { backgroundColor: THEME_COLORS.primary }, headerTintColor: THEME_COLORS.white, headerTitleStyle: { fontWeight: '600', fontSize: THEME_SIZES.h3 -1 }, headerLeft: () => null, headerRightContainerStyle: { paddingRight: 10 }, headerRight: () => (<TouchableOpacity onPress={handleSignOut} style={{ paddingHorizontal: 10 }}><MaterialIcons name="logout" size={24} color={THEME_COLORS.white} /></TouchableOpacity>), headerBackVisible: false, });
  }, [navigation, currentUser.employee_id]);


  const renderActivityItem = ({ item, index }) => {
    // Add a log here to inspect each item being rendered for the recent activity list
    console.log(`[EHS_DIAG] renderActivityItem for Recent Activity: ID=${item.id}, Type=${item.type}, Lat=${item.latitude}, Lon=${item.longitude}`);

    const isClockIn = item.type === 'clock_in';
    let eventTypeText = item.type.replace('_', ' ');
    let eventTypeColor = isClockIn ? (item.late ? THEME_COLORS.error : THEME_COLORS.success) : THEME_COLORS.primary_variant;
    let eventIconName = isClockIn ? "login" : "logout";

    if (item.type === 'login_event') {
        eventTypeText = "System Login"; eventTypeColor = THEME_COLORS.secondary; eventIconName = "meeting-room";
    }

    const handleOpenMap = () => {
      console.log('[EHS_DIAG] View Map pressed. Lat:', item.latitude, 'Lon:', item.longitude, 'for item ID:', item.id);
      if (item.latitude != null && item.longitude != null) {
        const lat = parseFloat(item.latitude); const lon = parseFloat(item.longitude);
        if (isNaN(lat) || isNaN(lon)) { NativeAlert.alert("Map Error", "Invalid location coordinates."); return; }
        const mapUrl = `https://www.google.com/maps?q=${lat},${lon}`;
        Linking.openURL(mapUrl).catch(err => { NativeAlert.alert("Map Error", "Could not open map app."); });
      } else { NativeAlert.alert("Map Error", "Location data not available."); }
    };

    return (
      <View style={styles.activityItemHorizontal} key={item.id?.toString() || `activity-${index}`}>
        <Text style={styles.activityTimestampColumn}>{formatDateTime(item.timestamp)}</Text>
        <View style={styles.activityEventDetailsColumn}>
          <View style={styles.activityEventTypeContainerHorizontal}>
            <MaterialIcons name={eventIconName} size={18} color={eventTypeColor} style={styles.activityEventIconHorizontal} />
            <Text style={[styles.activityEventTypeTextHorizontal, { color: eventTypeColor }]}>{eventTypeText}</Text>
          </View>
        </View>
        <View style={styles.activityStatusReasonColumn}>
            {item.late && isClockIn && (<View style={[styles.tagHorizontal, styles.lateTag]}><Text style={styles.tagTextHorizontal}>Late</Text></View>)}
            {item.earlyCheckoutReason && !isClockIn && item.earlyCheckoutReason !== 'SYSTEM_LOGIN' && (<View style={[styles.tagHorizontal, styles.earlyTag]}><Text style={styles.tagTextHorizontal} numberOfLines={1}>{item.earlyCheckoutReason}</Text></View>)}
            {item.type === 'login_event' && (<Text style={styles.systemAccessText} numberOfLines={1}>System Access</Text>)}
        </View>
        <View style={styles.activityLocationColumn}>
          {(item.latitude != null && item.longitude != null) ? (
            <TouchableOpacity style={styles.mapLinkContainerHorizontal} onPress={handleOpenMap}>
              <MaterialIcons name="location-on" size={16} color={THEME_COLORS.blue_500} />
              <Text style={styles.mapLinkTextHorizontal}>View Map</Text>
            </TouchableOpacity>
          ) : (<View style={styles.mapLinkContainerHorizontal}></View>)}
        </View>
      </View>
    );
  };

  if (!currentUser || currentUser.employee_id === 'N/A') { return (<View style={styles.loadingContainer}><MaterialIcons name="error-outline" size={48} color={THEME_COLORS.error} /><Text style={styles.loadingText}>Error: Employee data not available.</Text><CustomAppButton title="Go to Login" onPress={() => navigation.replace('Login')} style={{marginTop: 20}} /></View>); }
  if (isLoading) { return (<View style={styles.loadingContainer}><ActivityIndicator size="large" color={THEME_COLORS.primary} /><Text style={styles.loadingText}>Loading dashboard...</Text></View>); }

  // console.log('[EHS_DIAG] FINAL RENDER. currentStatus:', JSON.stringify(currentStatus, null, 2));

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>
      <Card title={`Welcome, ${currentUser.name}!`} style={styles.welcomeCard}>
        <View style={styles.userInfoGrid}>
            <View style={styles.userInfoColumn}>
                <View style={styles.userInfoRow}><Text style={styles.userInfoLabel}>Employee ID:</Text><Text style={styles.userInfoValue}>{currentUser.employee_id}</Text></View>
                <View style={styles.userInfoRow}><Text style={styles.userInfoLabel}>Department:</Text><Text style={styles.userInfoValue}>{currentUser.department}</Text></View>
                <View style={styles.userInfoRow}><Text style={styles.userInfoLabel}>Role:</Text><Text style={styles.userInfoValue}>{currentUser.role}</Text></View>
            </View>
            <View style={styles.actionsColumn}>
                {error && <CustomAlert type="error" message={error} onClose={() => setError(null)} />}
                {currentStatus.isClockedIn ? (
                <View style={styles.statusBoxClockedIn}>
                    <Text style={styles.statusBoxTitle}>Currently Clocked In {currentStatus.isLateAtClockIn === true ? '(Late)' : (currentStatus.isLateAtClockIn === false ? '(On Time)' : '')}</Text>
                    {currentStatus.clockInTime && <Text style={styles.statusBoxText}>Since: {formatDateTime(currentStatus.clockInTime)}</Text>}
                    {currentStatus.clockInLocation && (<View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}><MaterialIcons name="location-on" size={14} color={THEME_COLORS.green_700}/><Text style={[styles.statusBoxText, {marginLeft: 4}]}>{currentStatus.clockInLocation.latitude.toFixed(3)}, {currentStatus.clockInLocation.longitude.toFixed(3)}</Text></View>)}
                    <CustomAppButton title="Clock Out" onPress={handleClockOut} variant="danger" style={{ marginTop: THEME_SIZES.padding * 0.75, width: '100%' }} isLoading={actionLoading}/>
                </View>
                ) : ( <CustomAppButton title="Clock In" onPress={handleClockIn} variant="primary" style={{ width: '100%' }} isLoading={actionLoading}/> )}
            </View>
        </View>
      </Card>
      <Modal animationType="slide" transparent={true} visible={showEarlyCheckoutModal} onRequestClose={() => { setShowEarlyCheckoutModal(false); setEarlyCheckoutReason(""); }}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Early Checkout Reason</Text><TextInput style={styles.modalTextarea} placeholder="Please provide a reason..." placeholderTextColor={THEME_COLORS.gray_500} value={earlyCheckoutReason} onChangeText={setEarlyCheckoutReason} multiline numberOfLines={3} /><View style={styles.modalButtonContainer}><CustomAppButton title="Cancel" variant="secondary" onPress={() => { setShowEarlyCheckoutModal(false); setEarlyCheckoutReason("");}} style={{ flex: 1, marginRight: 8 }}/><CustomAppButton title="Submit" variant="primary" onPress={() => performClockOut(earlyCheckoutReason)} isLoading={actionLoading} disabled={!earlyCheckoutReason.trim()} style={{ flex: 1 }}/></View></View></View>
      </Modal>
      <Card title="Recent Activity" style={styles.recentActivityCard}>
        {recentActivity.length === 0 && !isLoading && <Text style={styles.noActivityText}>No recent activity found.</Text>}
        {recentActivity.map((item, index) => renderActivityItem({item, index}))}
         <View style={{ marginTop: THEME_SIZES.padding, alignItems: 'center' }}>
          <CustomAppButton title="View Full Attendance History" variant="secondary"
            onPress={() => navigation.navigate('EmployeeFullRecords', { employeeId: currentUser.employee_id, userName: currentUser.name, department: currentUser.department })}/>
        </View>
      </Card>
    </ScrollView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  scrollView: { backgroundColor: THEME_COLORS.background, },
  scrollContentContainer: { padding: THEME_SIZES.padding, paddingBottom: THEME_SIZES.padding * 2, },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME_COLORS.background, },
  loadingText: { marginTop: THEME_SIZES.padding / 2, fontSize: THEME_SIZES.body, color: THEME_COLORS.lightText, },
  card: { backgroundColor: THEME_COLORS.surface, borderRadius: THEME_SIZES.radius, padding: THEME_SIZES.card_padding, marginBottom: THEME_SIZES.padding, ...Platform.select({ ios: { shadowColor: THEME_COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, }, android: { elevation: 3, }, }), },
  welcomeCard: { marginBottom: THEME_SIZES.padding * 1.25 },
  recentActivityCard: { marginTop: THEME_SIZES.padding * 1.25 },
  cardTitle: { fontSize: THEME_SIZES.h3, fontWeight: '600', color: THEME_COLORS.text_primary, marginBottom: THEME_SIZES.card_padding * 0.75, },
  userInfoGrid: { flexDirection: 'row', },
  userInfoColumn: { flex: 1, paddingRight: THEME_SIZES.padding * 0.3, },
  actionsColumn: { flex: 1, paddingLeft: THEME_SIZES.padding * 0.3, },
  userInfoRow: { marginBottom: THEME_SIZES.padding / 2, },
  userInfoLabel: { fontSize: THEME_SIZES.label, color: THEME_COLORS.gray_600, fontWeight: '500', marginBottom: 2, },
  userInfoValue: { fontSize: THEME_SIZES.body -1, color: THEME_COLORS.text_primary, },
  customAlert: { padding: THEME_SIZES.padding * 0.75, borderRadius: THEME_SIZES.radius / 2, marginBottom: THEME_SIZES.padding, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  alertError: { backgroundColor: `${THEME_COLORS.error}20`, borderWidth:1, borderColor: `${THEME_COLORS.error}50` },
  alertErrorText: { color: THEME_COLORS.error, fontSize: THEME_SIZES.body -1, flexShrink: 1 },
  alertInfo: { backgroundColor: THEME_COLORS.infoBackground, borderColor: THEME_COLORS.infoBorder, borderWidth: 1, },
  alertInfoText: { color: THEME_COLORS.infoText },
  alertCloseButton: { paddingLeft: 8, },
  statusBoxClockedIn: { padding: THEME_SIZES.padding, backgroundColor: THEME_COLORS.green_50, borderLeftWidth: 4, borderLeftColor: THEME_COLORS.green_500, borderRadius: THEME_SIZES.radius / 2, },
  statusBoxTitle: { fontWeight: '600', color: THEME_COLORS.green_700, fontSize: THEME_SIZES.body },
  statusBoxText: { fontSize: THEME_SIZES.caption, color: THEME_COLORS.gray_600, marginTop: 2 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', },
  modalContent: { backgroundColor: THEME_COLORS.surface, padding: THEME_SIZES.padding * 1.25, borderRadius: THEME_SIZES.radius, width: '90%', maxWidth: 400, ...Platform.select({ ios: THEME_SIZES.shadow, android: { elevation: 5, }}) },
  modalTitle: { fontSize: THEME_SIZES.h3, fontWeight: 'bold', color: THEME_COLORS.text_primary, marginBottom: THEME_SIZES.padding, textAlign: 'center' },
  modalTextarea: { borderWidth: 1, borderColor: THEME_COLORS.border, borderRadius: THEME_SIZES.radius / 1.5, padding: THEME_SIZES.padding * 0.75, fontSize: THEME_SIZES.body -1, minHeight: 70, textAlignVertical: 'top', marginBottom: THEME_SIZES.padding, backgroundColor: THEME_COLORS.white, },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: THEME_SIZES.padding * 0.75, },
  noActivityText: { color: THEME_COLORS.gray_500, textAlign: 'center', paddingVertical: THEME_SIZES.padding },
  activityItemHorizontal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: THEME_SIZES.padding * 0.7, paddingHorizontal: THEME_SIZES.padding * 0.2, backgroundColor: THEME_COLORS.surface, borderRadius: THEME_SIZES.radius / 1.5, borderBottomWidth: 1, borderBottomColor: THEME_COLORS.border_light, marginBottom: 0, },
  activityTimestampColumn: { flex: 0.32, paddingRight: THEME_SIZES.padding * 0.2, },
  activityTimestampTextHorizontal: { fontSize: THEME_SIZES.caption, color: THEME_COLORS.text_secondary, },
  activityEventDetailsColumn: { flex: 0.30, flexDirection: 'row', alignItems: 'center', paddingRight: THEME_SIZES.padding * 0.2, },
  activityEventIconHorizontal: { marginRight: 4, },
  activityEventTypeTextHorizontal: { fontWeight: '600', fontSize: THEME_SIZES.caption + 1, textTransform: 'capitalize', flexShrink: 1, },
  activityStatusReasonColumn: { flex: 0.23, alignItems: 'flex-start', paddingRight: THEME_SIZES.padding * 0.2, },
  activityLocationColumn: { flex: 0.15, alignItems: 'flex-end', },
  mapLinkContainerHorizontal: { flexDirection: 'row', alignItems: 'center', },
  mapLinkTextHorizontal: { fontSize: THEME_SIZES.caption - 1, color: THEME_COLORS.blue_500, textDecorationLine: 'underline', marginLeft: 2, },
  tagHorizontal: { paddingHorizontal: THEME_SIZES.padding / 2.5, paddingVertical: THEME_SIZES.padding / 6, borderRadius: THEME_SIZES.radius / 1.5, },
  tagTextHorizontal: { fontWeight: '600', fontSize: THEME_SIZES.caption - 2, },
  systemAccessText: { fontSize: THEME_SIZES.caption -1, color: THEME_COLORS.text_secondary, fontStyle: 'italic',},
  lateTag: { backgroundColor: THEME_COLORS.yellow_200, },
  earlyTag: { backgroundColor: THEME_COLORS.orange_200, },
  buttonBase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: THEME_SIZES.buttonHeight - 8, borderRadius: THEME_SIZES.radius, paddingHorizontal: THEME_SIZES.padding * 0.8, },
  buttonPrimary: { backgroundColor: THEME_COLORS.primary },
  buttonDanger: { backgroundColor: THEME_COLORS.error },
  buttonSecondary: { backgroundColor: THEME_COLORS.surface, borderWidth: 1, borderColor: THEME_COLORS.primary_variant, },
  buttonDisabled: { backgroundColor: THEME_COLORS.disabled, borderWidth: 1, borderColor: THEME_COLORS.border_light },
  buttonTextBase: { fontSize: THEME_SIZES.body -1, fontWeight: '600', },
  buttonTextPrimary: { color: THEME_COLORS.white, },
  buttonTextSecondary: { color: THEME_COLORS.primary_variant, },
  buttonTextDisabled: { color: THEME_COLORS.disabled_text, }
});