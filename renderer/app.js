document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const dropZone = document.getElementById('drop-zone');
  const fileList = document.getElementById('file-list');
  const fileListContainer = document.querySelector('.file-list-container');
  const selectFilesButton = document.getElementById('select-files-button');
  const formatSelect = document.getElementById('format-select');
  const formatOptions = document.getElementById('format-options');
  const convertButton = document.getElementById('convert-button');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  const svgPreview = document.getElementById('svg-preview');
  const codeOutput = document.getElementById('code-output');
  const copyCodeButton = document.getElementById('copy-code');
  const saveCodeButton = document.getElementById('save-code');
  const statusElement = document.getElementById('status');
  const appVersionElement = document.getElementById('app-version');
  const toastElement = document.getElementById('toast');
  const themeToggle = document.getElementById('theme-toggle');
  const helpButton = document.getElementById('help-button');
  const helpModal = document.getElementById('help-modal');
  const helpVersion = document.getElementById('help-version');
  const modalCloseButton = document.querySelector('.modal-close');
  const ctaBar = document.getElementById('cta-bar');
  const ctaButton = document.getElementById('cta-button');
  const licenseButton = document.getElementById('license-button');
  const licenseModal = document.getElementById('license-modal');
  const licenseClose = document.getElementById('license-close');
  const licenseInput = document.getElementById('license-input');
  const licenseActivate = document.getElementById('license-activate');
  const licenseClear = document.getElementById('license-clear');
  const licenseStatus = document.getElementById('license-status');
  const ctaEnterLicense = document.getElementById('cta-enter-license');
  const mainContent = document.querySelector('main.app-content');
  
  // State
  let files = [];
  let selectedFormat = 'svg';
  let formatOptionValues = {};
  let currentOutput = null;
  let isProcessing = false;
  let toastTimer = null;
  
  // Initialize
  initApp();
  
  function initApp() {
    // Set version
    const version = window.api.getAppVersion() || '0.1.0';
    appVersionElement.textContent = `v${version}`;
    helpVersion.textContent = version;
    
    // Initialize theme from saved preference or system
    initTheme();
    
    // Initialize format select
    const formats = window.api.getAvailableFormats();
    formats.forEach(format => {
      const option = document.createElement('option');
      option.value = format.id;
      option.textContent = format.name;
      formatSelect.appendChild(option);
    });
    
    // Initialize format options
    updateFormatOptions();
    
    // Set up event listeners
    setupEventListeners();
    // Initialize CTA bar (free plan only)
    initCtaBar();
    // Initialize license state from storage
    initLicense();
  }
  
  function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === 'system') {
      root.removeAttribute('data-theme');
    } else if (mode === 'light' || mode === 'dark') {
      root.setAttribute('data-theme', mode);
    }
  }

  function initTheme() {
    try {
      const saved = localStorage.getItem('theme') || 'system';
      setThemeButtonUI(saved);
      applyTheme(saved);
      
      // Toggle cycles System → Light → Dark → System
      if (themeToggle) {
        themeToggle.addEventListener('click', () => {
          const current = localStorage.getItem('theme') || 'system';
          const next = current === 'system' ? 'light' : (current === 'light' ? 'dark' : 'system');
          localStorage.setItem('theme', next);
          applyTheme(next);
          setThemeButtonUI(next);
          updateStatus(`Theme: ${next}`, false);
        });
      }
      
      // If using system, react to system theme changes
      const mm = window.matchMedia('(prefers-color-scheme: dark)');
      const onSystemChange = () => {
        const current = localStorage.getItem('theme') || 'system';
        if (current === 'system') {
          applyTheme('system');
          setThemeButtonUI('system');
        }
      };
      if (mm.addEventListener) {
        mm.addEventListener('change', onSystemChange);
      } else if (mm.addListener) {
        // Older Chromium fallback
        mm.addListener(onSystemChange);
      }
    } catch (_) {
      // No-op if storage is unavailable
    }
  }

  function setThemeButtonUI(mode) {
    if (!themeToggle) return;
    const map = {
      system: { icon: '🖥️', label: 'Theme: System' },
      light: { icon: '🌞', label: 'Theme: Light' },
      dark: { icon: '🌙', label: 'Theme: Dark' },
    };
    const { icon, label } = map[mode] || map.system;
    themeToggle.setAttribute('aria-label', label);
    themeToggle.setAttribute('title', label);
    themeToggle.innerHTML = `<span aria-hidden="true">${icon}</span><span class="visually-hidden">Theme</span>`;
  }
  
  // Process files function
  async function processFiles() {
    if (files.length === 0 || isProcessing) return;
    if (mainContent) mainContent.setAttribute('aria-busy', 'true');
    setProcessing(true);
    updateStatus('Converting...');
    
    try {
      // Get options
      const options = {};
      Object.keys(formatOptionValues).forEach(key => {
        options[key] = formatOptionValues[key];
      });
      
      // Process files
      const filePaths = files.map(f => f.path);
      let result;
      
      if (filePaths.length === 1) {
        result = await window.api.processSvg(filePaths[0], selectedFormat, options);
      } else {
        result = await window.api.processSvgBatch(filePaths, selectedFormat, options);
      }
      
      if (result.success) {
        // Add detailed debug logging
        window.api.logError('SVG Processing Result', JSON.stringify(result, null, 2));
        console.log('SVG processing result:', result);
        
        // Log the correct property based on processing mode (main returns output/outputs)
        if (filePaths.length === 1) {
          console.log('Single file content:', typeof result.output, result.output);
          window.api.logError('Single file content', typeof result.output + ': ' + result.output);
          displayOutput(result.output);
        } else {
          console.log('Batch files content:', typeof result.outputs, result.outputs);
          window.api.logError('Batch files content', typeof result.outputs + ': ' + JSON.stringify(result.outputs));
          displayOutput(result.outputs);
        }
        updateStatus('Conversion successful');
      } else {
        const errorMsg = result.error || 'Unknown error';
        window.api.logError('SVG processing failed', errorMsg);
        updateStatus(`Error: ${errorMsg}`, true);
      }
    } catch (error) {
      window.api.logError('Error processing SVG', error);
      console.error('Error processing SVG:', error);
      updateStatus(`Error: ${error.message || 'Unknown error'}`, true);
    }
    
    setProcessing(false);
    if (mainContent) mainContent.setAttribute('aria-busy', 'false');
  }
  
  function setupEventListeners() {
    // Drag and drop events
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('active');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('active');
    });
    
    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('active');
      
      const droppedFiles = Array.from(e.dataTransfer.files)
        .filter(file => file.name.toLowerCase().endsWith('.svg'));
      
      if (droppedFiles.length > 0) {
        // Automatically process dropped files
        addFiles(droppedFiles);
        await processFiles();
      }
    });
    
    // Select files button
    selectFilesButton.addEventListener('click', async () => {
      const filePaths = await window.api.openFileDialog();
      if (filePaths && filePaths.length > 0) {
        const newFiles = filePaths.map(path => ({
          path,
          name: path.split('/').pop()
        }));
        addFiles(newFiles);
        await processFiles(); // Auto-process when files are selected
      }
    });
    
    // Format select change
    formatSelect.addEventListener('change', async () => {
      selectedFormat = formatSelect.value;
      updateFormatOptions();
      
      // Auto-process when format changes and files exist
      if (files.length > 0) {
        await processFiles();
      }
    });
    
    // Convert button (optional; may be removed)
    if (convertButton) {
      convertButton.addEventListener('click', () => {
        processFiles();
      });
    }
    
    // Tab switching (preview-only UI may not include tabs)
    if (tabButtons && tabButtons.length) {
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          const tab = button.getAttribute('data-tab');
          // Update active tab button
          tabButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          // Show active tab content
          tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tab}-tab`);
          });
        });
      });
    }
    
    // Copy code button (guard for preview-only UI)
    if (copyCodeButton) {
      copyCodeButton.addEventListener('click', () => {
        if (!currentOutput) return;
        navigator.clipboard.writeText(currentOutput)
          .then(() => updateStatus('Code copied to clipboard'))
          .catch(err => updateStatus('Failed to copy code', true));
      });
    }
    
    // Save code button (guard for preview-only UI)
    if (saveCodeButton) {
      saveCodeButton.addEventListener('click', async () => {
        if (!currentOutput) return;
        try {
          const savePath = await window.api.saveFileDialog(selectedFormat);
          if (savePath) {
            await window.api.saveToFile(savePath, currentOutput);
            updateStatus('File saved successfully');
          }
        } catch (error) {
          window.api.logError('Failed to save file', error);
          updateStatus(`Failed to save file: ${error.message}`, true);
        }
      });
    }
    
    // Help button (optional, may be removed from UI)
    if (helpButton && helpModal) {
      helpButton.addEventListener('click', () => {
        helpModal.style.display = 'flex';
      });
    }
    
    // Modal close button (optional, tied to Help modal)
    if (modalCloseButton && helpModal) {
      modalCloseButton.addEventListener('click', () => {
        helpModal.style.display = 'none';
      });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === helpModal) helpModal.style.display = 'none';
      if (e.target === licenseModal) licenseModal.style.display = 'none';
    });

    // License button -> open modal
    if (licenseButton) {
      licenseButton.addEventListener('click', async () => {
        try {
          const existing = await window.api.getLicense();
          if (existing) licenseInput.value = existing;
        } catch (_) {}
        licenseStatus.textContent = '';
        licenseModal.style.display = 'flex';
      });
    }

    // CTA enter license -> open modal
    if (ctaEnterLicense) {
      ctaEnterLicense.addEventListener('click', () => {
        licenseStatus.textContent = '';
        licenseModal.style.display = 'flex';
      });
    }

    // License modal close
    if (licenseClose) {
      licenseClose.addEventListener('click', () => {
        licenseModal.style.display = 'none';
      });
    }

    // Validate & activate license
    if (licenseActivate) {
      licenseActivate.addEventListener('click', async () => {
        const key = (licenseInput.value || '').trim();
        if (!key) {
          setLicenseStatus('Please paste your license key.', true);
          return;
        }
        try {
          const result = await window.api.validateLicense(key);
          if (result && result.valid) {
            await window.api.setLicense(key);
            await window.api.setPlan('pro');
            hideCta();
            setLicenseStatus('License activated. Thanks for supporting SVGwiz!', false);
            setTimeout(() => { licenseModal.style.display = 'none'; }, 900);
          } else {
            setLicenseStatus(`Invalid license${result?.reason ? `: ${result.reason}` : ''}`, true);
          }
        } catch (e) {
          window.api.logError('License activate error', e?.message || e);
          setLicenseStatus('Failed to validate license.', true);
        }
      });
    }

    // Clear license
    if (licenseClear) {
      licenseClear.addEventListener('click', async () => {
        try {
          await window.api.clearLicense();
          await window.api.setPlan('free');
          showCta();
          setLicenseStatus('Stored license cleared.', false);
        } catch (e) {
          window.api.logError('License clear error', e?.message || e);
          setLicenseStatus('Failed to clear license.', true);
        }
      });
    }
  }
  
  function updateFormatOptions() {
    formatOptions.innerHTML = '';
    // Reset stored values for current format
    formatOptionValues = {};
    const optionsForFormat = window.api.getFormatOptions(selectedFormat);
    if (!optionsForFormat || typeof optionsForFormat !== 'object') return;

    Object.entries(optionsForFormat).forEach(([key, option]) => {
      const optionGroup = document.createElement('div');
      optionGroup.className = 'option-group';
      
      if (option.type === 'boolean') {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `option-${key}`;
        input.checked = option.default;
        formatOptionValues[key] = option.default;
        
        input.addEventListener('change', () => {
          formatOptionValues[key] = input.checked;
          
          // Auto-process when options change
          if (files.length > 0) {
            processFiles();
          }
        });
        
        label.appendChild(input);
        
        const span = document.createElement('span');
        span.textContent = option.label;
        label.appendChild(span);
        
        optionGroup.appendChild(label);
      } else if (option.type === 'text') {
        const label = document.createElement('label');
        label.htmlFor = `option-${key}`;
        label.textContent = option.label;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `option-${key}`;
        input.className = 'text-input';
        input.value = option.default;
        formatOptionValues[key] = option.default;
        
        input.addEventListener('input', () => {
          formatOptionValues[key] = input.value;
          
          // Auto-process when options change and files exist
          if (files.length > 0) {
            processFiles();
          }
        });
        
        optionGroup.appendChild(label);
        optionGroup.appendChild(input);
      } else if (option.type === 'select') {
        const label = document.createElement('label');
        label.htmlFor = `option-${key}`;
        label.textContent = option.label;
        
        const select = document.createElement('select');
        select.id = `option-${key}`;
        select.className = 'select-input';
        formatOptionValues[key] = option.default;
        
        option.options.forEach(opt => {
          const optElement = document.createElement('option');
          optElement.value = opt.value;
          optElement.textContent = opt.label;
          if (opt.value === option.default) {
            optElement.selected = true;
          }
          select.appendChild(optElement);
        });
        
        select.addEventListener('change', () => {
          formatOptionValues[key] = select.value;
          
          // Auto-process when options change
          if (files.length > 0) {
            processFiles();
          }
        });
        
        optionGroup.appendChild(label);
        optionGroup.appendChild(select);
      }
      
      formatOptions.appendChild(optionGroup);
    });
  }
  
  function addFiles(newFiles) {
    // Add files to state
    files = [...files, ...newFiles];
    
    // Update UI
    updateFileList();
    updateConvertButtonState();
  }
  
  function updateFileList() {
    fileList.innerHTML = '';
    
    if (files.length === 0) {
      fileListContainer.classList.remove('has-files');
      dropZone.querySelector('.drop-zone-prompt').style.display = 'flex';
      return;
    }
    
    fileListContainer.classList.add('has-files');
    dropZone.querySelector('.drop-zone-prompt').style.display = 'none';
    
    files.forEach((file, index) => {
      const li = document.createElement('li');
      
      const fileName = document.createElement('span');
      fileName.className = 'file-name';
      fileName.textContent = file.name;
      
      const removeButton = document.createElement('button');
      removeButton.className = 'file-remove';
      removeButton.innerHTML = '&times;';
      removeButton.addEventListener('click', () => {
        files.splice(index, 1);
        updateFileList();
        updateConvertButtonState();
        
        // Auto-process if files still exist after removal
        if (files.length > 0) {
          processFiles();
        }
      });
      
      li.appendChild(fileName);
      li.appendChild(removeButton);
      fileList.appendChild(li);
    });
  }
  
  function updateConvertButtonState() {
    if (convertButton) {
      convertButton.disabled = files.length === 0 || isProcessing;
    }
  }
  
  function setProcessing(processing) {
    isProcessing = processing;
    updateConvertButtonState();
  }

  // Initialize CTA bar visibility and click behavior
  async function initCtaBar() {
    try {
      const plan = await window.api.getPlan();
      if (ctaBar) {
        ctaBar.hidden = plan !== 'free';
      }
      if (plan === 'free' && ctaButton) {
        ctaButton.addEventListener('click', async () => {
          try {
            const link = await window.api.getStripeLink();
            if (link && typeof link === 'string' && link.startsWith('http')) {
              updateStatus('Opening checkout...');
              await window.api.openExternal(link);
            } else {
              updateStatus('Payment link not configured', true);
              window.api.logError('Stripe link missing', link);
            }
          } catch (e) {
            window.api.logError('CTA click error', e?.message || e);
            updateStatus('Failed to open checkout', true);
          }
        });
      }
    } catch (e) {
      window.api.logError('CTA init error', e?.message || e);
    }
  }

  async function initLicense() {
    try {
      const stored = await window.api.getLicense();
      if (stored) {
        const result = await window.api.validateLicense(stored);
        if (result?.valid) {
          await window.api.setPlan('pro');
          hideCta();
          return;
        }
      }
      // No stored valid license; ensure free plan
      await window.api.setPlan('free');
      showCta();
    } catch (e) {
      window.api.logError('License init error', e?.message || e);
    }
  }

  function setLicenseStatus(msg, isError) {
    if (!licenseStatus) return;
    licenseStatus.textContent = msg;
    licenseStatus.style.color = isError ? 'var(--color-error)' : 'var(--color-success)';
  }

  function hideCta() { if (ctaBar) ctaBar.hidden = true; }
  function showCta() { if (ctaBar) ctaBar.hidden = false; }
  
  function displayOutput(code) {
    const codeText = Array.isArray(code) ? code.join('\n\n') : code;
    currentOutput = codeText;
    if (codeOutput) codeOutput.textContent = codeText;
    if (copyCodeButton) copyCodeButton.disabled = false;
    if (saveCodeButton) saveCodeButton.disabled = false;
    
    // Preview for SVG output
    if (selectedFormat === 'svg' || selectedFormat === 'svgsymbol') {
      svgPreview.innerHTML = '';
      
      // Special handling for svgsymbol outputs (they may be <symbol> only or a single <svg> containing multiple <symbol>s)
      if (selectedFormat === 'svgsymbol') {
        try {
          if (!Array.isArray(code)) {
            // Single output: could be a raw <symbol> markup
            const isSymbolOnly = /<\s*symbol\b/i.test(code);
            if (isSymbolOnly) {
              const container = createSvgContainer(code, files.length === 1 ? files[0].name : null);
              svgPreview.appendChild(container);
            } else {
              // Fallback to normal rendering
              const container = createSvgContainer(code, files.length === 1 ? files[0].name : null);
              svgPreview.appendChild(container);
            }
          } else {
            // Batch: svgsus returns a single <svg> with multiple <symbol> entries
            if (code.length === 1 && /<\s*svg\b/i.test(code[0]) && /<\s*symbol\b/i.test(code[0])) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(code[0], 'image/svg+xml');
              const symbols = Array.from(doc.querySelectorAll('symbol[id]'));
              window.api.logError('Parsed symbols count', symbols.length);
              if (symbols.length > 0) {
                symbols.forEach((sym, idx) => {
                  const id = sym.getAttribute('id');
                  const symbolMarkup = new XMLSerializer().serializeToString(sym);
                  const visibleMarkup = buildVisibleSymbolSvg(symbolMarkup, id);
                  const fileName = files[idx] ? files[idx].name : id;
                  const container = createSvgContainer(visibleMarkup, fileName);
                  svgPreview.appendChild(container);
                });
              } else {
                // No symbols found; render as-is
                const container = createSvgContainer(code[0], files.length === 1 ? files[0].name : null);
                svgPreview.appendChild(container);
              }
            } else {
              // General array case
              code.forEach((svgCode, index) => {
                const container = createSvgContainer(svgCode, files[index] ? files[index].name : null);
                svgPreview.appendChild(container);
              });
            }
          }
        } catch (e) {
          window.api.logError('svgsymbol preview handling error', e?.message || e);
          // Fallback to simple rendering
          const container = createSvgContainer(Array.isArray(code) ? code[0] : code, files.length === 1 ? files[0].name : null);
          svgPreview.appendChild(container);
        }
      } else {
        // Standard svg format
        if (!Array.isArray(code)) {
          const container = createSvgContainer(code, files.length === 1 ? files[0].name : null);
          svgPreview.appendChild(container);
        } else {
          code.forEach((svgCode, index) => {
            const fileName = files[index] ? files[index].name : null;
            const container = createSvgContainer(svgCode, fileName);
            svgPreview.appendChild(container);
          });
        }
      }
    } else {
      svgPreview.innerHTML = '<div class="preview-placeholder"><p>No preview available for this format</p></div>';
    }
    
    // Preview-only UI: keep preview visible; no tab switching
  }
  
  function updateStatus(message, isError = false) {
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.style.color = isError ? 'var(--color-error)' : '';
    }
    // Lightweight toast notification
    showToast(message, isError);

    // Clear error message after 5 seconds (footer status only)
    if (isError && statusElement) {
      setTimeout(() => {
        statusElement.textContent = 'Ready';
        statusElement.style.color = '';
      }, 5000);
    }
  }
  
  function showToast(message, isError = false) {
    if (!toastElement) return;
    toastElement.textContent = message;
    toastElement.classList.toggle('error', !!isError);
    toastElement.hidden = false;
    // Trigger reflow so transition runs when class is added
    void toastElement.offsetWidth;
    toastElement.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastElement.classList.remove('visible');
      setTimeout(() => {
        toastElement.hidden = true;
        toastElement.textContent = '';
      }, 250);
    }, isError ? 4000 : 2000);
  }

  // Helper function to create SVG containers for the grid
  function createSvgContainer(svgCode, fileName) {
    // Debug what we're receiving
    console.log('SVG code received:', svgCode);
    window.api.logError('SVG code content', svgCode);
    
    const container = document.createElement('div');
    container.className = 'svg-container';
    // Detect raw <symbol> markup and wrap it with a visible <svg><use>
    const isSymbolOnly = typeof svgCode === 'string' && /<\s*symbol\b/i.test(svgCode) && !/<\s*svg\b/i.test(svgCode);
    if (isSymbolOnly) {
      const idMatch = svgCode.match(/id\s*=\s*["']([^"']+)["']/i);
      const id = idMatch ? idMatch[1] : 'svgwiz-symbol';
      const visible = buildVisibleSymbolSvg(svgCode, id);
      container.innerHTML = visible;
    } else {
      container.innerHTML = svgCode;
    }
    
    // Ensure SVG is visible and properly sized
    const svg = container.querySelector('svg');
    if (svg) {
      // If this svg wraps a <symbol> in <defs>, adopt its viewBox if our root lacks one
      const symbolInDefs = container.querySelector('defs > symbol');
      if (symbolInDefs && symbolInDefs.hasAttribute('viewBox') && !svg.hasAttribute('viewBox')) {
        svg.setAttribute('viewBox', symbolInDefs.getAttribute('viewBox'));
      }
      // Make sure SVG has proper viewBox if not already present
      if (!svg.hasAttribute('viewBox') && svg.hasAttribute('width') && svg.hasAttribute('height')) {
        const width = parseFloat(svg.getAttribute('width'));
        const height = parseFloat(svg.getAttribute('height'));
        if (!isNaN(width) && !isNaN(height)) {
          svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
      }
      
      // Remove fixed dimensions to allow proper scaling
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.style.width = '100%';
      svg.style.height = '100%';
    }
    
    // Add filename if provided
    if (fileName) {
      const fileNameElement = document.createElement('div');
      fileNameElement.className = 'file-name';
      fileNameElement.textContent = fileName;
      container.appendChild(fileNameElement);
    }
    
    return container;
  }

  // Build a visible <svg> that renders a <symbol> by id using <use>
  function buildVisibleSymbolSvg(symbolMarkup, id) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <defs>
          ${symbolMarkup}
        </defs>
        <use href="#${id}" xlink:href="#${id}" width="100%" height="100%" x="0" y="0" />
      </svg>
    `;
  }
});
