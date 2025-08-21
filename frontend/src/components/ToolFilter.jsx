import React from 'react';
import './ToolFilter.css';

const ToolFilter = ({ tools, selectedTool, onToolChange, selectedExpiryStatus, onExpiryStatusChange }) => {
  const expiryStatusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'valid', label: 'Valid' },
    { value: 'expiring-soon', label: 'Expiring Soon (30 days)' },
    { value: 'expired', label: 'Expired' }
  ];

  return (
    <div className="filter-container">
      <div className="tool-filter">
        <label htmlFor="tool-select" className="filter-label">
          Select EDA Tool:
        </label>
        <select
          id="tool-select"
          value={selectedTool}
          onChange={(e) => onToolChange(e.target.value)}
          className="tool-select"
        >
          {tools.map((tool) => (
            <option key={tool} value={tool}>
              {tool === 'all' ? 'All Tools' : tool.charAt(0).toUpperCase() + tool.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="expiry-filter">
        <label htmlFor="expiry-select" className="filter-label">
          Expiry Status:
        </label>
        <select
          id="expiry-select"
          value={selectedExpiryStatus}
          onChange={(e) => onExpiryStatusChange(e.target.value)}
          className="expiry-select"
        >
          {expiryStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ToolFilter;
