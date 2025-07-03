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
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        this.downloadBlob(blob, filename);
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
    static createModal(options = {}) {
        const {
            title = 'Modal',
            content = '',
            size = 'normal',
            buttons = [],
            onClose = null,
            closeOnBackdrop = true
        } = options;

        const modal = this.createElement('div', 'modal show');
        const sizeClass = size === 'large' ? 'large' : '';
        
        modal.innerHTML = `
            <div class="modal-content ${sizeClass}">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" type="button">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${buttons.map((btn, index) => 
                        `<button class="btn ${btn.className || 'btn-secondary'}" 
                                 data-button-index="${index}"
                                 type="button">${btn.text}</button>`
                    ).join('')}
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal(modal);
                if (onClose) onClose();
            });
        }

        // Backdrop click to close
        if (closeOnBackdrop) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                    if (onClose) onClose();
                }
            });
        }

        // Escape key to close
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modal);
                if (onClose) onClose();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Button handlers - Using index-based approach for reliability
        buttons.forEach((btn, index) => {
            const buttonEl = modal.querySelector(`[data-button-index="${index}"]`);
            if (buttonEl && btn.handler) {
                buttonEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        btn.handler(modal, e);
                    } catch (error) {
                        console.error('Button handler error:', error);
                    }
                });
            }
        });

        // Store cleanup function on modal
        modal._cleanup = () => {
            document.removeEventListener('keydown', escapeHandler);
        };

        document.body.appendChild(modal);
        
        // Focus trap - focus first focusable element
        setTimeout(() => {
            const firstFocusable = modal.querySelector('input, select, textarea, button:not(.modal-close)');
            if (firstFocusable) firstFocusable.focus();
        }, 100);
        
        return modal;
    }

    static closeModal(modal) {
        if (modal && modal.parentNode) {
            // Call cleanup if exists
            if (modal._cleanup) {
                modal._cleanup();
            }
            
            // Fade out animation
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 200);
        }
    }

    // Notification System
    static showNotification(message, type = 'info', duration = 3000) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    border-left: 4px solid #007bff;
                    z-index: 10000;
                    min-width: 300px;
                    max-width: 500px;
                    animation: slideIn 0.3s ease-out;
                }
                .notification-success { border-left-color: #28a745; }
                .notification-warning { border-left-color: #ffc107; }
                .notification-error { border-left-color: #dc3545; }
                .notification-content {
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .notification-message {
                    flex: 1;
                    font-size: 14px;
                    color: #333;
                }
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #999;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .notification-close:hover {
                    color: #333;
                }
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        const closeNotification = () => notification.remove();
        closeBtn.addEventListener('click', closeNotification);
        
        // Auto-close after duration
        if (duration > 0) {
            setTimeout(closeNotification, duration);
        }
        
        return notification;
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
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
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
    static generateFilename(projectName, type, extension = 'json') {
        const safeName = projectName.replace(/[^a-z0-9]/gi, '_');
        const date = new Date().toISOString().split('T')[0];
        return `${type}_${safeName}_${date}.${extension}`;
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