import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { useAuth } from '../../config/useAuth';
import { databases, DATABASE_ID, COLLECTIONS } from '../../config/appwrite';
import { STYLES, COLORS } from '../../config/styles';

export default function Dashboard() {
  const { signOut } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.STAFF
      );
        const sorted = response.documents.sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
        setStaff(sorted);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const addStaff = async () => {
    if (!newStaffName.trim()) return;

    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.STAFF,
        'unique()',
        { name: newStaffName }
      );
      setNewStaffName('');
      fetchStaff();
    } catch (error) {
      console.error('Failed to add staff:', error);
    }
  };

  const updateStaff = async (staffId: string) => {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.STAFF,
        staffId,
        { name: editName }
      );
      setEditingId(null);
      fetchStaff();
    } catch (error) {
      console.error('Failed to update staff:', error);
    }
  };

  const deleteStaff = async (staffId: string) => {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.STAFF,
        staffId
      );
      fetchStaff();
    } catch (error) {
      console.error('Failed to delete staff:', error);
    }
  };

  return (
    <ScrollView contentContainerStyle={STYLES.dashboardContainer}>
      <Text style={STYLES.title}>Admin Dashboard</Text>

      {/* Add New Staff */}
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <TextInput
          style={{ flex: 1, marginRight: 10 }}
          mode="outlined"
          label="New Staff Name"
          value={newStaffName}
          onChangeText={setNewStaffName}
        />
        <Button
          mode="contained"
          onPress={addStaff}
          style={{ justifyContent: 'center' }}
        >
          Add
        </Button>
      </View>

      {/* Staff List */}
      <Text style={STYLES.sectionTitle}>Staff Members</Text>
      {staff.map((member) => (
        <View key={member.$id} style={STYLES.staffCard}>
          {editingId === member.$id ? (
            <TextInput
              style={{ flex: 1 }}
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />
          ) : (
            <Text style={{ fontSize: 16 }}>{member.name}</Text>
          )}

          <View style={{ flexDirection: 'row' }}>
            {editingId === member.$id ? (
              <>
                <TouchableOpacity
                  style={[STYLES.actionButton, { backgroundColor: COLORS.primary }]}
                  onPress={() => updateStaff(member.$id)}
                >
                  <Text style={{ color: 'white' }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[STYLES.actionButton, { backgroundColor: COLORS.error }]}
                  onPress={() => setEditingId(null)}
                >
                  <Text style={{ color: 'white' }}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[STYLES.actionButton, { backgroundColor: COLORS.secondary }]}
                  onPress={() => {
                    setEditingId(member.$id);
                    setEditName(member.name);
                  }}
                >
                  <Text style={{ color: 'white' }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[STYLES.actionButton, { backgroundColor: COLORS.error }]}
                  onPress={() => deleteStaff(member.$id)}
                >
                  <Text style={{ color: 'white' }}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ))}

      {/* Logout Button */}
      <Button
        mode="contained"
        onPress={signOut}
        style={{ marginTop: 30 }}
      >
        Logout
      </Button>
    </ScrollView>
  );
}
