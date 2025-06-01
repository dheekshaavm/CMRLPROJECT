// --- START OF FILE AdminViewReportsScreen.js ---
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  Alert, TouchableOpacity, Linking, TextInput, Platform // Ensure Linking is imported
} from 'react-native';
import apiClient from '../src/api/apiClient';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const THEME_COLORS = { primary: '#0033cc', text: '#333333', lightText: '#6c757d', placeholder: '#999999', background: '#F0F2F5', surface: '#FFFFFF', border: '#CED4DA', white: '#FFFFFF', onTime: '#28a745', late: '#dc3545', clockOutStatus: '#17a2b8', accent: '#ff9800', black: '#000000' };
const THEME_SIZES = { padding: 16, radius: 8, body: 16, caption: 12, h3: 20, inputHeight: 50, shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, } };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const HeaderButton = ({ title, onPress, iconName }) => ( <TouchableOpacity onPress={onPress} style={styles.headerButton}> {iconName && <MaterialIcons name={iconName} size={22} color={THEME_COLORS.primary} style={{ marginRight: title ? 5 : 0 }} />} {title && <Text style={styles.headerButtonText}>{title}</Text>} </TouchableOpacity> );
const CustomAppButton = ({ title, onPress, style, textStyle, iconName }) => ( <TouchableOpacity style={[styles.appButton, style]} onPress={onPress} activeOpacity={0.8}> {iconName && <MaterialIcons name={iconName} size={20} color={THEME_COLORS.white} style={{ marginRight: 8 }} />} <Text style={[styles.appButtonText, textStyle]}>{title}</Text> </TouchableOpacity> );


export default function AdminViewReportsScreen({ navigation }) {
  const [employeeData, setEmployeeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);

  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const currentYear = new Date().getFullYear();
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(currentYear);
  const [years, setYears] = useState([]);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  useEffect(() => { 
    const N_YEARS_BACK = 5; const y = [];
    for (let i = 0; i <= N_YEARS_BACK; i++) { y.push(currentYear - i); }
    setYears(y);
  }, [currentYear]);

  const deleteStoredItems = async () => { /* ... as defined previously ... */ 
    if (Platform.OS === 'web') { try { localStorage.removeItem('adminToken'); localStorage.removeItem('adminUser'); } catch (e) { console.error('Failed to remove from localStorage', e); }
    } else { try { const SecureStore = require('expo-secure-store'); await SecureStore.deleteItemAsync('adminToken'); await SecureStore.deleteItemAsync('adminUser'); } catch (e) { console.error('Failed to remove from SecureStore', e); } }
  };
  const handleSignOut = async () => { /* ... as defined previously ... */ await deleteStoredItems(); navigation.replace('Login'); };

  React.useLayoutEffect(() => { 
    navigation.setOptions({
      title: 'Employee Reports',
      headerLeft: () => ( <HeaderButton onPress={() => navigation.navigate('AdminDashboard')} title="Home" iconName="home" /> ),
      headerRight: () => ( <HeaderButton onPress={handleSignOut} title="Sign Out" iconName="logout" /> ),
      headerStyle: { backgroundColor: THEME_COLORS.surface, elevation: Platform.OS === 'android' ? 4 : 0, shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0, },
      headerTintColor: THEME_COLORS.primary,
      headerTitleStyle: { fontWeight: 'bold' },
    });
  }, [navigation]);

  const fetchReports = useCallback(async () => { /* ... as defined previously ... */ 
    setLoading(true); setEmployeeData([]); setInitialFetchDone(true); 
    try {
      const params = { month: filterMonth, year: filterYear };
      if (filterEmployeeId.trim()) { params.employeeIdString = filterEmployeeId.trim(); }
      const response = await apiClient.get('/attendance/admin-reports', { params });
      if (response.data && Array.isArray(response.data)) {
          if (response.data.length === 0) { Alert.alert("No Records", "No records found."); }
          setEmployeeData(response.data); 
      } else { setEmployeeData([]); Alert.alert("Data Error", "Unexpected data format."); }
    } catch (error) { console.error('[AdminViewReports] Error fetching reports:', error.response?.data || error.message); Alert.alert('Fetch Error', `Could not fetch reports: ${error.response?.data?.error || error.message}`); setEmployeeData([]);
    } finally { setLoading(false); }
  }, [filterEmployeeId, filterMonth, filterYear]);

  // *** ADD THIS FUNCTION BACK ***
  const openLocationInMap = (lat, lon) => {
    if (lat == null || lon == null) { // Check for null or undefined
      Alert.alert("Location Missing", "Location data is not available for this record.");
      return;
    }
    // Ensure lat and lon are numbers before trying to construct URL
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
        Alert.alert("Invalid Location", "Location coordinates are invalid.");
        return;
    }

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(googleMapsUrl).catch(err => {
      console.error("Couldn't load Google Maps page", err);
      Alert.alert("Map Error", "Could not open the map application.");
    });
  };

  const renderIndividualRecord = ({ item: record }) => {
    let statusText = 'N/A';
    let statusStyle = {};
    if (record.type === 'clock_in') {
      statusText = record.late ? 'Clock In (Late)' : 'Clock In (On Time)';
      statusStyle = record.late ? styles.lateText : styles.onTimeText;
    } else if (record.type === 'clock_out') {
      statusText = 'Clock Out';
      statusStyle = styles.clockOutText;
    }
    return (
      <View style={styles.individualRecordItem}>
        <Text style={styles.recordDetailText}>
          Time: <Text style={styles.recordStrongText}>{new Date(record.timestamp).toLocaleString()}</Text>
        </Text>
        <Text style={styles.recordDetailText}>
          Type: <Text style={[styles.recordStrongText, statusStyle]}>{statusText}</Text>
        </Text>
        {record.type === 'clock_out' && record.earlyCheckoutReason && (
          <Text style={styles.recordDetailText}>
            Early Checkout Reason: <Text style={styles.recordStrongText}>{record.earlyCheckoutReason}</Text>
          </Text>
        )}
        {/* Ensure record.latitude and record.longitude are passed from backend and are numbers */}
        {(record.latitude != null && record.longitude != null) ? (
          <TouchableOpacity
            style={styles.mapButtonSmall}
            onPress={() => openLocationInMap(record.latitude, record.longitude)}> {/* Call the function */}
            <MaterialIcons name="location-on" size={16} color={THEME_COLORS.white} />
            <Text style={styles.mapButtonTextSmall}>View Location</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.recordDetailText, { fontStyle: 'italic' }]}>Location: Not Captured</Text>
        )}
      </View>
    );
  };

  const renderEmployeeItem = ({ item: employee }) => {
    const isExpanded = expandedEmployeeId === employee.employeeId;
    return (
      <View style={styles.reportItemContainer}>
        <TouchableOpacity onPress={() => setExpandedEmployeeId(isExpanded ? null : employee.employeeId)} style={styles.employeeSummary}>
          <View style={styles.employeeHeader}>
            <MaterialIcons name="person" size={24} color={THEME_COLORS.primary} style={{marginRight: 8}}/>
            <Text style={styles.name}>{employee.userName} (ID: {employee.employeeId})</Text>
            <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={24} color={THEME_COLORS.primary} />
          </View>
          <View style={styles.summaryDetails}>
            <Text style={styles.summaryText}><Text style={{fontWeight: 'bold'}}>{employee.presentDaysCount}</Text> Present Days</Text>
            <Text style={[styles.summaryText, employee.lateDaysCount > 0 && styles.lateSummaryText]}>
                <Text style={{fontWeight: 'bold'}}>{employee.lateDaysCount}</Text> Late Clock-Ins
            </Text>
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <FlatList
            data={employee.records} 
            keyExtractor={(record) => record.id.toString()} 
            renderItem={renderIndividualRecord}
            style={styles.innerFlatList}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {/* ... Filter UI ... */}
        <Text style={styles.filterTitle}>Filter Reports</Text>
        <TextInput style={styles.input} placeholder="Employee ID (e.g., E1001)" value={filterEmployeeId} onChangeText={setFilterEmployeeId} placeholderTextColor={THEME_COLORS.placeholder}/>
        <View style={styles.dateFilterRow}>
            <View style={styles.pickerWrapper}>
                <Picker selectedValue={filterMonth} style={styles.picker} onValueChange={(itemValue) => setFilterMonth(itemValue)} itemStyle={styles.pickerItem} >
                    {MONTHS.map((month, index) => (<Picker.Item key={index} label={month} value={index} />))}
                </Picker>
            </View>
            <View style={styles.pickerWrapper}>
                <Picker selectedValue={filterYear} style={styles.picker} onValueChange={(itemValue) => setFilterYear(itemValue)} itemStyle={styles.pickerItem} >
                    {years.map((year) => (<Picker.Item key={year} label={year.toString()} value={year} />))}
                </Picker>
            </View>
        </View>
        <CustomAppButton title="Fetch Reports" onPress={fetchReports} iconName="search"/>
      </View>

      {loading ? ( <View style={styles.centeredMessageContainer}><ActivityIndicator size="large" color={THEME_COLORS.primary} /><Text style={styles.loadingText}>Loading Reports...</Text></View> )
      : employeeData.length === 0 && initialFetchDone ? ( <View style={styles.centeredMessageContainer}><MaterialIcons name="inbox" size={48} color={THEME_COLORS.lightText} /><Text style={styles.noDataText}>No reports found.</Text><Text style={styles.noDataSubText}>Try adjusting filters.</Text></View> )
      : employeeData.length === 0 && !initialFetchDone ? ( <View style={styles.centeredMessageContainer}><MaterialIcons name="filter-list" size={48} color={THEME_COLORS.lightText} /><Text style={styles.noDataText}>Apply filters and fetch reports.</Text></View> )
      : (
        <FlatList
          data={employeeData}
          keyExtractor={(item) => item.employeeId.toString()}
          renderItem={renderEmployeeItem}
          contentContainerStyle={styles.listContentContainer}
          ListHeaderComponent={() => employeeData.length > 0 ? <Text style={styles.reportListHeader}>Report Results:</Text> : null}
        />
      )}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_COLORS.background },
  centeredMessageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: THEME_SIZES.padding * 2, },
  loadingText: { marginTop: THEME_SIZES.padding, fontSize: THEME_SIZES.body, color: THEME_COLORS.lightText},
  filterContainer: { backgroundColor: THEME_COLORS.surface, padding: THEME_SIZES.padding, borderBottomLeftRadius: THEME_SIZES.radius * 2, borderBottomRightRadius: THEME_SIZES.radius * 2, marginBottom: THEME_SIZES.padding, ...Platform.select({ ios: THEME_SIZES.shadow, android: { elevation: 4, }}) },
  filterTitle: { fontSize: THEME_SIZES.h3 -2, fontWeight: 'bold', color: THEME_COLORS.primary, marginBottom: THEME_SIZES.padding, textAlign: 'center'},
  input: { height: THEME_SIZES.inputHeight - 5, borderWidth: 1, borderColor: THEME_COLORS.border, borderRadius: THEME_SIZES.radius, paddingHorizontal: THEME_SIZES.padding, marginBottom: THEME_SIZES.padding, backgroundColor: THEME_COLORS.white, fontSize: THEME_SIZES.body, color: THEME_COLORS.text, },
  dateFilterRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: THEME_SIZES.padding, },
  pickerWrapper: { flex: 1, borderWidth: 1, borderColor: THEME_COLORS.border, borderRadius: THEME_SIZES.radius, marginHorizontal: Platform.OS === 'ios' ? 2 : 4, backgroundColor: THEME_COLORS.white, justifyContent: 'center' },
  picker: { height: Platform.OS === 'ios' ? 120 : THEME_SIZES.inputHeight -5 , width: '100%', color: THEME_COLORS.text, },
  pickerItem: { height: 120, color: THEME_COLORS.text, fontSize: THEME_SIZES.body },
  reportListHeader: { fontSize: THEME_SIZES.h3 - 2, fontWeight: '600', color: THEME_COLORS.text, marginVertical: THEME_SIZES.padding, paddingHorizontal: THEME_SIZES.padding, },
  noDataText: { textAlign: 'center', fontSize: THEME_SIZES.body + 2, fontWeight:'600', color: THEME_COLORS.lightText, marginTop: THEME_SIZES.padding, },
  noDataSubText: { textAlign: 'center', fontSize: THEME_SIZES.body - 2, color: THEME_COLORS.lightText, marginTop: THEME_SIZES.padding /2, },
  listContentContainer: { paddingBottom: THEME_SIZES.padding },
  reportItemContainer: { backgroundColor: THEME_COLORS.surface, marginBottom: THEME_SIZES.padding, marginHorizontal: THEME_SIZES.padding, borderRadius: THEME_SIZES.radius, ...Platform.select({ ios: THEME_SIZES.shadow, android: { elevation: 2, }}) },
  employeeSummary: { padding: THEME_SIZES.padding, },
  employeeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: THEME_SIZES.padding / 2, },
  name: { fontWeight: 'bold', fontSize: THEME_SIZES.body + 2, flex: 1, color: THEME_COLORS.text },
  summaryDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: THEME_SIZES.padding /2, paddingLeft: 32 },
  summaryText: { fontSize: THEME_SIZES.caption + 1, color: THEME_COLORS.lightText, },
  lateSummaryText: { color: THEME_COLORS.late },
  innerFlatList: { marginTop: THEME_SIZES.padding /2, borderTopWidth: 1, borderTopColor: THEME_COLORS.border, },
  individualRecordItem: { backgroundColor: `${THEME_COLORS.primary}0D`, padding: THEME_SIZES.padding * 0.75, marginHorizontal: THEME_SIZES.padding, marginBottom: THEME_SIZES.padding / 2, borderRadius: THEME_SIZES.radius -2, borderWidth:1, borderColor: `${THEME_COLORS.primary}33` },
  recordDetailText: { fontSize: THEME_SIZES.caption + 1, color: THEME_COLORS.text, marginBottom: 4 },
  recordStrongText: { fontWeight: '600' },
  lateText: { color: THEME_COLORS.late, fontWeight: 'bold' },
  onTimeText: { color: THEME_COLORS.onTime, fontWeight: 'bold' },
  clockOutText: { color: THEME_COLORS.clockOutStatus, fontWeight: 'bold' },
  mapButtonSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME_COLORS.accent, paddingVertical: 6, paddingHorizontal: 10, borderRadius: THEME_SIZES.radius -2, marginTop: 6, alignSelf: 'flex-start' },
  mapButtonTextSmall: { color: THEME_COLORS.white, marginLeft: 8, fontSize: THEME_SIZES.caption, fontWeight: 'bold' },
  headerButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: THEME_SIZES.padding * 0.75, paddingVertical: THEME_SIZES.padding * 0.5, },
  headerButtonText: { color: THEME_COLORS.primary, fontSize: THEME_SIZES.body, fontWeight: '600', },
  appButton: { backgroundColor: THEME_COLORS.primary, paddingVertical: THEME_SIZES.padding * 0.75, borderRadius: THEME_SIZES.radius, alignItems: 'center', justifyContent: 'center', height: THEME_SIZES.inputHeight -5, flexDirection: 'row' },
  appButtonText: { color: THEME_COLORS.white, fontSize: THEME_SIZES.body, fontWeight: 'bold', },
});
// --- END OF FILE AdminViewReportsScreen.js ---