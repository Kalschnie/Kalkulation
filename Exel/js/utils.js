/**
 * Utility Functions - Gemeinsame Hilfsfunktionen
 * Reduziert Code-Duplikation und verbessert Wartbarkeit
 */

class Utils {
    constructor() {
        this.debounceTimers = new Map();
    }

    // Input Validation
    static validateNumber(value, min = 0, max = Infinity) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max ? num : 0;
    }

    static validateString(value, minLength = 0, maxLength = 255) {
        const str = String(value || '').trim();
        return str.length >= minLength && str.length <= maxLength ? str : '';
    }

    static validateRequired(value, fieldName = 'Field') {
        const validated = this.validateString(value, 1);
        if (!validated) {
            throw new Error(`${fieldName} ist erforderlich`);
        }
        return validated;
    }

    // DOM Utilities
    static createElement(tag, className = '', innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }

    static findElement(selector, parent = document) {
        const element = parent.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
        }
        return element;
    }

    static findAllElements(selector, parent = document) {
        return Array.from(parent.querySelectorAll(selector));
    }

    // Event Handling
    static addEventListeners(element, events) {
        Object.entries(events).forEach(([eventType, handler]) => {
            element.addEventListener(eventType, handler);
        });
    }

    static removeEventListeners(element, events) {
        Object.entries(events).forEach(([eventType, handler]) => {
            element.removeEventListener(eventType, handler);
        });
    }

    // Debouncing
    debounce(func, delay, key = 'default') {
        const existingTimer = this.debounceTimers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        
        const timer = setTimeout(func, delay);
        this.debounceTimers.set(key, timer);
    }

    // Data Formatting
    static formatCurrency(amount, locale = 'de-DE', currency = 'EUR') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    }

    static formatNumber(number, decimals = 2, locale = 'de-DE') {
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number || 0);
    }

    // New function for formatting numbers with thousands separators (German style)
    static formatNumberWithThousands(number, decimals = 0, locale = 'de-DE') {
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
            useGrouping: true
        }).format(number || 0);
    }

    // Function to format input values as user types
    static formatInputNumber(input) {
        if (!input) return;
        
        const value = parseFloat(input.value.replace(/\./g, '').replace(',', '.')) || 0;
        if (value > 0) {
            input.value = this.formatNumberWithThousands(value, 0).replace(/[€\s]/g, '');
        }
    }

    // Function to parse German formatted numbers back to float
    static parseGermanNumber(germanNumber) {
        if (typeof germanNumber !== 'string') return parseFloat(germanNumber) || 0;
        
        // Remove thousands separators (dots) and replace decimal comma with dot
        const normalized = germanNumber.replace(/\./g, '').replace(',', '.');
        return parseFloat(normalized) || 0;
    }

    static formatDate(date, locale = 'de-DE') {
        return new Date(date).toLocaleDateString(locale);
    }

    static formatDateTime(date, locale = 'de-DE') {
        return new Date(date).toLocaleString(locale);
    }

    // Array Utilities
    static sum(array, key = null) {
        return array.reduce((sum, item) => {
            const value = key ? item[key] : item;
            return sum + (parseFloat(value) || 0);
        }, 0);
    }

    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    static sortBy(array, key, direction = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (direction === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
    }

    // Local Storage Utilities
    static saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Storage save error:', error);
            return false;
        }
    }

    static loadFromStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Storage load error:', error);
            return defaultValue;
        }
    }

    // File Utilities
    static downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static downloadCSV(data, filename) {
        const csv = this.arrayToCSV(data);
        const blob = new Blob([csv], { 
            type: 'text/csv;charset=utf-8;' 
        });
        this.downloadBlob(blob, filename);
    }

    static downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    static arrayToCSV(data) {
        return data.map(row => 
            row.map(cell => {
                if (typeof cell === 'number') {
                    return cell.toFixed(2).replace('.', ',');
                }
                return `"${String(cell).replace(/"/g, '""')}"`;
            }).join(';')
        ).join('\n');
    }

    // Modal Utilities
    static createModal({ title, content, buttons = [], size = 'normal' }) {
        const modal = this.createElement('div', 'modal');
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        const modalContent = this.createElement('div', `modal-content ${size === 'large' ? 'large' : ''}`);
        
        // Header
        const header = this.createElement('div', 'modal-header');
        const titleElement = this.createElement('h3');
        titleElement.textContent = title;
        
        const closeBtn = this.createElement('button', 'modal-close');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => this.closeModal(modal));
        
        header.appendChild(titleElement);
        header.appendChild(closeBtn);

        // Body
        const body = this.createElement('div', 'modal-body');
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else {
            body.appendChild(content);
        }

        // Footer
        const footer = this.createElement('div', 'modal-footer');
        buttons.forEach(buttonConfig => {
            const button = this.createElement('button', `btn ${buttonConfig.className || 'btn-secondary'}`);
            button.textContent = buttonConfig.text;
            button.addEventListener('click', buttonConfig.handler);
            footer.appendChild(button);
        });

        modalContent.appendChild(header);
        modalContent.appendChild(body);
        if (buttons.length > 0) {
            modalContent.appendChild(footer);
        }

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });

        return modal;
    }

    static closeModal(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    // Notification System
    static showNotification(message, type = 'info', duration = null) {
        // Check if settings manager exists and notifications are enabled
        if (window.settingsManager && !window.settingsManager.shouldShowNotification(type)) {
            return;
        }

        // Use settings duration if not specified
        const notificationDuration = duration || (window.settingsManager ? window.settingsManager.getNotificationDuration() : 5000);
        
        // Call global showNotification if it exists
        if (window.showNotification) {
            window.showNotification(message, type, notificationDuration);
        } else {
            // Fallback simple notification
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    static getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'error': 'times-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Table Utilities
    static createTableRow(data, template) {
        const row = document.createElement('tr');
        
        Object.entries(data).forEach(([key, value]) => {
            const cell = document.createElement('td');
            cell.className = `${key}-cell`;
            
            if (template && template[key]) {
                cell.innerHTML = template[key](value, data);
            } else {
                cell.textContent = value;
            }
            
            row.appendChild(cell);
        });
        
        return row;
    }

    static updateTableCell(row, cellClass, value, formatter = null) {
        const cell = row.querySelector(`.${cellClass}`);
        if (cell) {
            cell.textContent = formatter ? formatter(value) : value;
        }
    }

    // Form Utilities
    static serializeForm(form) {
        const formData = new FormData(form);
        const serialized = {};
        for (let [key, value] of formData.entries()) {
            serialized[key] = value;
        }
        return serialized;
    }

    static populateForm(form, data) {
        Object.entries(data).forEach(([key, value]) => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = value;
            }
        });
    }

    // Performance Utilities
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    static measureTime(func, label = 'Operation') {
        const start = performance.now();
        const result = func();
        const end = performance.now();
        console.log(`${label} took ${end - start} milliseconds`);
        return result;
    }

    // Data Validation
    static validateProject(project) {
        const errors = [];
        
        if (!project.name || project.name.trim().length === 0) {
            errors.push('Projektname ist erforderlich');
        }
        
        if (project.kennzahlen) {
            const { bgf, bri, wfl, we } = project.kennzahlen;
            if (bgf < 0 || bri < 0 || wfl < 0 || we < 0) {
                errors.push('Kennzahlen müssen positive Werte sein');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // ID Generation
    static generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return prefix + timestamp + random;
    }

    // Deep Clone
    static deepClone(obj) {
        if (obj === null || typeof obj !== "object") return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === "object") {
            const clonedObj = {};
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    // Comparison Utilities
    static compareObjects(obj1, obj2) {
        const changes = {};
        
        const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
        
        allKeys.forEach(key => {
            if (obj1[key] !== obj2[key]) {
                changes[key] = {
                    old: obj1[key],
                    new: obj2[key]
                };
            }
        });
        
        return changes;
    }

    // Error Handling
    static handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        
        let message = 'Ein unerwarteter Fehler ist aufgetreten';
        
        if (error instanceof Error) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }
        
        this.showNotification(message, 'error');
    }

    // URL Utilities
    static generateFilename(basename, type, extension) {
        const timestamp = new Date().toISOString().split('T')[0];
        return `${basename}_${type}_${timestamp}.${extension}`;
    }

    /**
     * Utility functions for settings management
     */
    static setElementValue(selector, value) {
        const element = this.findElement(selector);
        if (element) {
            element.value = value;
        }
    }

    static getElementValue(selector) {
        const element = this.findElement(selector);
        return element ? element.value : '';
    }

    static setElementChecked(selector, checked) {
        const element = this.findElement(selector);
        if (element && element.type === 'checkbox') {
            element.checked = checked;
        }
    }

    static getElementChecked(selector) {
        const element = this.findElement(selector);
        return element && element.type === 'checkbox' ? element.checked : false;
    }

    /**
     * Enhanced formatCurrency function that uses settings
     */
    static formatCurrency(value) {
        if (window.settingsManager) {
            return window.settingsManager.formatNumber(
                value,
                window.settingsManager.getCurrency(),
                window.settingsManager.getDecimalPlaces(),
                window.settingsManager.getThousandsSeparator(),
                window.settingsManager.getDecimalSeparator()
            );
        }
        
        // Fallback to simple formatting
        return `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    }
}

// Export für globale Nutzung
window.Utils = Utils;

// Shortcuts für häufig verwendete Funktionen
window.formatCurrency = Utils.formatCurrency;
window.formatNumber = Utils.formatNumber;
window.formatNumberWithThousands = Utils.formatNumberWithThousands;
window.formatInputNumber = Utils.formatInputNumber;
window.parseGermanNumber = Utils.parseGermanNumber;
window.showNotification = Utils.showNotification.bind(Utils);
window.createElement = Utils.createElement;
window.validateNumber = Utils.validateNumber;
window.validateString = Utils.validateString;

// Mache Utility-Funktionen global verfügbar (für Kompatibilität)
window.formatCurrency = Utils.formatCurrency;
window.formatNumber = Utils.formatNumber;
window.showNotification = Utils.showNotification.bind(Utils);

// Stelle sicher dass formatCurrency verfügbar ist
if (!window.formatCurrency) {
    window.formatCurrency = function(amount) {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount || 0);
    };
}

// Stelle sicher dass showNotification verfügbar ist
if (!window.showNotification) {
    window.showNotification = function(message, type) {
        console.log(`[${type}] ${message}`);
    };
}

console.log('Utils-Modul geladen und globale Funktionen verfügbar'); 