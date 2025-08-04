import { StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#3498db',
  secondary: '#2ecc71',
  error: '#e74c3c',
  background: '#f5f5f5',
  text: '#333333',
  primaryLight: '#3a56d4',
  gray: '#6c757d',
  grayLight: '#e9ecef',
};

const shadowStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 2,
  elevation: 2,
};

export const STYLES = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  input: {
    height: 50,
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorText: {
    color: COLORS.error,
    marginBottom: 10,
  },
   dashboardContainer: {
    padding: 20,
    backgroundColor: COLORS.background,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 15,
    color: COLORS.primary,
  },
  staffCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 4,
    marginLeft: 10,
  },
});