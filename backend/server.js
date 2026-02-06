const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const LicenseParser = require('./licenseParser');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize license parser
const parser = new LicenseParser();



// Routes

// Get all available tools
app.get('/api/tools', (req, res) => {
  try {
    const tools = parser.getAvailableTools();
    res.json({ success: true, tools });
  } catch (error) {
    console.error('Error getting tools:', error);
    res.status(500).json({ success: false, error: 'Failed to get tools' });
  }
});

// Get license data with optional tool filter
app.get('/api/licenses', (req, res) => {
  try {
    const { tool } = req.query;
    const data = parser.getLicenseDataByTool(tool);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting license data:', error);
    res.status(500).json({ success: false, error: 'Failed to get license data' });
  }
});



// Get license data for specific tool
app.get('/api/licenses/:tool', (req, res) => {
  try {
    const { tool } = req.params;
    const data = parser.getLicenseDataByTool(tool);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting license data for tool:', error);
    res.status(500).json({ success: false, error: 'Failed to get license data' });
  }
});

// Get detailed user information for a specific feature
app.get('/api/feature/:tool/:feature', (req, res) => {
  try {
    const { tool, feature } = req.params;
    const featureDetails = parser.getFeatureUserDetails(feature, tool);
    
    if (!featureDetails) {
      return res.status(404).json({ 
        success: false, 
        error: 'Feature not found' 
      });
    }
    
    res.json({ success: true, data: featureDetails });
  } catch (error) {
    console.error('Error getting feature details:', error);
    res.status(500).json({ success: false, error: 'Failed to get feature details' });
  }
});

// Check for file changes in incoming folder
app.get('/api/check-changes', (req, res) => {
  try {
    const hasChanges = parser.checkForFileChanges();
    res.json({ success: true, hasChanges });
  } catch (error) {
    console.error('Error checking for file changes:', error);
    res.status(500).json({ success: false, error: 'Failed to check for file changes' });
  }
});

// Refresh license data (re-check file state; client should refetch GET /api/licenses)
app.post('/api/licenses/refresh', (req, res) => {
  try {
    const hasChanges = parser.checkForFileChanges();
    res.json({ success: true, hasChanges });
  } catch (error) {
    console.error('Error refreshing license data:', error);
    res.status(500).json({ success: false, error: 'Failed to refresh license data' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'EDA License Manager API is running' });
});

// Start server
app.listen(port, () => {
  console.log(`EDA License Manager backend running on port ${port}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  /api/health - Health check`);
  console.log(`  GET  /api/tools - Get available tools`);
  console.log(`  GET  /api/licenses?tool=<tool> - Get license data with optional tool filter`);
  console.log(`  GET  /api/licenses/<tool> - Get license data for specific tool`);
  console.log(`  GET  /api/check-changes - Check for file changes in incoming folder`);
  console.log(`  POST /api/licenses/refresh - Refresh license data (re-check files)`);
  console.log(`\nMonitoring incoming/ folder for license files...`);
});
