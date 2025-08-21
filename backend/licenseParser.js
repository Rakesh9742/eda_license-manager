const fs = require('fs');
const path = require('path');

class LicenseParser {
  constructor() {
    this.incomingDir = path.join(__dirname, '..', 'incoming');
    this.lastFileState = this.getCurrentFileState();
  }

  // Parse license file and extract relevant data
  parseLicenseFile(filepath, toolName) {
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const lines = content.split('\n');
      const features = [];

      let currentFeature = null;
      let inUserSection = false;
      let users = [];
      let userDetails = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const originalLine = lines[i]; // Keep original with spaces for user detection

        // Check for feature usage pattern
        const featureMatch = line.match(/Users of ([^:]+):\s*\(Total of (\d+) licenses issued;\s*Total of (\d+) licenses in use\)/);
        if (featureMatch) {
          // Save previous feature if exists
          if (currentFeature) {
            currentFeature.users = users;
            currentFeature.userDetails = userDetails;
            features.push(currentFeature);
          }

          // Start new feature
          currentFeature = {
            feature: featureMatch[1],
            totalLicenses: parseInt(featureMatch[2]),
            inUse: parseInt(featureMatch[3]),
            available: parseInt(featureMatch[2]) - parseInt(featureMatch[3]),
            version: '',
            expiry: '',
            tool: toolName,
            users: [],
            userDetails: []
          };
          users = [];
          userDetails = [];
          inUserSection = true;
          continue;
        }

        // Check for feature details (version and expiry)
        const versionMatch = line.match(/"([^"]+)"\s+v([^,]+),.*expiry:\s*([^,\s]+)/);
        if (versionMatch && currentFeature) {
          currentFeature.version = versionMatch[2];
          currentFeature.expiry = versionMatch[3];
          continue;
        }

        // Check for user information - use original line to preserve indentation
        if (inUserSection && currentFeature) {
          // Look for lines that start with 4+ spaces and contain user info with version and start time
          if (originalLine.match(/^\s{4,}/) && originalLine.includes('(v') && originalLine.includes('start')) {
            const userMatch = originalLine.match(/^\s*([^\s]+)/);
            if (userMatch && userMatch[1] !== '') {
              const username = userMatch[1];
              
                            // Parse detailed user information - improved regex pattern
              const userDetailMatch = originalLine.match(/^\s*([^\s]+)\s+([^\s]+)\s+[^:]*:\s*([^\s]+)\s+\(v([^)]+)\)\s+\([^)]+\s+(\d+)\),\s*start\s+(.+)$/);
              if (userDetailMatch) {
                const [, user, host, port, version, processId, startTime] = userDetailMatch;
                const userDetail = {
                  username: user,
                  host: host,
                  port: port,
                  version: version,
                  processId: processId,
                  startTime: startTime.trim(),
                  timestamp: new Date().toISOString() // Current timestamp for tracking
                };
                userDetails.push(userDetail);
                
                // Avoid duplicates in users array
                if (!users.includes(username)) {
                  users.push(username);
                }
              } else {
                // Fallback: simpler pattern for cases where the full pattern doesn't match
                const simpleMatch = originalLine.match(/^\s*([^\s]+)\s+([^\s]+)/);
                if (simpleMatch) {
                  const [, user, host] = simpleMatch;
                  const userDetail = {
                    username: user,
                    host: host,
                    port: 'N/A',
                    version: 'N/A',
                    processId: 'N/A',
                    startTime: 'N/A',
                    timestamp: new Date().toISOString()
                  };
                  userDetails.push(userDetail);
                  
                  // Avoid duplicates in users array
                  if (!users.includes(username)) {
                    users.push(username);
                  }
                }
              }
            }
          }
        }

        // End of feature section - check for next "Users of" pattern or blank line after user section
        if (line === '' && currentFeature && inUserSection) {
          // Don't end user section on blank lines within user list, only when we hit a new feature
          continue;
        }
        
        // If we hit a new "Users of" pattern, the previous section ended
        if (line.startsWith('Users of ') && currentFeature && inUserSection) {
          inUserSection = false;
        }
      }

      // Add last feature
      if (currentFeature) {
        currentFeature.users = users;
        currentFeature.userDetails = userDetails;
        features.push(currentFeature);
      }

      return features;
    } catch (error) {
      console.error(`Error parsing file ${filepath}:`, error);
      return [];
    }
  }

  // Get all license data from incoming folder
  getAllLicenseData() {
    const allData = [];
    
    try {
      const files = fs.readdirSync(this.incomingDir);
      
      for (const file of files) {
        const filepath = path.join(this.incomingDir, file);
        const stats = fs.statSync(filepath);
        
        if (stats.isFile()) {
          const toolName = file.toLowerCase();
          const features = this.parseLicenseFile(filepath, toolName);
          allData.push(...features);
        }
      }
    } catch (error) {
      console.error('Error reading incoming directory:', error);
    }

    return allData;
  }

  // Get license data filtered by tool
  getLicenseDataByTool(toolName) {
    const allData = this.getAllLicenseData();
    if (!toolName || toolName === 'all') {
      return allData;
    }
    return allData.filter(item => item.tool.toLowerCase() === toolName.toLowerCase());
  }

  // Get detailed user information for a specific feature
  getFeatureUserDetails(featureName, toolName) {
    const allData = this.getAllLicenseData();
    const feature = allData.find(item => 
      item.feature === featureName && 
      item.tool.toLowerCase() === toolName.toLowerCase()
    );
    
    if (!feature) {
      return null;
    }

    // Count usage frequency for each user
    const userUsageCount = {};
    const userDetails = feature.userDetails || [];
    
    userDetails.forEach(detail => {
      if (userUsageCount[detail.username]) {
        userUsageCount[detail.username]++;
      } else {
        userUsageCount[detail.username] = 1;
      }
    });

    // Add usage count to each user detail
    const enhancedUserDetails = userDetails.map(detail => ({
      ...detail,
      usageCount: userUsageCount[detail.username]
    }));

    return {
      feature: feature.feature,
      tool: feature.tool,
      version: feature.version,
      expiry: feature.expiry,
      totalLicenses: feature.totalLicenses,
      inUse: feature.inUse,
      available: feature.available,
      userDetails: enhancedUserDetails,
      userUsageCount: userUsageCount
    };
  }

  // Get available tools
  getAvailableTools() {
    try {
      const files = fs.readdirSync(this.incomingDir);
      return files.filter(file => {
        const filepath = path.join(this.incomingDir, file);
        return fs.statSync(filepath).isFile();
      }).map(file => file.toLowerCase());
    } catch (error) {
      console.error('Error reading incoming directory:', error);
      return [];
    }
  }

  // Get current file state (file names and modification times)
  getCurrentFileState() {
    try {
      const files = fs.readdirSync(this.incomingDir);
      const fileState = {};
      
      for (const file of files) {
        const filepath = path.join(this.incomingDir, file);
        const stats = fs.statSync(filepath);
        if (stats.isFile()) {
          fileState[file] = {
            mtime: stats.mtime.getTime(),
            size: stats.size
          };
        }
      }
      
      return fileState;
    } catch (error) {
      console.error('Error reading file state:', error);
      return {};
    }
  }

  // Check for file changes in incoming folder
  checkForFileChanges() {
    try {
      const currentState = this.getCurrentFileState();
      const hasChanges = this.hasFileStateChanged(currentState);
      
      if (hasChanges) {
        this.lastFileState = currentState;
        console.log('File changes detected in incoming folder');
      }
      
      return hasChanges;
    } catch (error) {
      console.error('Error checking for file changes:', error);
      return false;
    }
  }

  // Compare current file state with last known state
  hasFileStateChanged(currentState) {
    const currentFiles = Object.keys(currentState);
    const lastFiles = Object.keys(this.lastFileState);

    // Check if number of files changed
    if (currentFiles.length !== lastFiles.length) {
      return true;
    }

    // Check if any files were added, removed, or modified
    for (const file of currentFiles) {
      if (!this.lastFileState[file]) {
        // New file added
        return true;
      }
      
      const currentFile = currentState[file];
      const lastFile = this.lastFileState[file];
      
      if (currentFile.mtime !== lastFile.mtime || currentFile.size !== lastFile.size) {
        // File was modified
        return true;
      }
    }

    // Check if any files were removed
    for (const file of lastFiles) {
      if (!currentState[file]) {
        // File was removed
        return true;
      }
    }

    return false;
  }
}

module.exports = LicenseParser;
