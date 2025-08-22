import React, { useCallback, useState } from 'react';

const DropZone = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files)
      .filter(file => file.name.toLowerCase().endsWith('.svg'))
      .map(file => file.path); // Extract just the file paths
      
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files)
      .filter(file => file.name.toLowerCase().endsWith('.svg'))
      .map(file => file.path); // Extract just the file paths
      
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const openFileDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.svg';
    input.onchange = handleFileSelect;
    input.click();
  }, [handleFileSelect]);

  const openFolderDialog = useCallback(async () => {
    try {
      const files = await window.api.openFolderDialog();
      if (Array.isArray(files) && files.length > 0) {
        onFilesSelected(files);
      }
    } catch (e) {
      // No-op
    }
  }, [onFilesSelected]);

  return (
    <div 
      className={`flex-1 flex flex-col items-center justify-center p-4 sm:p-8 ${
        isDragging ? 'bg-primary/10 border-primary dark:bg-primary/20' : 'bg-background border-border'
      } border-2 border-dashed rounded-lg m-2 sm:m-4 transition-colors`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="region"
      aria-label="Drop zone for SVG files"
      tabIndex="0"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openFileDialog();
        }
      }}
    >
      <div className="text-center max-w-md">
        <svg 
          className="w-16 h-16 mx-auto mb-4 text-primary/60" 
          fill="currentColor" 
          viewBox="0 0 24 24" 
          aria-hidden="true"
        >
          <path d="M12 4L8 8h3v8h2V8h3L12 4z" />
          <path d="M19 18H5a1 1 0 000 2h14a1 1 0 000-2z" />
        </svg>
        <p className="mb-4 text-lg font-medium">Drop SVG files here</p>
        <p className="mb-6 text-text-light dark:text-text-light text-sm">Or use the button below</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={openFileDialog}
            className="w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 active:bg-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary transition-colors"
            aria-label="Select SVG files from your device"
          >
            Select Files
          </button>
          <button 
            onClick={openFolderDialog}
            className="w-full sm:w-auto px-6 py-3 bg-background border border-border text-text rounded-lg hover:bg-background/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary transition-colors"
            aria-label="Import a folder of SVGs (recursive)"
          >
            Import Folder
          </button>
        </div>
      </div>
    </div>
  );
};

export default DropZone;
