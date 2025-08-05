import { useState } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import { account } from '@/config/appwrite';
import { STYLES, COLORS } from '@/config/styles';

// Platform-specific alert function
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    // Use browser's native alert for web
    window.alert(`${title}\n\n${message}`);
  } else {
    // Use React Native's Alert for mobile
    Alert.alert(title, message);
  }
};

// Web-specific styles
const webStyles = Platform.select({
  web: {
    container: {
      maxWidth: 400,
      margin: 'auto',
      paddingTop: 40
    },
    input: {
      outlineStyle: 'none'
    }
  },
  default: {}
});

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
  if (!email.trim() || !password.trim()) {
    showAlert('Error', 'Please fill all fields');
    return;
  }

  setLoading(true);
  try {
    // ✅ Check and delete existing session
    try {
      const existingSession = await account.getSession('current');
      if (existingSession) {
        await account.deleteSession('current');
      }
    } catch (sessionError) {
      // It's fine if no session exists — ignore 401s
      if (sessionError?.code !== 401) {
        console.warn('Error checking/deleting session:', sessionError);
      }
    }

    // ✅ Create a new session
    await account.createEmailPasswordSession(email, password);
    const session = await account.getSession('current');

    if (session?.userId) {
      router.replace('/(tabs)/dashboard');
    } else {
      throw new Error('Session creation failed');
    }

  } catch (error: any) {
    let errorMessage = error.message;

    // Friendly error messages
    if (errorMessage.includes('Invalid credentials')) {
      errorMessage = 'The email or password you entered is incorrect';
    } else if (errorMessage.includes('rate limit')) {
      errorMessage = 'Too many attempts. Please try again later';
    }

    showAlert('Login Failed', errorMessage);
    setPassword('');
  } finally {
    setLoading(false);
  }
};


  // Handle "Enter" key press on web
  const handleKeyPress = (e: any) => {
    if (Platform.OS === 'web' && e.key === 'Enter') {
      handleLogin();
    }
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={STYLES.container}
    >
      <View style={{ width: '100%' }}>
        <TextInput
          style={STYLES.input}
          placeholder="Email"
          placeholderTextColor={COLORS.gray}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={STYLES.input}
          placeholder="Password"
          placeholderTextColor={COLORS.gray}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[
            STYLES.button,
            loading && { backgroundColor: COLORS.primaryLight }
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={STYLES.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}