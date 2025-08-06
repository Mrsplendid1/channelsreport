import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { databases, DATABASE_ID, COLLECTIONS } from '../../config/appwrite';
import { STYLES, COLORS } from '../../config/styles';
import { useAuth } from '../../config/useAuth';
import { Query } from 'appwrite';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Alert} from 'react-native';


interface ReportEntry {
  staffId: string;
  staffName: string;
  app: number;
  ussd: number;
  card: number;
}

interface ReportDocument {
  $id: string;
  date: string;
  entries: string[]; // JSON strings of ReportEntry
  $updatedAt: string;
}

export default function Report() {
  const { signOut } = useAuth();
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [entries, setEntries] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState({
    generate: false,
    save: false,
    fetch: false
  });
  const [reportsList, setReportsList] = useState<ReportDocument[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 10,
    total: 0
  });

  // Fetch paginated reports list
  const fetchReportsList = async (offset: number = 0) => {
    setLoading(prev => ({...prev, fetch: true}));
    try {
      const res = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.REPORTS,
        [
          Query.orderDesc('date'),
          Query.limit(pagination.limit),
          Query.offset(offset),
          Query.select(['$id', 'date', 'entries', '$updatedAt'])
        ]
      );
      
      setReportsList(res.documents as ReportDocument[]);
      setPagination(prev => ({
        ...prev,
        offset,
        total: res.total
      }));
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      Alert.alert('Error', 'Failed to load reports list');
    } finally {
      setLoading(prev => ({...prev, fetch: false}));
    }
  };

  // Load more reports
  const loadMoreReports = () => {
    if (pagination.offset + pagination.limit < pagination.total) {
      fetchReportsList(pagination.offset + pagination.limit);
    }
  };

  // Toggle report expansion
  const toggleReport = (reportId: string) => {
    setExpandedReport(expandedReport === reportId ? null : reportId);
  };

  // Parse and display a report's entries
  const renderReportEntries = (report: ReportDocument) => {
  const parsedEntries = report.entries
    .map(entry => JSON.parse(entry) as ReportEntry)
    .map(entry => ({
      ...entry,
      total: entry.app + entry.ussd + entry.card
    }))
    .sort((a, b) => b.total - a.total); // Sort by highest total

  const totalApp = parsedEntries.reduce((sum, e) => sum + e.app, 0);
  const totalUssd = parsedEntries.reduce((sum, e) => sum + e.ussd, 0);
  const totalCard = parsedEntries.reduce((sum, e) => sum + e.card, 0);
  const totalOverall = totalApp + totalUssd + totalCard;

  return (
    <View style={{ marginTop: 10, padding: 10, backgroundColor: COLORS.lightGray }}>
      {/* Table Header */}
      <View style={{
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: COLORS.gray,
        paddingBottom: 5,
        marginBottom: 5
      }}>
        <Text style={{ flex: 2, fontWeight: 'bold' }}>Name</Text>
        <Text style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>APP</Text>
        <Text style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>USSD</Text>
        <Text style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>CARD</Text>
        <Text style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>TOTAL</Text>
      </View>

      {/* Rows */}
      {parsedEntries.map((entry) => (
        <View
          key={`${report.$id}-${entry.staffId}`}
          style={{
            flexDirection: 'row',
            paddingVertical: 6,
            borderBottomWidth: 0.5,
            borderColor: COLORS.gray
          }}
        >
          <Text style={{ flex: 2 }}>{entry.staffName}</Text>
          <Text style={{ flex: 1, textAlign: 'center' }}>{entry.app}</Text>
          <Text style={{ flex: 1, textAlign: 'center' }}>{entry.ussd}</Text>
          <Text style={{ flex: 1, textAlign: 'center' }}>{entry.card}</Text>
          <Text style={{ flex: 1, textAlign: 'center' }}>{entry.total}</Text>
        </View>
      ))}

      {/* Totals Row */}
      <View
        style={{
          flexDirection: 'row',
          paddingTop: 10,
          borderTopWidth: 1,
          borderColor: COLORS.primary
        }}
      >
        <Text style={{ flex: 2, fontWeight: 'bold' }}>Total</Text>
        <Text style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>{totalApp}</Text>
        <Text style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>{totalUssd}</Text>
        <Text style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>{totalCard}</Text>
        <Text style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>{totalOverall}</Text>
      </View>
    </View>
  );
};


  // Fetch staff list to create blank report entries
  const fetchStaff = async (): Promise<{ $id: string; name: string }[]> => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.STAFF);
      return res.documents.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      return [];
    }
  };

  // Generate report for selected date if not exists
  const generateReport = async () => {
    setLoading(prev => ({...prev, generate: true}));
    try {
      const formattedDate = date.toISOString().substring(0, 10);

      // Check if report exists
      const existingReports = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.REPORTS,
        [Query.equal('date', formattedDate)]
      );

      if (existingReports.total > 0) {
        const parsedEntries = existingReports.documents[0].entries.map((entryStr: string) => 
          JSON.parse(entryStr)
        );
        setEntries(parsedEntries);
        Alert.alert('Info', `Report for ${formattedDate} already exists.`);
        return;
      }

      // Create new report
      const staffList = await fetchStaff();
      const blankEntries: ReportEntry[] = staffList.map((staff) => ({
        staffId: staff.$id,
        staffName: staff.name,
        app: 0,
        ussd: 0,
        card: 0,
      }));

      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.REPORTS,
        'unique()',
        {
          date: formattedDate,
          entries: blankEntries.map(entry => JSON.stringify(entry)),
        }
      );
      
      setEntries(blankEntries);
      fetchReportsList(); // Refresh reports list
    } catch (error) {
      console.error('Failed to generate report:', error);
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setLoading(prev => ({...prev, generate: false}));
    }
  };

  const cancelEdit = () => {
      setEntries([]); // This clears the entries, which hides the edit form
    };

  // Save edited report
  const saveReport = async () => {
    setLoading(prev => ({...prev, save: true}));
    try {
      const formattedDate = date.toISOString().substring(0, 10);
      const existingReports = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.REPORTS,
        [Query.equal('date', formattedDate)]
      );

      if (existingReports.total === 0) {
        Alert.alert('Error', 'No report found for this date');
        return;
      }

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.REPORTS,
        existingReports.documents[0].$id,
        {
          entries: entries.map(entry => JSON.stringify(entry)),
        }
      );

      Alert.alert('Success', 'Report saved successfully');
      fetchReportsList(); // Refresh reports list
    } catch (error) {
      console.error('Failed to save report:', error);
      Alert.alert('Error', 'Failed to save report');
    } finally {
      setLoading(prev => ({...prev, save: false}));
    }
  };

  // Initial load
  useEffect(() => {
    fetchReportsList();
  }, []);

  const updateEntry = (index: number, field: keyof ReportEntry, value: string) => {
    const updated = [...entries];
    updated[index][field] = parseInt(value || '0', 10);
    setEntries(updated);
  };

  // Load report into editing mode
    const handleEdit = (report: ReportDocument) => {
      setDate(new Date(report.date));
      setEntries(report.entries.map(entry => JSON.parse(entry)));
      setExpandedReport(null);
      ScrollView?.scrollTo?.({ y: 0, animated: true });
    };

    // Print logic (you can hook this into PDF or AirPrint later)
    const handlePrint = async (report: ReportDocument) => {
  try {
    const parsedEntries = report.entries
      .map(entry => JSON.parse(entry) as ReportEntry)
      .map(entry => ({
        ...entry,
        total: entry.app + entry.ussd + entry.card
      }))
      .sort((a, b) => b.total - a.total);

    const totalApp = parsedEntries.reduce((sum, e) => sum + e.app, 0);
    const totalUssd = parsedEntries.reduce((sum, e) => sum + e.ussd, 0);
    const totalCard = parsedEntries.reduce((sum, e) => sum + e.card, 0);
    const totalOverall = totalApp + totalUssd + totalCard;

    const formattedDate = new Date(report.date).toDateString();

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Print-specific styles */
            @media print {
              body { 
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 10px !important;
                font-size: 14px !important;
              }
              .no-print { display: none !important; }
            }
            
            /* General styles */
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
              -webkit-text-size-adjust: 100%;
            }
            h1 { 
              text-align: center; 
              margin-bottom: 20px;
              font-size: 1.5rem;
            }
            .report-container { 
              width: 100%; 
              max-width: 800px; 
              margin: 0 auto;
            }
            .table { 
              width: 100%; 
              border-collapse: collapse;
              font-size: 12px;
            }
            .table th, .table td { 
              padding: 8px; 
              text-align: left; 
              border: 1px solid #ddd; 
            }
            .table th { 
              background-color: #f2f2f2; 
              font-weight: bold; 
            }
            .table tr:nth-child(even) { 
              background-color: #f9f9f9; 
            }
            .total-row { 
              font-weight: bold; 
              background-color: #e6f7ff !important; 
            }
            .text-center { 
              text-align: center !important; 
            }
            @page {
              size: auto;
              margin: 5mm;
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <h1>Channels Report for ${formattedDate}</h1>
            
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 40%">Name</th>
                  <th class="text-center">APP</th>
                  <th class="text-center">USSD</th>
                  <th class="text-center">CARD</th>
                  <th class="text-center">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${parsedEntries.map((entry) => `
                  <tr>
                    <td>${entry.staffName}</td>
                    <td class="text-center">${entry.app}</td>
                    <td class="text-center">${entry.ussd}</td>
                    <td class="text-center">${entry.card}</td>
                    <td class="text-center">${entry.total}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td>Total</td>
                  <td class="text-center">${totalApp}</td>
                  <td class="text-center">${totalUssd}</td>
                  <td class="text-center">${totalCard}</td>
                  <td class="text-center">${totalOverall}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="
              padding: 10px 20px;
              background: #007aff;
              color: white;
              border: none;
              border-radius: 5px;
              font-size: 16px;
              margin: 10px;
            ">
              Print Report
            </button>
            <button onclick="window.close()" style="
              padding: 10px 20px;
              background: #ff3b30;
              color: white;
              border: none;
              border-radius: 5px;
              font-size: 16px;
              margin: 10px;
            ">
              Close
            </button>
          </div>
          
          <script>
            // Auto-print on mobile browsers
            if(/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
              setTimeout(() => {
                window.print();
                // Close after printing on iOS
                setTimeout(() => window.close(), 1000);
              }, 300);
            }
          </script>
        </body>
      </html>
    `;

    if (Platform.OS === 'web') {
      // Web-specific handling
      const printWindow = window.open('', '_blank');
      printWindow?.document.write(htmlContent);
      printWindow?.document.close();
      
      // Focus the window for iOS
      setTimeout(() => {
        printWindow?.focus();
      }, 500);
    } else {
      // Native app handling
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
      });
      await Sharing.shareAsync(uri);
    }
  } catch (err) {
    console.error('Print error:', err);
    Alert.alert('Error', 'Failed to generate print preview');
  }
};

    // Delete a report
   const handleDelete = async (report: ReportDocument) => {
  const message = `Are you sure you want to delete the report for ${new Date(report.date).toDateString()}?`;
  
  // Platform check
  if (Platform.OS !== 'web') {
    // Mobile (React Native) version
    Alert.alert(
      'Confirm Delete',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => await executeDelete(report)
        }
      ]
    );
  } else {
    // Web version
    const confirmed = window.confirm(`Confirm Delete\n${message}`);
    if (confirmed) {
      await executeDelete(report);
    }
  }
};

// Extracted delete logic for reusability
const executeDelete = async (report: ReportDocument) => {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.REPORTS, report.$id);
    
    // Platform-specific success message
    if (Platform.OS !== 'web') {
      Alert.alert('Deleted', 'Report deleted successfully');
    } else {
      alert('Report deleted successfully');
    }
    
    fetchReportsList(); // refresh
  } catch (error) {
    console.error('Delete failed:', error);
    
    // Platform-specific error message
    if (Platform.OS !== 'web') {
      Alert.alert('Error', 'Failed to delete report');
    } else {
      alert('Failed to delete report');
    }
  }
};


  return (
    <ScrollView contentContainerStyle={STYLES.dashboardContainer}>
      <Text style={STYLES.title}>Reports Management</Text>

      {/* Date Selection */}
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
          loading={loading.generate}
          disabled={loading.generate}
          style={{ marginTop: 10 }}
        >
          Generate Report
        </Button>
      </View>

      {/* Current Report Editing */}
      {entries.length > 0 && (
        <>
          <Text style={STYLES.sectionTitle}>Editing: {date.toDateString()}</Text>
          {entries.map((entry, idx) => (
            <View key={entry.staffId} style={[STYLES.staffCard, { padding: 10 }]}>
            <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>{entry.staffName}</Text>
            
            <View style={{ 
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: 8
            }}>
              {(['app', 'ussd', 'card'] as const).map((field) => (
                <View key={field} style={{ minWidth: '30%' }}>
                  <Text style={{ fontSize: 12 }}>{field.toUpperCase()}</Text>
                  <TextInput
                    mode="outlined"
                    keyboardType="number-pad"
                    value={entry[field].toString()}
                    onChangeText={(val) => updateEntry(idx, field, val)}
                    style={{ 
                      backgroundColor: 'white',
                      height: 40
                    }}
                    dense
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
          <Button
            mode="contained"
            onPress={saveReport}
            loading={loading.save}
            disabled={loading.save}
            style={{ flex: 1, marginRight: 5 }}
          >
            Save Report
          </Button>
          <Button
            mode="outlined"
            onPress={cancelEdit}
            disabled={loading.save}
            style={{ flex: 1, marginLeft: 5 }}
          >
            Cancel
          </Button>
        </View>

        </>
      )}

      {/* Reports List */}
      <Text style={[STYLES.sectionTitle, { marginTop: 30 }]}>Existing Reports</Text>
      
      {loading.fetch && <ActivityIndicator size="large" color={COLORS.primary} />}

      {reportsList.length === 0 && !loading.fetch && (
        <Text style={{ textAlign: 'center', marginVertical: 20 }}>No reports found</Text>
      )}

      {reportsList.map((report) => (
      <View key={report.$id} style={{ marginBottom: 10 }}>
        <TouchableOpacity
          onPress={() => toggleReport(report.$id)}
          style={{
            padding: 15,
            backgroundColor: COLORS.primary,
            borderRadius: 5,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            {new Date(report.date).toDateString()}
          </Text>
          <Text style={{ color: 'white' }}>
            {expandedReport === report.$id ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {expandedReport === report.$id && (
          <View style={{ padding: 10, backgroundColor: COLORS.lightGray }}>
            {renderReportEntries(report)}

            {/* Last edited text using $updatedAt */}
            <Text style={{ 
              textAlign: 'right', 
              fontSize: 12,
              color: COLORS.gray,
              marginBottom: 10,
              fontStyle: 'italic'
            }}>
              Last updated: {new Date(report.$updatedAt).toLocaleString()}
            </Text>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
              <Button
                mode="outlined"
                onPress={() => handleEdit(report)}
                style={{ flex: 1, marginRight: 5 }}
              >
                Edit
              </Button>
              <Button
                mode="outlined"
                onPress={() => handlePrint(report)}
                style={{ flex: 1, marginHorizontal: 5 }}
              >
                Print
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleDelete(report)}
                style={{ flex: 1, marginLeft: 5 }}
                textColor={COLORS.error}
              >
                Delete
              </Button>
            </View>
          </View>
        )}
      </View>
    ))}


      {pagination.offset + pagination.limit < pagination.total && (
        <Button
          mode="outlined"
          onPress={loadMoreReports}
          style={{ marginTop: 10 }}
        >
          Load More
        </Button>
      )}

      {/* Logout */}
      <Button
        mode="contained"
        onPress={signOut}
        style={{ marginTop: 30, backgroundColor: COLORS.error }}
      >
        Logout
      </Button>
    </ScrollView>
  );
}