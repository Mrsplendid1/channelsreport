import { useState, useEffect } from 'react';
import { account } from './appwrite';
import { useRouter } from 'expo-router';

type User = {
  $id: string;
  name?: string;
  email: string;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const signOut = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return { 
    user, 
    loading, 
    isLoggedIn: !!user,
    signOut,
    refreshAuth: checkAuth 
  };
}