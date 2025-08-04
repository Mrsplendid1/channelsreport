import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { databases, DATABASE_ID, COLLECTIONS } from '../../config/appwrite';
import { STYLES, COLORS } from '../../config/styles';
import { useAuth } from '../../config/useAuth';
import { Query } from 'appwrite';


interface ReportEntry {
  staffId: string;
  staffName: string;
  app: number;
  ussd: number;
  card: number;
}

export default function Report() {
  const { signOut } = useAuth();

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [entries, setEntries] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch staff list to create blank report entries
  const fetchStaff = async (): Promise<{ $id: string; name: string }[]> => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.STAFF);
      // Sort staff alphabetically
      return res.documents.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      return [];
    }
  };

  // Generate report for selected date if not exists
  const generateReport = async () => {
    setLoading(true);
    try {
      const formattedDate = date.toISOString().substring(0, 10); // YYYY-MM-DD

      // Check if report for this date exists
     const existingReports = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.REPORTS,
        [Query.equal('date', formattedDate)]
      );


      if (existingReports.total > 0) {
        alert(`Report for ${formattedDate} already exists.`);
        // Load existing report entries
        const parsedEntries = existingReports.documents[0].entries.map((entryStr: string) => JSON.parse(entryStr));
        setEntries(parsedEntries);
        setLoading(false);
        return;
      }

      // If not exists, create blank entries for all staff
      const staffList = await fetchStaff();
      const blankEntries: ReportEntry[] = staffList.map((staff) => ({
        staffId: staff.$id,
        staffName: staff.name,
        app: 0,
        ussd: 0,
        card: 0,
      }));

      const stringifiedEntries = blankEntries.map((entry) => JSON.stringify(entry));

      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.REPORTS,
        'unique()',
        {
          date: formattedDate,
          entries: stringifiedEntries,
        }
      );
      setEntries(blankEntries);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Check console for details.');
    }
    setLoading(false);
  };

  // Update a single entry value
  const updateEntry = (index: number, field: keyof Omit<ReportEntry, 'staffId' | 'staffName'>, value: string) => {
    const intVal = parseInt(value, 10);
    if (isNaN(intVal) || intVal < 0) return; // Ignore invalid or negative

    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: intVal };
    setEntries(updated);
  };

  // Save edited report back to DB
  const saveReport = async () => {
    setLoading(true);
    try {
      const formattedDate = date.toISOString().substring(0, 10);
      // Find existing report ID
      const existingReports = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.REPORTS,
        [Query.equal('date', formattedDate)]
      );

      if (existingReports.total === 0) {
        alert('No report found for this date to save.');
        setLoading(false);
        return;
      }
      const reportId = existingReports.documents[0].$id;

      // Convert entries objects to JSON strings before saving
      const stringifiedEntries = entries.map((entry) => JSON.stringify(entry));

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.REPORTS,
        reportId,
        {
          entries: stringifiedEntries,
        }
      );


      alert('Report saved successfully!');
    } catch (error) {
      console.error('Failed to save report:', error);
      alert('Failed to save report. Check console for details.');
    }
    setLoading(false);
  };

  // Date picker change handler
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      setEntries([]); // Clear previous entries on new date selection
    }
  };

  return (
    <ScrollView contentContainerStyle={STYLES.dashboardContainer}>
      <Text style={STYLES.title}>Generate Report</Text>

      <View style={{ marginBottom: 20 }}>
        <Text style={{ marginBottom: 8 }}>Select Date:</Text>

        {Platform.OS === 'web' ? (
          <input
            type="date"
            value={date.toISOString().substring(0, 10)}
            onChange={(e) => {
              setDate(new Date(e.target.value));
              setEntries([]);
            }}
            style={{ padding: 8, fontSize: 16 }}
          />
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={{
                padding: 12,
                borderColor: COLORS.primary,
                borderWidth: 1,
                borderRadius: 4,
                marginBottom: 10,
              }}
            >
              <Text>{date.toDateString()}</Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
          </>
        )}

        <Button
          mode="contained"
          onPress={generateReport}
          disabled={loading}
          style={{ marginTop: 10 }}
        >
          Generate Report
        </Button>
      </View>

      {entries.length > 0 && (
        <>
          <Text style={STYLES.sectionTitle}>Report for {date.toDateString()}</Text>
          {entries.map((entry, idx) => (
            <View key={entry.staffId} style={STYLES.staffCard}>
              <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>{entry.staffName}</Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {(['app', 'ussd', 'card'] as const).map((field) => (
                  <View key={field} style={{ flex: 1, marginHorizontal: 5 }}>
                    <Text>{field.toUpperCase()}</Text>
                    <TextInput
                      mode="outlined"
                      keyboardType="number-pad"
                      value={entry[field].toString()}
                      onChangeText={(val) => updateEntry(idx, field, val)}
                      style={{ backgroundColor: 'white' }}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          <Button
            mode="contained"
            onPress={saveReport}
            disabled={loading}
            style={{ marginTop: 20, marginBottom: 50 }}
          >
            Save Report
          </Button>
        </>
      )}

      <Button
        mode="contained"
        onPress={signOut}
        style={{ marginTop: 10, backgroundColor: COLORS.error }}
      >
        Logout
      </Button>
    </ScrollView>
  );
}
