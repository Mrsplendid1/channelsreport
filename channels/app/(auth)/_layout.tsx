import { Stack } from 'expo-router';
import { COLORS } from '@/config/styles';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="login" 
        options={{ 
          title: 'Admin Login',
          headerBackVisible: false // No back button on login
        }} 
      />
    </Stack>
  );
}