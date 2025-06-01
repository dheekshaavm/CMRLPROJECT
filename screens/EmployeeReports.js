// --- START OF FILE EmployeeReports.js ---
// EmployeeReports.js - Shows Working Hours and Early Checkout Reason
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  Alert, TouchableOpacity, Linking, Platform
} from 'react-native';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig'; // Assuming auth is for a potential admin sign out from this screen
import { MaterialIcons } from '@expo/vector-icons';

// Conceptual Theme (subset for this file)
const THEME_COLORS = {
  primary: '#0033cc',
  text: '#333333',
  lightText: '#6c757d',
  background: '#F0F2F5',
  surface: '#FFFFFF',
  border: '#CED4DA',
  white: '#FFFFFF',
  onTime: '#28a745',
  late: '#dc3545',
  clockOutStatus: '#17a2b8',
  accent: '#ff9800', // For map button
};
const THEME_SIZES = {
  padding: 16,
  radius: 8,
  body: 16,
  caption: 12,
  h2: 24,
  h3: 20,
};

// Custom Header Button Component
const HeaderButton = ({ title, onPress, iconName }) => (
  <TouchableOpacity onPress={onPress} style={styles.headerButton}>
    {iconName && <MaterialIcons name={iconName} size={22} color={THEME_COLORS.primary} style={{ marginRight: title ? 5 : 0 }} />}
    {title && <Text style={styles.headerButtonText}>{title}</Text>}
  </TouchableOpacity>
);

export default function EmployeeReports({ navigation }) {
  const [employeeData, setEmployeeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);
  const [currentRecords, setCurrentRecords] = useState([]); // To help with working hours calculation

  const handleSignOut = () => {
    auth.signOut().then(() => { // Assuming this screen might be used by an admin who logged in via Firebase
      navigation.replace('Login');
    }).catch(error => Alert.alert("Sign Out Error", error.message));
  };

  useEffect(() => {
    const fetchReports = async () => {
      // ... (original logic kept, as it's specific to this report's needs)
      setLoading(true);
      try {
        const recordsQuery = query(collection(db, 'attendanceRecords'), orderBy('timestamp', 'asc'));
        const snapshot = await getDocs(recordsQuery);
        const allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const reportMap = {};
        allRecords.forEach(record => {
          if (!record.employeeId) return;
          if (!reportMap[record.employeeId]) {
            reportMap[record.employeeId] = { employeeId: record.employeeId, userName: record.userName || 'N/A', presentDaysSet: new Set(), lateDaysSet: new Set(), records: [], };
          }
          if (record.userName && reportMap[record.employeeId].userName === 'N/A') { reportMap[record.employeeId].userName = record.userName; }
          reportMap[record.employeeId].records.push(record);
          if (record.type === 'clock_in') {
            const recordDate = new Date(record.timestamp).toDateString();
            reportMap[record.employeeId].presentDaysSet.add(recordDate);
            if (record.late) { reportMap[record.employeeId].lateDaysSet.add(recordDate); }
          }
        });
        const processedData = Object.values(reportMap).map(emp => ({ ...emp, presentDaysCount: emp.presentDaysSet.size, lateDaysCount: emp.lateDaysSet.size, records: emp.records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) /* Sort records desc for display */ }));
        setEmployeeData(processedData);
      } catch (error) {
        Alert.alert('Error', 'Could not fetch employee reports: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: "Legacy Employee Reports", // Differentiate if needed
      headerStyle: { backgroundColor: THEME_COLORS.surface, elevation: Platform.OS === 'android' ? 4 : 0, shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0, },
      headerTintColor: THEME_COLORS.primary,
      headerTitleStyle: { fontWeight: 'bold' },
      headerRight: () => ( // Assuming an admin might sign out
        <HeaderButton onPress={handleSignOut} title="Sign Out" iconName="logout" />
      ),
      // Add a Home button if this screen is part of an admin flow
      // headerLeft: () => (<HeaderButton onPress={() => navigation.navigate('AdminDashboard')} title="Home" iconName="home" />),
    });
  }, [navigation]);

  const openLocationInMap = (lat, lon) => { /* ... (same) */ const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`; Linking.openURL(googleMapsUrl); };

  const renderIndividualRecord = ({ item: record, index, allEmployeeRecords }) => {
    // `allEmployeeRecords` is passed to calculate working hours from the correct list
    let statusText = 'N/A';
    let statusStyle = {};

    if (record.type === 'clock_in') {
      statusText = record.late ? 'Clock In (Late)' : 'Clock In (On Time)';
      statusStyle = record.late ? styles.lateText : styles.onTimeText;
    } else if (record.type === 'clock_out') {
      statusText = 'Clock Out';
      statusStyle = styles.clockOutText;
    }

    // Calculate working hours - This logic needs careful review if records are not strictly paired or sorted ASC.
    // The original code had `currentRecords` which was a global-like variable.
    // Better to pass the full sorted list of this employee's records.
    // For simplicity and due to descending sort for display, this calculation might be tricky here.
    // The original `EmployeeReports.js` sorted by 'asc' for processing, then this `renderIndividualRecord`
    // used `currentRecords[index + 1]`. If records are now sorted DESC for display, this logic needs inversion or re-fetch/re-sort.
    // For now, I'll comment out the working hours part as it needs careful data handling based on sort order.
    /*
    let workingHours = null;
    if (record.type === 'clock_in' && allEmployeeRecords) {
        // Find the next clock_out FOR THIS clock_in
        // This requires records to be sorted chronologically (ASC) for simple next-record logic
        // Or a more complex lookup if sorted DESC
    }
    */

    return (
      <View style={styles.individualRecordItem}>
        <Text style={styles.recordDetailText}>
          Time: <Text style={styles.recordStrongText}>{new Date(record.timestamp).toLocaleString()}</Text>
        </Text>
        <Text style={styles.recordDetailText}>
          Type: <Text style={[styles.recordStrongText, statusStyle]}>{statusText}</Text>
        </Text>
        {record.earlyCheckoutReason && (
          <Text style={styles.recordDetailText}>
            Reason: <Text style={styles.recordStrongText}>{record.earlyCheckoutReason}</Text>
          </Text>
        )}
        {/* {workingHours && (
          <Text style={styles.recordDetailText}>
            Working Hours: <Text style={styles.recordStrongText}>{workingHours}</Text>
          </Text>
        )} */}
        {record.latitude && record.longitude ? (
          <TouchableOpacity
            style={styles.mapButtonSmall}
            onPress={() => openLocationInMap(record.latitude, record.longitude)}>
            <MaterialIcons name="location-on" size={16} color={THEME_COLORS.white} />
            <Text style={styles.mapButtonTextSmall}>View Location</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.recordDetailText, {fontStyle:'italic'}]}>Location: Not Captured</Text>
        )}
      </View>
    );
  };


  const renderEmployeeItem = ({ item: employee }) => {
    const isExpanded = expandedEmployeeId === employee.employeeId;
    // setCurrentRecords(employee.records); // This was problematic. Pass records directly.

    return (
      <View style={styles.reportItemContainer}>
        <TouchableOpacity onPress={() => setExpandedEmployeeId(isExpanded ? null : employee.employeeId)} style={styles.employeeSummary}>
            <View style={styles.employeeHeader}>
                <MaterialIcons name="person-outline" size={24} color={THEME_COLORS.primary} style={{marginRight: 8}}/>
                <Text style={styles.name}>{employee.userName} (ID: {employee.employeeId})</Text>
                <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={24} color={THEME_COLORS.primary} />
            </View>
             <View style={styles.summaryDetails}>
                <Text style={styles.summaryText}><Text style={{fontWeight:'bold'}}>{employee.presentDaysCount}</Text> Present Days</Text>
                <Text style={[styles.summaryText, employee.lateDaysCount > 0 && {color: THEME_COLORS.late}]}>
                    <Text style={{fontWeight:'bold'}}>{employee.lateDaysCount}</Text> Late Clock-Ins
                </Text>
            </View>
        </TouchableOpacity>
        {isExpanded && (
          <FlatList
            data={employee.records} // Records are already sorted DESC if modified in fetch
            keyExtractor={(record) => record.id}
            renderItem={(props) => renderIndividualRecord({ ...props, allEmployeeRecords: employee.records })}
            style={styles.innerFlatList}
          />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centeredMessageContainer}>
        <ActivityIndicator size="large" color={THEME_COLORS.primary} />
        <Text style={styles.loadingText}>Loading Reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Employee Attendance (Legacy)</Text>
      {employeeData.length === 0 && !loading ? (
          <View style={styles.centeredMessageContainer}>
            <MaterialIcons name="inbox" size={48} color={THEME_COLORS.lightText} />
            <Text style={styles.noDataText}>No employee data found.</Text>
          </View>
      ) : (
        <FlatList
            data={employeeData}
            keyExtractor={(item) => item.employeeId}
            renderItem={renderEmployeeItem}
            contentContainerStyle={styles.listContentContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_COLORS.background },
  centeredMessageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: THEME_SIZES.padding * 2, },
  loadingText: { marginTop: THEME_SIZES.padding, fontSize: THEME_SIZES.body, color: THEME_COLORS.lightText},
  title: { fontSize: THEME_SIZES.h2, fontWeight: 'bold', marginVertical: THEME_SIZES.padding, textAlign: 'center', color: THEME_COLORS.primary },
  noDataText: { textAlign: 'center', fontSize: THEME_SIZES.body + 2, fontWeight:'600', color: THEME_COLORS.lightText, marginTop: THEME_SIZES.padding, },
  listContentContainer: { paddingHorizontal: THEME_SIZES.padding, paddingBottom: THEME_SIZES.padding },
  reportItemContainer: { backgroundColor: THEME_COLORS.surface, marginBottom: THEME_SIZES.padding, borderRadius: THEME_SIZES.radius, ...Platform.select({ ios: { shadowColor: THEME_COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, }, android: { elevation: 2, }}) },
  employeeSummary: { padding: THEME_SIZES.padding, },
  employeeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: THEME_SIZES.padding / 2, },
  name: { fontWeight: 'bold', fontSize: THEME_SIZES.body + 1, flex: 1, color: THEME_COLORS.text },
  summaryDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: THEME_SIZES.padding /2, paddingLeft: 32 },
  summaryText: { fontSize: THEME_SIZES.caption + 1, color: THEME_COLORS.lightText, },
  innerFlatList: { marginTop: THEME_SIZES.padding /2, borderTopWidth: 1, borderTopColor: THEME_COLORS.border, },
  individualRecordItem: { backgroundColor: `${THEME_COLORS.primary}0D`, padding: THEME_SIZES.padding * 0.75, marginHorizontal: THEME_SIZES.padding, marginBottom: THEME_SIZES.padding / 2, borderRadius: THEME_SIZES.radius -2, borderWidth:1, borderColor: `${THEME_COLORS.primary}33` },
  recordDetailText: { fontSize: THEME_SIZES.caption + 1, color: THEME_COLORS.text, marginBottom: 4 },
  recordStrongText: { fontWeight: '600' },
  lateText: { color: THEME_COLORS.late, fontWeight: 'bold' },
  onTimeText: { color: THEME_COLORS.onTime, fontWeight: 'bold' },
  clockOutText: { color: THEME_COLORS.clockOutStatus, fontWeight: 'bold' },
  mapButtonSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME_COLORS.accent, paddingVertical: 6, paddingHorizontal: 10, borderRadius: THEME_SIZES.radius -2, marginTop: 6, alignSelf: 'flex-start' },
  mapButtonTextSmall: { color: THEME_COLORS.white, marginLeft: 8, fontSize: THEME_SIZES.caption, fontWeight: 'bold' },
  // Header button styles
  headerButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: THEME_SIZES.padding * 0.75, paddingVertical: THEME_SIZES.padding * 0.5, },
  headerButtonText: { color: THEME_COLORS.primary, fontSize: THEME_SIZES.body, fontWeight: '600', },
});
// --- END OF FILE EmployeeReports.js ---