import React, { useState, useEffect } from 'react';

const Sidebar = ({ format, onFormatChange, options, onOptionsChange }) => {
  const [formatList, setFormatList] = useState([]);
  const [formatOptionsConfig, setFormatOptionsConfig] = useState({});

  // Fetch available formats using preload bridge
  useEffect(() => {
    const fetchFormats = async () => {
      try {
        const formats = await window.api.getAvailableFormats();
        setFormatList(formats || []);
      } catch (error) {
        console.error('Error fetching formats:', error);
      }
    };
    
    fetchFormats();
  }, []);

  // Fetch format-specific options when format changes
  useEffect(() => {
    const fetchFormatOptions = async () => {
      try {
        const optionsConfig = await window.api.getFormatOptions(format);
        setFormatOptionsConfig(optionsConfig || {});
      } catch (error) {
        console.error('Error fetching format options:', error);
      }
    };
    
    if (format) {
      fetchFormatOptions();
    }
  }, [format]);

  return (
    <aside className="w-64 shrink-0 bg-surface border-r border-border p-4 overflow-y-auto" aria-label="Configuration options">
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          Output Format
        </h3>
        <div className="relative">
          <select
            id="format-select"
            value={format}
            onChange={(e) => onFormatChange(e.target.value)}
            className="w-full p-2 pl-3 pr-10 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none transition-colors"
            aria-label="Select output format"
          >
            {formatList.map((fmt) => (
              <option key={fmt.id} value={fmt.id}>
                {fmt.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-text-light">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-medium mb-3 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Options
        </h3>
        <div className="space-y-4">
          {Object.entries(formatOptionsConfig).map(([optionId, optionConfig]) => (
            <div key={optionId} className="group">
              <label 
                className="block mb-1.5 text-sm font-medium" 
                htmlFor={optionId}
              >
                {optionConfig.label}
                {optionConfig.description && (
                  <span className="ml-1 text-text-light text-xs">(?)                   
                    <span className="tooltip hidden group-hover:block absolute bg-surface p-2 rounded shadow-lg border border-border text-xs z-10 max-w-xs">
                      {optionConfig.description}
                    </span>
                  </span>
                )}
              </label>
              
              {optionConfig.type === 'boolean' ? (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={optionId}
                    checked={options[optionId] ?? optionConfig.default}
                    onChange={(e) => 
                      onOptionsChange({ [optionId]: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span className="ml-2 text-sm text-text-light">
                    {options[optionId] ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ) : optionConfig.type === 'select' ? (
                <div className="relative">
                  <select
                    id={optionId}
                    value={options[optionId] ?? optionConfig.default}
                    onChange={(e) => 
                      onOptionsChange({ [optionId]: e.target.value })
                    }
                    className="w-full p-2 pl-3 pr-10 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none transition-colors"
                  >
                    {optionConfig.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-text-light">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  id={optionId}
                  value={options[optionId] ?? optionConfig.default ?? ''}
                  onChange={(e) => 
                    onOptionsChange({ [optionId]: e.target.value })
                  }
                  className="w-full p-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
