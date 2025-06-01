// Example: navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import your screens
import LoginScreen from '../screens/LoginScreen';
import EmployeeHomeScreen from '../screens/EmployeeHomeScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
// import AdminAddUserScreen from '../screens/AdminAddUserScreen'; // This will be replaced by AdminManageUsersScreen logic or a dedicated form
import AdminViewReportsScreen from '../screens/AdminViewReportsScreen';
import EmployeeFullRecordsScreen from '../screens/EmployeeFullRecordsScreen';
import EmployeeSetPasswordScreen from '../screens/EmployeeSetPasswordScreen';

// ***** NEW SCREENS FOR ADMIN USER MANAGEMENT *****
import AdminManageUsersScreen from '../screens/AdminManageUsersScreen'; // The main list/management screen
import AdminAddUserScreen from '../screens/AdminAddUserScreen'; // Screen for the add user form
import AdminEditUserFormScreen from '../screens/AdminEditUserFormScreen';  // Screen for the edit user form
// ***** END NEW SCREENS *****


const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          // You can define default header styles here if you want consistency
          // headerStyle: { backgroundColor: '#0033cc' },
          // headerTintColor: '#fff',
          // headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {/* Auth Flow */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />

        {/* Employee Flow */}
        <Stack.Screen
          name="EmployeeSetPassword"
          component={EmployeeSetPasswordScreen}
          options={{ title: 'Set Your Password' }} // Example: Setting title here
        />
        <Stack.Screen
          name="EmployeeHome"
          component={EmployeeHomeScreen}
          // options={{ title: 'Employee Portal' }} // Title is set within EmployeeHomeScreen via useLayoutEffect
        />
        <Stack.Screen
            name="EmployeeFullRecords"
            component={EmployeeFullRecordsScreen}
            // options={({ route }) => ({ title: `${route.params?.userName || 'Employee'}'s History` })} // Title is set within screen
        />

        {/* Admin Flow */}
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          // options={{ title: 'Admin Dashboard' }} // Title is set within screen
        />
        {/* 
          The old AdminAddUserScreen is effectively replaced by the flow:
          AdminDashboard -> AdminManageUsers -> (Button) -> AdminAddUserForm 
        */}
        <Stack.Screen
          name="AdminManageUsers" // New central screen for user listing and actions
          component={AdminManageUsersScreen}
          // options={{ title: 'Manage Employees' }} // Title is set within screen
        />
        <Stack.Screen
          name="AdminAddUserForm" // Dedicated screen for the "Add User" form
          component={AdminAddUserScreen}
          // options={{ title: 'Add New Employee' }} // Title is set within screen
        />
        <Stack.Screen
          name="AdminEditUserForm" // Dedicated screen for the "Edit User" form
          component={AdminEditUserFormScreen}
          // options={({ route }) => ({ title: `Edit ${route.params?.employeeData?.name || 'Employee'}` })} // Dynamic title or set in screen
        />
         <Stack.Screen
          name="AdminViewReports" // Kept for viewing attendance reports
          component={AdminViewReportsScreen}
          // options={{ title: 'Employee Reports' }} // Title is set within screen
        />
        {/* Add other admin screens as needed */}

      </Stack.Navigator>
    </NavigationContainer>
  );
}