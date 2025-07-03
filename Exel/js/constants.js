/**
 * Konstanten und Konfiguration
 * Zentrale Verwaltung aller Anwendungskonstanten
 */

// Anwendungskonfiguration
const APP_CONFIG = {
    VERSION: '1.2.0',
    NAME: 'Kalkulationstool',
    DATA_KEY: 'kalkulationstool_data',
    AUTO_SAVE_INTERVAL: 30000, // 30 Sekunden
    NOTIFICATION_DURATION: 3000
};

// Export-Konfiguration
const EXPORT_CONFIG = {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    SUPPORTED_FORMATS: ['xlsx', 'csv', 'json'],
    EXCEL_LIBRARY_URL: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
};

// Validierungsregeln
const VALIDATION_RULES = {
    PROJECT_NAME: {
        MIN_LENGTH: 1,
        MAX_LENGTH: 100
    },
    DESCRIPTION: {
        MIN_LENGTH: 0,
        MAX_LENGTH: 500
    },
    CURRENCY: {
        MIN_VALUE: 0,
        MAX_VALUE: 999999999
    },
    AREA: {
        MIN_VALUE: 0,
        MAX_VALUE: 1000000
    }
};

// Standard-Kostengruppen KG 100-800
const STANDARD_KOSTENGRUPPEN = [
    { nr: '100', bezeichnung: 'Grundstück', parent: null },
    { nr: '200', bezeichnung: 'Herrichten und Erschließen', parent: null },
    { nr: '300', bezeichnung: 'Bauwerk - Baukonstruktion', parent: null },
    { nr: '310', bezeichnung: 'Baugrube, Erdbau', parent: '300' },
    { nr: '320', bezeichnung: 'Gründung, Unterbau', parent: '300' },
    { nr: '330', bezeichnung: 'Außenwände', parent: '300' },
    { nr: '340', bezeichnung: 'Innenwände', parent: '300' },
    { nr: '350', bezeichnung: 'Decken', parent: '300' },
    { nr: '360', bezeichnung: 'Dächer', parent: '300' },
    { nr: '370', bezeichnung: 'Sonstige Maßnahmen für Baukonstruktion', parent: '300' },
    { nr: '400', bezeichnung: 'Bauwerk - Technische Anlagen', parent: null },
    { nr: '410', bezeichnung: 'Abwasser-, Wasser-, Gasanlagen', parent: '400' },
    { nr: '420', bezeichnung: 'Wärmeversorgungsanlagen', parent: '400' },
    { nr: '430', bezeichnung: 'Lufttechnische Anlagen', parent: '400' },
    { nr: '440', bezeichnung: 'Elektrische Anlagen', parent: '400' },
    { nr: '450', bezeichnung: 'Fernmelde- und informationstechnische Anlagen', parent: '400' },
    { nr: '460', bezeichnung: 'Förderanlagen', parent: '400' },
    { nr: '470', bezeichnung: 'Nutzungsspezifische und verfahrenstechnische Anlagen', parent: '400' },
    { nr: '480', bezeichnung: 'Gebäudeautomation', parent: '400' },
    { nr: '490', bezeichnung: 'Sonstige Maßnahmen für technische Anlagen', parent: '400' },
    { nr: '500', bezeichnung: 'Außenanlagen und Freiflächen', parent: null },
    { nr: '600', bezeichnung: 'Ausstattung und Kunstwerke', parent: null },
    { nr: '700', bezeichnung: 'Baunebenkosten', parent: null },
    { nr: '800', bezeichnung: 'Finanzierung', parent: null }
];

// Standard-Gewerke für KG 300-400
const STANDARD_GEWERKE = [
    { nr: '001', bezeichnung: 'Erdarbeiten', category: 'rohbau' },
    { nr: '002', bezeichnung: 'Rohbauarbeiten', category: 'rohbau' },
    { nr: '003', bezeichnung: 'Betonarbeiten', category: 'rohbau' },
    { nr: '004', bezeichnung: 'Mauerarbeiten', category: 'rohbau' },
    { nr: '005', bezeichnung: 'Zimmererarbeiten', category: 'rohbau' },
    { nr: '006', bezeichnung: 'Klempnerarbeiten', category: 'rohbau' },
    { nr: '007', bezeichnung: 'Abdichtungsarbeiten', category: 'rohbau' },
    { nr: '008', bezeichnung: 'Dachdeckerarbeiten', category: 'rohbau' },
    { nr: '009', bezeichnung: 'Gerüstarbeiten', category: 'rohbau' },
    { nr: '010', bezeichnung: 'Putzarbeiten', category: 'ausbau' },
    { nr: '011', bezeichnung: 'Estricharbeiten', category: 'ausbau' },
    { nr: '012', bezeichnung: 'Fliesenarbeiten', category: 'ausbau' },
    { nr: '013', bezeichnung: 'Malerarbeiten', category: 'ausbau' },
    { nr: '014', bezeichnung: 'Bodenbelagsarbeiten', category: 'ausbau' },
    { nr: '015', bezeichnung: 'Tischlerarbeiten', category: 'ausbau' },
    { nr: '016', bezeichnung: 'Glaserarbeiten', category: 'ausbau' },
    { nr: '017', bezeichnung: 'Sanitärinstallation', category: 'technik' },
    { nr: '018', bezeichnung: 'Heizungsinstallation', category: 'technik' },
    { nr: '019', bezeichnung: 'Elektroinstallation', category: 'technik' },
    { nr: '020', bezeichnung: 'Lüftungsarbeiten', category: 'technik' }
];

// Liquiditäts-Verteilungsprofile
const LIQUIDITY_PROFILES = {
    PLANNING_HEAVY: {
        planning: 0.8,
        early_construction: 0.15,
        late_construction: 0.05
    },
    BALANCED: {
        planning: 0.3,
        early_construction: 0.4,
        late_construction: 0.3
    },
    CONSTRUCTION_HEAVY: {
        planning: 0.1,
        early_construction: 0.6,
        late_construction: 0.3
    }
};

// UI-Konfiguration
const UI_CONFIG = {
    MODAL_ANIMATION_DURATION: 300,
    NOTIFICATION_POSITION: 'top-right',
    TABLE_ROW_HEIGHT: 45,
    MOBILE_BREAKPOINT: 768
};

// Benutzer-Rollen und Berechtigungen
const USER_PERMISSIONS = {
    ADMIN: ['read', 'write', 'delete', 'export', 'manage_users'],
    EDITOR: ['read', 'write', 'export'],
    VIEWER: ['read', 'export']
};

// Farbschema für Diagramme und Visualisierung
const COLOR_SCHEME = {
    PRIMARY: '#007bff',
    SUCCESS: '#28a745',
    WARNING: '#ffc107',
    ERROR: '#dc3545',
    INFO: '#17a2b8',
    LIGHT: '#f8f9fa',
    DARK: '#343a40',
    
    // Kostengruppen-Farben
    KG_COLORS: {
        '100': '#FF6B6B',  // Grundstück
        '200': '#4ECDC4',  // Erschließung
        '300': '#45B7D1',  // Baukonstruktion
        '400': '#96CEB4',  // Technische Anlagen
        '500': '#FFEAA7',  // Außenanlagen
        '600': '#DDA0DD',  // Ausstattung
        '700': '#98D8C8',  // Baunebenkosten
        '800': '#F7DC6F'   // Finanzierung
    }
};

// Performance-Optimierung
const PERFORMANCE_CONFIG = {
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100,
    MAX_TABLE_ROWS: 1000,
    VIRTUAL_SCROLL_THRESHOLD: 100
};

// Browser-Kompatibilität
const BROWSER_SUPPORT = {
    MIN_CHROME: 80,
    MIN_FIREFOX: 75,
    MIN_SAFARI: 13,
    MIN_EDGE: 80
};

// Lokalisierung
const LOCALIZATION = {
    CURRENCY: 'EUR',
    NUMBER_FORMAT: 'de-DE',
    DATE_FORMAT: 'DD.MM.YYYY',
    DECIMAL_SEPARATOR: ',',
    THOUSAND_SEPARATOR: '.'
};

// Globale Verfügbarkeit
window.APP_CONSTANTS = {
    APP_CONFIG,
    EXPORT_CONFIG,
    VALIDATION_RULES,
    STANDARD_KOSTENGRUPPEN,
    STANDARD_GEWERKE,
    LIQUIDITY_PROFILES,
    UI_CONFIG,
    COLOR_SCHEME,
    PERFORMANCE_CONFIG,
    LOCALIZATION
};

// Einzelne Konstanten auch global verfügbar machen
window.APP_CONFIG = APP_CONFIG;
window.EXPORT_CONFIG = EXPORT_CONFIG;
window.VALIDATION_RULES = VALIDATION_RULES;
window.STANDARD_KOSTENGRUPPEN = STANDARD_KOSTENGRUPPEN;
window.STANDARD_GEWERKE = STANDARD_GEWERKE;
window.LIQUIDITY_PROFILES = LIQUIDITY_PROFILES;
window.UI_CONFIG = UI_CONFIG;
window.COLOR_SCHEME = COLOR_SCHEME;
window.PERFORMANCE_CONFIG = PERFORMANCE_CONFIG;
window.LOCALIZATION = LOCALIZATION;

// Standard Kostengruppen
const DEFAULT_KOSTENGRUPPEN = {
    '100': { name: 'Grundstück', description: 'Grundstückskosten' },
    '200': { name: 'Herrichten und Erschließen', description: 'Erschließungskosten' },
    '300': { name: 'Bauwerk - Baukonstruktion', description: 'Baukonstruktionskosten' },
    '400': { name: 'Bauwerk - Technische Anlagen', description: 'Technische Anlagen' },
    '500': { name: 'Außenanlagen', description: 'Außenanlagen und Freiflächen' },
    '600': { name: 'Ausstattung und Kunstwerke', description: 'Ausstattung' },
    '700': { name: 'Baunebenkosten', description: 'Baunebenkosten' },
    '800': { name: 'Finanzierung', description: 'Finanzierungskosten' }
};

// Mache Konstanten global verfügbar
window.DEFAULT_KOSTENGRUPPEN = DEFAULT_KOSTENGRUPPEN; 