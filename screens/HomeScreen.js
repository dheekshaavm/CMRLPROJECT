import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ route, navigation }) {
  const { userName = 'Guest' } = route.params || {};
  const [location, setLocation] = useState(null);
  const [clockedIn, setClockedIn] = useState(false);

  // Define official start time for attendance (9:00 AM)
  const OFFICIAL_START_HOUR = 9;
  const OFFICIAL_START_MINUTE = 0;

  // Save attendance record to AsyncStorage
  const saveAttendance = async (record) => {
    try {
      const existing = await AsyncStorage.getItem('attendanceRecords');
      const records = existing ? JSON.parse(existing) : [];
      records.push(record);
      await AsyncStorage.setItem('attendanceRecords', JSON.stringify(records));
    } catch (error) {
      console.error('Failed to save attendance:', error);
    }
  };

  const handleClockIn = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission was not granted.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const coords = loc.coords;
      setLocation(coords);
      setClockedIn(true);

      const now = new Date();

      // Create Date object for today's official start time
      const officialStart = new Date(now);
      officialStart.setHours(OFFICIAL_START_HOUR, OFFICIAL_START_MINUTE, 0, 0);

      // Determine if user is late
      const isLate = now > officialStart;

      const attendanceRecord = {
        userName,
        timestamp: now.toISOString(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        late: isLate, // Store late flag
      };

      await saveAttendance(attendanceRecord);
      Alert.alert('Success', `Clock-in recorded${isLate ? ' (Late)' : ''}.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch location.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {userName}!</Text>
      <Button title="Clock In" onPress={handleClockIn} disabled={clockedIn} />
      {location && (
        <View style={styles.locationBox}>
          <Text>Latitude: {location.latitude}</Text>
          <Text>Longitude: {location.longitude}</Text>
        </View>
      )}
      <View style={{ marginTop: 20 }}>
        <Button title="View History" onPress={() => navigation.navigate('History')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, marginBottom: 20 },
  locationBox: { marginTop: 20 },
});
