/**
 * Settings Management System
 * Verwaltet projektübergreifende Einstellungen der Anwendung
 */

class SettingsManager {
    constructor() {
        this.settings = {};
        this.defaults = this.getDefaultSettings();
        this.activeTab = 'general';
        this.backupInterval = null;
        this.init();
    }

    init() {
        try {
            this.loadSettings();
            this.setupEventListeners();
            this.applySettings();
            this.setupAutoBackup();
        } catch (error) {
            Utils.handleError(error, 'Settings Manager Initialization');
        }
    }

    getDefaultSettings() {
        return {
            // General Settings
            language: 'de',
            theme: 'light',
            compactMode: false,
            showTips: true,

            // Formatting Settings
            currency: 'EUR',
            decimalPlaces: 2,
            thousandsSeparator: '.',
            decimalSeparator: ',',

            // Default Values
            defaultDuration: 24,
            defaultPlanning: 6,
            defaultBgfPerWe: 80,
            defaultBriFactor: 3.5,
            defaultWflFactor: 0.85,
            kg300Percent: 55,
            kg400Percent: 25,
            kg500Percent: 5,
            kg700Percent: 15,

            // Backup Settings
            autoBackup: true,
            backupInterval: 15,
            backupCount: 10,

            // Notification Settings
            showNotifications: true,
            notificationDuration: 5,
            notifySave: true,
            notifyCalc: true,
            notifyExport: true,
            notifyErrors: true
        };
    }

    setupEventListeners() {
        try {
            // Settings button
            const settingsBtn = Utils.findElement('#settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => this.openSettings());
            }

            // Settings modal buttons
            const settingsSaveBtn = Utils.findElement('#settings-save-btn');
            if (settingsSaveBtn) {
                settingsSaveBtn.addEventListener('click', () => this.saveSettings());
            }

            const settingsCancelBtn = Utils.findElement('#settings-cancel-btn');
            if (settingsCancelBtn) {
                settingsCancelBtn.addEventListener('click', () => this.cancelSettings());
            }

            const settingsResetBtn = Utils.findElement('#settings-reset-btn');
            if (settingsResetBtn) {
                settingsResetBtn.addEventListener('click', () => this.resetSettings());
            }

            // Tab navigation
            const navTabs = Utils.findAllElements('.settings-nav-tab');
            navTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    this.switchTab(e.target.dataset.tab);
                });
            });

            // Formatting preview
            this.setupFormattingPreview();

            // KG percentage validation
            this.setupKGPercentageValidation();

            // Backup actions
            this.setupBackupActions();

            // Test notification
            const testNotificationBtn = Utils.findElement('#test-notification-btn');
            if (testNotificationBtn) {
                testNotificationBtn.addEventListener('click', () => this.testNotification());
            }

        } catch (error) {
            Utils.handleError(error, 'Setting up Settings Event Listeners');
        }
    }

    setupFormattingPreview() {
        const formattingInputs = [
            '#setting-currency',
            '#setting-decimal-places',
            '#setting-thousands-separator',
            '#setting-decimal-separator'
        ];

        formattingInputs.forEach(selector => {
            const element = Utils.findElement(selector);
            if (element) {
                element.addEventListener('change', () => this.updateFormattingPreview());
            }
        });
    }

    updateFormattingPreview() {
        try {
            const currency = Utils.findElement('#setting-currency')?.value || 'EUR';
            const decimalPlaces = parseInt(Utils.findElement('#setting-decimal-places')?.value || '2');
            const thousandsSeparator = Utils.findElement('#setting-thousands-separator')?.value || '.';
            const decimalSeparator = Utils.findElement('#setting-decimal-separator')?.value || ',';

            const testValue = 1234567.89;
            const formatted = this.formatNumber(testValue, currency, decimalPlaces, thousandsSeparator, decimalSeparator);
            
            const preview = Utils.findElement('#formatting-preview');
            if (preview) {
                preview.textContent = formatted;
            }
        } catch (error) {
            Utils.handleError(error, 'Updating Formatting Preview');
        }
    }

    formatNumber(value, currency = 'EUR', decimalPlaces = 2, thousandsSeparator = '.', decimalSeparator = ',') {
        try {
            // Round to decimal places
            const rounded = Math.round(value * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
            
            // Split into integer and decimal parts
            const parts = rounded.toFixed(decimalPlaces).split('.');
            let integerPart = parts[0];
            const decimalPart = parts[1];

            // Add thousands separators
            if (thousandsSeparator) {
                integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
            }

            // Combine parts
            let result = integerPart;
            if (decimalPlaces > 0) {
                result += decimalSeparator + decimalPart;
            }

            // Add currency symbol
            const currencySymbols = {
                'EUR': '€',
                'USD': '$',
                'CHF': 'Fr.'
            };

            const symbol = currencySymbols[currency] || currency;
            return `${result} ${symbol}`;

        } catch (error) {
            Utils.handleError(error, 'Formatting Number');
            return `${value} ${currency}`;
        }
    }

    setupKGPercentageValidation() {
        const kgInputs = [
            '#setting-kg300-percent',
            '#setting-kg400-percent',
            '#setting-kg500-percent',
            '#setting-kg700-percent'
        ];

        kgInputs.forEach(selector => {
            const element = Utils.findElement(selector);
            if (element) {
                element.addEventListener('input', () => this.validateKGPercentages());
            }
        });
    }

    validateKGPercentages() {
        try {
            const kg300 = parseInt(Utils.findElement('#setting-kg300-percent')?.value || '0');
            const kg400 = parseInt(Utils.findElement('#setting-kg400-percent')?.value || '0');
            const kg500 = parseInt(Utils.findElement('#setting-kg500-percent')?.value || '0');
            const kg700 = parseInt(Utils.findElement('#setting-kg700-percent')?.value || '0');

            const total = kg300 + kg400 + kg500 + kg700;
            
            const totalDisplay = Utils.findElement('#kg-total-percent');
            if (totalDisplay) {
                totalDisplay.textContent = total;
                totalDisplay.style.color = total === 100 ? 'var(--success-color)' : 'var(--danger-color)';
            }

            return total === 100;
        } catch (error) {
            Utils.handleError(error, 'Validating KG Percentages');
            return false;
        }
    }

    setupBackupActions() {
        const backupNowBtn = Utils.findElement('#backup-now-btn');
        if (backupNowBtn) {
            backupNowBtn.addEventListener('click', () => this.createBackupNow());
        }

        const restoreBackupBtn = Utils.findElement('#restore-backup-btn');
        if (restoreBackupBtn) {
            restoreBackupBtn.addEventListener('click', () => this.restoreBackup());
        }

        const clearBackupsBtn = Utils.findElement('#clear-backups-btn');
        if (clearBackupsBtn) {
            clearBackupsBtn.addEventListener('click', () => this.clearAllBackups());
        }
    }

    openSettings() {
        try {
            this.loadSettingsIntoForm();
            this.updateFormattingPreview();
            this.validateKGPercentages();
            this.updateBackupStatus();
            
            const modal = Utils.findElement('#settings-modal');
            if (modal) {
                modal.classList.add('show');
                modal.style.display = 'flex';
            }
        } catch (error) {
            Utils.handleError(error, 'Opening Settings');
        }
    }

    closeSettings() {
        const modal = Utils.findElement('#settings-modal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    }

    switchTab(tabName) {
        try {
            this.activeTab = tabName;

            // Update tab buttons
            Utils.findAllElements('.settings-nav-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.tab === tabName) {
                    tab.classList.add('active');
                }
            });

            // Update tab content
            Utils.findAllElements('.settings-tab-content').forEach(content => {
                content.classList.remove('active');
            });

            const activeContent = Utils.findElement(`#${tabName}-settings`);
            if (activeContent) {
                activeContent.classList.add('active');
            }

            // Update specific tab content if needed
            if (tabName === 'backup') {
                this.updateBackupStatus();
            }
        } catch (error) {
            Utils.handleError(error, `Switching to settings tab: ${tabName}`);
        }
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('kalkulationstool_settings');
            if (savedSettings) {
                this.settings = { ...this.defaults, ...JSON.parse(savedSettings) };
            } else {
                this.settings = { ...this.defaults };
            }
        } catch (error) {
            Utils.handleError(error, 'Loading Settings');
            this.settings = { ...this.defaults };
        }
    }

    loadSettingsIntoForm() {
        try {
            // General Settings
            Utils.setElementValue('#setting-language', this.settings.language);
            Utils.setElementValue('#setting-theme', this.settings.theme);
            Utils.setElementChecked('#setting-compact-mode', this.settings.compactMode);
            Utils.setElementChecked('#setting-show-tips', this.settings.showTips);

            // Formatting Settings
            Utils.setElementValue('#setting-currency', this.settings.currency);
            Utils.setElementValue('#setting-decimal-places', this.settings.decimalPlaces);
            Utils.setElementValue('#setting-thousands-separator', this.settings.thousandsSeparator);
            Utils.setElementValue('#setting-decimal-separator', this.settings.decimalSeparator);

            // Default Values
            Utils.setElementValue('#setting-default-duration', this.settings.defaultDuration);
            Utils.setElementValue('#setting-default-planning', this.settings.defaultPlanning);
            Utils.setElementValue('#setting-default-bgf-per-we', this.settings.defaultBgfPerWe);
            Utils.setElementValue('#setting-default-bri-factor', this.settings.defaultBriFactor);
            Utils.setElementValue('#setting-default-wfl-factor', this.settings.defaultWflFactor);
            Utils.setElementValue('#setting-kg300-percent', this.settings.kg300Percent);
            Utils.setElementValue('#setting-kg400-percent', this.settings.kg400Percent);
            Utils.setElementValue('#setting-kg500-percent', this.settings.kg500Percent);
            Utils.setElementValue('#setting-kg700-percent', this.settings.kg700Percent);

            // Backup Settings
            Utils.setElementChecked('#setting-auto-backup', this.settings.autoBackup);
            Utils.setElementValue('#setting-backup-interval', this.settings.backupInterval);
            Utils.setElementValue('#setting-backup-count', this.settings.backupCount);

            // Notification Settings
            Utils.setElementChecked('#setting-show-notifications', this.settings.showNotifications);
            Utils.setElementValue('#setting-notification-duration', this.settings.notificationDuration);
            Utils.setElementChecked('#setting-notify-save', this.settings.notifySave);
            Utils.setElementChecked('#setting-notify-calc', this.settings.notifyCalc);
            Utils.setElementChecked('#setting-notify-export', this.settings.notifyExport);
            Utils.setElementChecked('#setting-notify-errors', this.settings.notifyErrors);

        } catch (error) {
            Utils.handleError(error, 'Loading Settings into Form');
        }
    }

    saveSettings() {
        try {
            // Validate KG percentages
            if (!this.validateKGPercentages()) {
                showNotification('Kostengruppen-Prozentsätze müssen zusammen 100% ergeben', 'warning');
                return;
            }

            // Collect settings from form
            const newSettings = {
                // General Settings
                language: Utils.getElementValue('#setting-language'),
                theme: Utils.getElementValue('#setting-theme'),
                compactMode: Utils.getElementChecked('#setting-compact-mode'),
                showTips: Utils.getElementChecked('#setting-show-tips'),

                // Formatting Settings
                currency: Utils.getElementValue('#setting-currency'),
                decimalPlaces: parseInt(Utils.getElementValue('#setting-decimal-places')),
                thousandsSeparator: Utils.getElementValue('#setting-thousands-separator'),
                decimalSeparator: Utils.getElementValue('#setting-decimal-separator'),

                // Default Values
                defaultDuration: parseInt(Utils.getElementValue('#setting-default-duration')),
                defaultPlanning: parseInt(Utils.getElementValue('#setting-default-planning')),
                defaultBgfPerWe: parseFloat(Utils.getElementValue('#setting-default-bgf-per-we')),
                defaultBriFactor: parseFloat(Utils.getElementValue('#setting-default-bri-factor')),
                defaultWflFactor: parseFloat(Utils.getElementValue('#setting-default-wfl-factor')),
                kg300Percent: parseInt(Utils.getElementValue('#setting-kg300-percent')),
                kg400Percent: parseInt(Utils.getElementValue('#setting-kg400-percent')),
                kg500Percent: parseInt(Utils.getElementValue('#setting-kg500-percent')),
                kg700Percent: parseInt(Utils.getElementValue('#setting-kg700-percent')),

                // Backup Settings
                autoBackup: Utils.getElementChecked('#setting-auto-backup'),
                backupInterval: parseInt(Utils.getElementValue('#setting-backup-interval')),
                backupCount: parseInt(Utils.getElementValue('#setting-backup-count')),

                // Notification Settings
                showNotifications: Utils.getElementChecked('#setting-show-notifications'),
                notificationDuration: parseInt(Utils.getElementValue('#setting-notification-duration')),
                notifySave: Utils.getElementChecked('#setting-notify-save'),
                notifyCalc: Utils.getElementChecked('#setting-notify-calc'),
                notifyExport: Utils.getElementChecked('#setting-notify-export'),
                notifyErrors: Utils.getElementChecked('#setting-notify-errors')
            };

            this.settings = newSettings;
            localStorage.setItem('kalkulationstool_settings', JSON.stringify(this.settings));
            
            this.applySettings();
            this.closeSettings();
            
            if (this.settings.showNotifications && this.settings.notifySave) {
                showNotification('Einstellungen erfolgreich gespeichert', 'success');
            }

        } catch (error) {
            Utils.handleError(error, 'Saving Settings');
        }
    }

    cancelSettings() {
        this.loadSettingsIntoForm();
        this.closeSettings();
    }

    resetSettings() {
        if (confirm('Möchten Sie wirklich alle Einstellungen auf die Standardwerte zurücksetzen?')) {
            this.settings = { ...this.defaults };
            this.loadSettingsIntoForm();
            this.updateFormattingPreview();
            this.validateKGPercentages();
            showNotification('Einstellungen auf Standardwerte zurückgesetzt', 'info');
        }
    }

    applySettings() {
        try {
            // Apply theme
            this.applyTheme();
            
            // Apply compact mode
            this.applyCompactMode();
            
            // Setup auto backup
            this.setupAutoBackup();
            
            // Update global formatting functions
            this.updateGlobalFormatting();

        } catch (error) {
            Utils.handleError(error, 'Applying Settings');
        }
    }

    applyTheme() {
        try {
            const body = document.body;
            const theme = this.settings.theme;

            body.classList.remove('theme-light', 'theme-dark');

            if (theme === 'dark') {
                body.classList.add('theme-dark');
            } else if (theme === 'light') {
                body.classList.add('theme-light');
            } else if (theme === 'auto') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
            }
        } catch (error) {
            Utils.handleError(error, 'Applying Theme');
        }
    }

    applyCompactMode() {
        try {
            const body = document.body;
            if (this.settings.compactMode) {
                body.classList.add('compact-mode');
            } else {
                body.classList.remove('compact-mode');
            }
        } catch (error) {
            Utils.handleError(error, 'Applying Compact Mode');
        }
    }

    updateGlobalFormatting() {
        try {
            // Update global formatting functions with current settings
            if (window.formatCurrency) {
                const originalFormatCurrency = window.formatCurrency;
                window.formatCurrency = (value) => {
                    return this.formatNumber(
                        value,
                        this.settings.currency,
                        this.settings.decimalPlaces,
                        this.settings.thousandsSeparator,
                        this.settings.decimalSeparator
                    );
                };
            }
        } catch (error) {
            Utils.handleError(error, 'Updating Global Formatting');
        }
    }

    setupAutoBackup() {
        try {
            // Clear existing interval
            if (this.backupInterval) {
                clearInterval(this.backupInterval);
                this.backupInterval = null;
            }

            if (this.settings.autoBackup) {
                const intervalMs = this.settings.backupInterval * 60 * 1000; // Convert minutes to milliseconds
                this.backupInterval = setInterval(() => {
                    this.createAutoBackup();
                }, intervalMs);
            }
        } catch (error) {
            Utils.handleError(error, 'Setting up Auto Backup');
        }
    }

    createBackupNow() {
        try {
            const backup = this.createBackup();
            this.saveBackup(backup, 'manual');
            this.updateBackupStatus();
            showNotification('Backup erfolgreich erstellt', 'success');
        } catch (error) {
            Utils.handleError(error, 'Creating Manual Backup');
        }
    }

    createAutoBackup() {
        try {
            const backup = this.createBackup();
            this.saveBackup(backup, 'auto');
            this.cleanupOldBackups();
        } catch (error) {
            Utils.handleError(error, 'Creating Auto Backup');
        }
    }

    createBackup() {
        return {
            timestamp: new Date().toISOString(),
            projects: window.app?.projects || [],
            settings: this.settings,
            version: '1.0'
        };
    }

    saveBackup(backup, type = 'manual') {
        try {
            const backups = this.getBackups();
            const backupId = `backup_${type}_${Date.now()}`;
            
            backup.id = backupId;
            backup.type = type;
            
            backups.push(backup);
            localStorage.setItem('kalkulationstool_backups', JSON.stringify(backups));
            
            // Update last backup time
            localStorage.setItem('kalkulationstool_last_backup', backup.timestamp);
        } catch (error) {
            Utils.handleError(error, 'Saving Backup');
        }
    }

    getBackups() {
        try {
            const backupsData = localStorage.getItem('kalkulationstool_backups');
            return backupsData ? JSON.parse(backupsData) : [];
        } catch (error) {
            Utils.handleError(error, 'Getting Backups');
            return [];
        }
    }

    cleanupOldBackups() {
        try {
            const backups = this.getBackups();
            const maxBackups = this.settings.backupCount;
            
            // Sort by timestamp, newest first
            backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Keep only the most recent backups
            const trimmedBackups = backups.slice(0, maxBackups);
            
            localStorage.setItem('kalkulationstool_backups', JSON.stringify(trimmedBackups));
        } catch (error) {
            Utils.handleError(error, 'Cleaning up Old Backups');
        }
    }

    restoreBackup() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const backup = JSON.parse(e.target.result);
                            this.performRestore(backup);
                        } catch (error) {
                            showNotification('Ungültige Backup-Datei', 'error');
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        } catch (error) {
            Utils.handleError(error, 'Restoring Backup');
        }
    }

    performRestore(backup) {
        if (confirm('Möchten Sie wirklich das Backup wiederherstellen? Alle aktuellen Daten gehen verloren.')) {
            try {
                if (backup.projects) {
                    window.app.projects = backup.projects;
                    window.app.saveData(false);
                }
                
                if (backup.settings) {
                    this.settings = backup.settings;
                    localStorage.setItem('kalkulationstool_settings', JSON.stringify(this.settings));
                    this.applySettings();
                }
                
                showNotification('Backup erfolgreich wiederhergestellt', 'success');
                location.reload(); // Reload to apply all changes
            } catch (error) {
                Utils.handleError(error, 'Performing Restore');
            }
        }
    }

    clearAllBackups() {
        if (confirm('Möchten Sie wirklich alle Backups löschen?')) {
            try {
                localStorage.removeItem('kalkulationstool_backups');
                localStorage.removeItem('kalkulationstool_last_backup');
                this.updateBackupStatus();
                showNotification('Alle Backups gelöscht', 'info');
            } catch (error) {
                Utils.handleError(error, 'Clearing All Backups');
            }
        }
    }

    updateBackupStatus() {
        try {
            const backups = this.getBackups();
            const lastBackupTime = localStorage.getItem('kalkulationstool_last_backup');
            
            // Update last backup time
            const lastBackupElement = Utils.findElement('#last-backup-time');
            if (lastBackupElement) {
                if (lastBackupTime) {
                    const date = new Date(lastBackupTime);
                    lastBackupElement.textContent = date.toLocaleString('de-DE');
                } else {
                    lastBackupElement.textContent = 'Nie';
                }
            }
            
            // Update backup count
            const backupCountElement = Utils.findElement('#backup-count-display');
            if (backupCountElement) {
                backupCountElement.textContent = backups.length;
            }
            
            // Calculate storage size
            const backupStorageElement = Utils.findElement('#backup-storage-size');
            if (backupStorageElement) {
                const sizeBytes = JSON.stringify(backups).length;
                const sizeKB = Math.round(sizeBytes / 1024);
                backupStorageElement.textContent = `${sizeKB} KB`;
            }
        } catch (error) {
            Utils.handleError(error, 'Updating Backup Status');
        }
    }

    testNotification() {
        showNotification('Dies ist eine Test-Benachrichtigung', 'info');
    }

    // Getter methods for other modules to access settings
    getCurrency() {
        return this.settings.currency || 'EUR';
    }

    getDecimalPlaces() {
        return this.settings.decimalPlaces || 2;
    }

    getThousandsSeparator() {
        return this.settings.thousandsSeparator || '.';
    }

    getDecimalSeparator() {
        return this.settings.decimalSeparator || ',';
    }

    getDefaultDuration() {
        return this.settings.defaultDuration || 24;
    }

    getDefaultPlanning() {
        return this.settings.defaultPlanning || 6;
    }

    getDefaultBgfPerWe() {
        return this.settings.defaultBgfPerWe || 80;
    }

    getDefaultBriFactor() {
        return this.settings.defaultBriFactor || 3.5;
    }

    getDefaultWflFactor() {
        return this.settings.defaultWflFactor || 0.85;
    }

    getKGDefaults() {
        return {
            kg300: this.settings.kg300Percent || 55,
            kg400: this.settings.kg400Percent || 25,
            kg500: this.settings.kg500Percent || 5,
            kg700: this.settings.kg700Percent || 15
        };
    }

    shouldShowNotification(type) {
        if (!this.settings.showNotifications) return false;
        
        switch (type) {
            case 'save': return this.settings.notifySave;
            case 'calc': return this.settings.notifyCalc;
            case 'export': return this.settings.notifyExport;
            case 'error': return this.settings.notifyErrors;
            default: return true;
        }
    }

    getNotificationDuration() {
        return (this.settings.notificationDuration || 5) * 1000; // Convert to milliseconds
    }
}

// Export for global access
window.SettingsManager = SettingsManager; 