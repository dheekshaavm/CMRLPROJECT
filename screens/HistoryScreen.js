import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HistoryScreen() {
  const [records, setRecords] = useState([]);
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const data = await AsyncStorage.getItem('attendanceRecords');
        const parsed = data ? JSON.parse(data) : [];
        setRecords(parsed.reverse()); // Show latest first
      } catch (error) {
        console.error('Failed to load records:', error);
      }
    };

    fetchRecords();
  }, []);

  const renderItem = ({ item, index }) => (
    <View style={styles.record}>
      <Text style={styles.label}>#{records.length - index}</Text>
      <Text>Name: {item.userName}</Text>
      <Text>Time: {new Date(item.timestamp).toLocaleString()}</Text>
      <Text>Lat: {item.latitude}</Text>
      <Text>Lon: {item.longitude}</Text>
      <Text>Status: {item.late ? 'Late' : 'On Time'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance History</Text>
      {records.length === 0 ? (
        <Text style={styles.empty}>No records found.</Text>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  record: {
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  label: { fontWeight: 'bold' },
  empty: { textAlign: 'center', fontSize: 16, color: '#999' },
});
