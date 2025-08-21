import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import LicenseTable from './components/LicenseTable';
import ToolFilter from './components/ToolFilter';

// Configure axios base URL for development
if (process.env.NODE_ENV === 'development') {
  axios.defaults.baseURL = 'http://localhost:3001';
}

function App() {
  const [licenseData, setLicenseData] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState('all');
  const [selectedExpiryStatus, setSelectedExpiryStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch available tools and test backend connection
  useEffect(() => {
    fetchTools();
    
    // Test backend connection
    const testBackend = async () => {
      try {
        const response = await axios.get('/api/health');
        console.log('Backend connection test:', response.data);
      } catch (err) {
        console.error('Backend connection test failed:', err);
      }
    };
    
    testBackend();
  }, []);

  // Fetch license data when tool selection changes
  useEffect(() => {
    fetchLicenseData();
  }, [selectedTool]);

  const fetchTools = async () => {
    try {
      const response = await axios.get('/api/tools');
      if (response.data.success) {
        setAvailableTools(['all', ...response.data.tools]);
      }
    } catch (err) {
      console.error('Error fetching tools:', err);
      setError('Failed to fetch available tools');
    }
  };

  const fetchLicenseData = async () => {
    try {
      setLoading(true);
      const url = selectedTool === 'all' 
        ? '/api/licenses' 
        : `/api/licenses?tool=${selectedTool}`;
      
      const response = await axios.get(url);
      if (response.data.success) {
        setLicenseData(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching license data:', err);
      setError('Failed to fetch license data');
    } finally {
      setLoading(false);
    }
  };

  const handleToolChange = (tool) => {
    setSelectedTool(tool);
  };

  const handleExpiryStatusChange = (status) => {
    setSelectedExpiryStatus(status);
  };

  // Filter data based on expiry status
  const getFilteredData = () => {
    if (selectedExpiryStatus === 'all') {
      return licenseData;
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    return licenseData.filter(item => {
      if (!item.expiry || item.expiry === 'N/A') {
        return selectedExpiryStatus === 'valid'; // Treat N/A as valid
      }

      // Parse expiry date - format is like "06-aug-2025"
      let expiryDate;
      try {
        const parts = item.expiry.split('-');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const monthStr = parts[1].toLowerCase();
          const year = parseInt(parts[2]);
          
          // Convert month string to number
          const monthMap = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
          };
          
          const month = monthMap[monthStr];
          if (month !== undefined) {
            expiryDate = new Date(year, month, day);
            // Set time to end of day for accurate comparison
            expiryDate.setHours(23, 59, 59, 999);
          } else {
            console.warn('Invalid month in expiry date:', item.expiry);
            return selectedExpiryStatus === 'valid';
          }
        } else {
          console.warn('Invalid expiry date format:', item.expiry);
          return selectedExpiryStatus === 'valid';
        }
      } catch (error) {
        console.error('Error parsing expiry date:', item.expiry, error);
        return selectedExpiryStatus === 'valid';
      }

      // Debug logging
      console.log(`License: ${item.feature}, Expiry: ${item.expiry}, Parsed: ${expiryDate}, Now: ${now}`);
      
      switch (selectedExpiryStatus) {
        case 'valid':
          const isValid = expiryDate > thirtyDaysFromNow;
          console.log(`Valid check: ${isValid} (${expiryDate} > ${thirtyDaysFromNow})`);
          return isValid;
        case 'expiring-soon':
          const isExpiringSoon = expiryDate <= thirtyDaysFromNow && expiryDate > now;
          console.log(`Expiring soon check: ${isExpiringSoon} (${expiryDate} <= ${thirtyDaysFromNow} && ${expiryDate} > ${now})`);
          return isExpiringSoon;
        case 'expired':
          const isExpired = expiryDate <= now;
          console.log(`Expired check: ${isExpired} (${expiryDate} <= ${now})`);
          return isExpired;
        default:
          return true;
      }
    });
  };

  // Background file monitoring (hidden from UI)
  useEffect(() => {
    const checkForChanges = async () => {
      try {
        const response = await axios.get('/api/check-changes');
        if (response.data.success && response.data.hasChanges) {
          console.log('File changes detected, refreshing data...');
          fetchTools();
          fetchLicenseData();
        }
      } catch (err) {
        console.error('Error checking for file changes:', err);
      }
    };

    // Check for changes every 5 seconds (background process)
    const interval = setInterval(checkForChanges, 5000);

    return () => clearInterval(interval);
  }, []);

  const filteredData = getFilteredData();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>EDA License Manager</h1>
          <p>Monitor and manage EDA tool licenses</p>
        </div>
      </header>

      <main className="app-main">
        <div className="controls-section">
          <ToolFilter 
            tools={availableTools}
            selectedTool={selectedTool}
            onToolChange={handleToolChange}
            selectedExpiryStatus={selectedExpiryStatus}
            onExpiryStatusChange={handleExpiryStatusChange}
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="table-section">
          <LicenseTable 
            data={filteredData}
            loading={loading}
            selectedTool={selectedTool}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
