/**
 * Hauptapplikation - Kalkulationstool
 * Verwaltung der Navigation, Datenspeicherung und Kernfunktionen
 */

class App {
    constructor() {
        this.currentProject = null;
        this.projects = [];
        this.currentModule = 'projects';
        this.dataKey = 'kalkulationstool_data';
        this.debounceUtils = new Utils();
        this.init();
    }

    init() {
        try {
            this.loadData();
            this.setupEventListeners();
            this.setupNavigation();
            this.showModule('projects');
            
            // Erstelle ein Demo-Projekt wenn keine Projekte vorhanden sind
            if (this.projects.length === 0) {
                this.createDemoProject();
            }
            
            this.refreshProjectsView();
        } catch (error) {
            Utils.handleError(error, 'App Initialization');
        }
    }

    setupEventListeners() {
        const headerEvents = {
            'save-btn': () => this.saveData(true),
            'load-btn': () => this.loadFileData(),
            'export-btn': () => this.exportData()
        };

        Object.entries(headerEvents).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
            }
        });

        // Modal Close Events
        Utils.findAllElements('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                Utils.closeModal(e.target.closest('.modal'));
            });
        });

        // Auto-save setup
        this.setupAutoSave();
    }

    setupAutoSave() {
        // Auto-save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveData(false);
        });

        // Auto-save every 30 seconds
        setInterval(() => {
            this.saveData(false);
        }, 30000);
    }

    setupNavigation() {
        Utils.findAllElements('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const module = e.currentTarget.dataset.module;
                this.showModule(module);
            });
        });
    }

    showModule(moduleName) {
        try {
            // Update navigation
            Utils.findAllElements('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            const activeTab = Utils.findElement(`[data-module="${moduleName}"]`);
            if (activeTab) {
                activeTab.classList.add('active');
            }

            // Update content
            Utils.findAllElements('.module').forEach(module => {
                module.classList.remove('active');
            });
            
            const activeModule = document.getElementById(`${moduleName}-module`);
            if (activeModule) {
                activeModule.classList.add('active');
            }

            this.currentModule = moduleName;

            // Module-specific updates with error handling
            this.loadModuleData(moduleName);
        } catch (error) {
            Utils.handleError(error, `Module Switch: ${moduleName}`);
        }
    }

    loadModuleData(moduleName) {
        if (!this.currentProject) return;

        const moduleLoaders = {
            'kalkulation': () => window.kalkulationModule?.loadProject(this.currentProject),
            'baukosten': () => window.baukostenModule?.loadProject(this.currentProject),
            'liquiditaet': () => window.liquiditaetModule?.loadProject(this.currentProject),
            'ausfuehrung': () => window.ausfuehrungModule?.loadProject(this.currentProject),
            'historie': () => window.historieModule?.loadProject(this.currentProject)
        };

        const loader = moduleLoaders[moduleName];
        if (loader) {
            try {
                loader();
            } catch (error) {
                Utils.handleError(error, `Loading module: ${moduleName}`);
            }
        }
    }

    // Projekt Management mit verbesserter Validierung
    createProject(projectData) {
        try {
            // Validierung
            const validation = Utils.validateProject(projectData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            const project = {
                id: Utils.generateId('proj_'),
                name: Utils.validateString(projectData.name, 1, 100),
                status: projectData.status || 'Planung',
                description: Utils.validateString(projectData.description, 0, 500),
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                kennzahlen: {
                    bgf: Utils.validateNumber(projectData.bgf),
                    bri: Utils.validateNumber(projectData.bri),
                    wfl: Utils.validateNumber(projectData.wfl),
                    we: Utils.validateNumber(projectData.we)
                },
                kalkulation: this.createDefaultKalkulation(),
                baukosten: [],
                liquiditaetsplanung: {},
                vertraege: [],
                historie: []
            };

            this.projects.push(project);
            this.saveData(false);
            return project;
        } catch (error) {
            Utils.handleError(error, 'Creating Project');
            return null;
        }
    }

    updateProject(projectId, updates) {
        try {
            const project = this.projects.find(p => p.id === projectId);
            if (!project) {
                throw new Error('Projekt nicht gefunden');
            }

            // Validierung der Updates
            if (updates.name !== undefined) {
                updates.name = Utils.validateString(updates.name, 1, 100);
            }
            if (updates.description !== undefined) {
                updates.description = Utils.validateString(updates.description, 0, 500);
            }

            Object.assign(project, updates);
            project.updated = new Date().toISOString();
            
            this.saveData(false);
            
            if (this.currentProject && this.currentProject.id === projectId) {
                this.currentProject = project;
            }

            return project;
        } catch (error) {
            Utils.handleError(error, 'Updating Project');
            return null;
        }
    }

    deleteProject(projectId) {
        try {
            const projectIndex = this.projects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) {
                throw new Error('Projekt nicht gefunden');
            }

            this.projects.splice(projectIndex, 1);
            
            if (this.currentProject && this.currentProject.id === projectId) {
                this.currentProject = null;
                this.updateCurrentProjectDisplay();
            }
            
            this.saveData(false);
            return true;
        } catch (error) {
            Utils.handleError(error, 'Deleting Project');
            return false;
        }
    }

    setCurrentProject(projectId) {
        try {
            this.currentProject = this.projects.find(p => p.id === projectId);
            this.updateCurrentProjectDisplay();
            return this.currentProject;
        } catch (error) {
            Utils.handleError(error, 'Setting Current Project');
            return null;
        }
    }

    updateCurrentProjectDisplay() {
        const nameElement = document.getElementById('current-project-name');
        if (nameElement) {
            nameElement.textContent = this.currentProject ? this.currentProject.name : 'Kein Projekt ausgewählt';
        }
    }

    createDefaultKalkulation() {
        return {
            '100': { name: 'Grundstück', betrag: 0, hinweise: '' },
            '110': { name: 'Grundstückswert', betrag: 0, hinweise: '' },
            '120': { name: 'Grundstücksnebenkosten', betrag: 0, hinweise: '' },
            '130': { name: 'Freimachen, Abriss, Altlasten', betrag: 0, hinweise: '' },
            '200': { name: 'Herrichten und Erschließen', betrag: 0, hinweise: '' },
            '300': { name: 'Bauwerk - Baukonstruktion', betrag: 0, hinweise: '' },
            '400': { name: 'Bauwerk - Technische Anlagen', betrag: 0, hinweise: '' },
            '500': { name: 'Außenanlagen', betrag: 0, hinweise: '' },
            '600': { name: 'Ausstattung und Kunstwerke', betrag: 0, hinweise: '' },
            '700': { name: 'Baunebenkosten', betrag: 0, hinweise: '' },
            '710': { name: 'Bauherrenaufgaben Regionalkosten HB', betrag: 0, hinweise: '' },
            '720': { name: 'Städtebaulicher Wettb.', betrag: 0, hinweise: '' },
            '730': { name: 'Architekten und Ingenieure', betrag: 0, hinweise: '' },
            '800': { name: 'Finanzierung', betrag: 0, hinweise: '' }
        };
    }

    createDemoProject() {
        const demoProject = this.createProject({
            name: 'Demo Projekt - Muster BVH',
            status: 'Planung',
            description: 'Demonstrationsprojekt mit Beispieldaten'
        });

        if (demoProject) {
            // Demo-Daten hinzufügen
            demoProject.kennzahlen = {
                bgf: 7463,
                bri: 27618,
                wfl: 6437,
                we: 42
            };

            // Demo-Kalkulation mit realistischen Werten
            const demoKalkulation = {
                '100': 4950000, '110': 4500000, '120': 450000,
                '200': 78000, '300': 3250000, '400': 1600000,
                '500': 300000, '700': 2570000
            };

            Object.entries(demoKalkulation).forEach(([kg, betrag]) => {
                if (demoProject.kalkulation[kg]) {
                    demoProject.kalkulation[kg].betrag = betrag;
                }
            });

            this.saveData(false);
        }
    }

    // Verbessertes Daten Management
    saveData(showNotification = true) {
        try {
            const data = {
                projects: this.projects,
                currentProjectId: this.currentProject?.id || null,
                version: '1.1.0',
                lastSaved: new Date().toISOString(),
                metadata: {
                    projectCount: this.projects.length,
                    totalSize: JSON.stringify(this.projects).length
                }
            };

            const success = Utils.saveToStorage(this.dataKey, data);
            
            if (showNotification) {
                if (success) {
                    showNotification('Daten erfolgreich gespeichert', 'success');
                } else {
                    showNotification('Fehler beim Speichern', 'error');
                }
            }

            return success;
        } catch (error) {
            Utils.handleError(error, 'Saving Data');
            return false;
        }
    }

    loadData() {
        try {
            const data = Utils.loadFromStorage(this.dataKey, {});
            
            this.projects = Array.isArray(data.projects) ? data.projects : [];
            
            if (data.currentProjectId) {
                this.currentProject = this.projects.find(p => p.id === data.currentProjectId);
            }

            // Migration von älteren Versionen
            this.migrateDataIfNeeded(data);
            
        } catch (error) {
            Utils.handleError(error, 'Loading Data');
            this.projects = [];
            this.currentProject = null;
        }
    }

    migrateDataIfNeeded(data) {
        // Beispiel für Datenmigration
        if (!data.version || data.version < '1.1.0') {
            this.projects.forEach(project => {
                // Stelle sicher, dass alle Projekte die erwartete Struktur haben
                if (!project.historie) project.historie = [];
                if (!project.snapshots) project.snapshots = [];
                if (!project.kennzahlen) project.kennzahlen = { bgf: 0, bri: 0, wfl: 0, we: 0 };
            });
        }
    }

    loadFileData() {
        const input = Utils.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (!Array.isArray(data.projects)) {
                        throw new Error('Ungültiges Dateiformat');
                    }

                    this.projects = data.projects;
                    this.currentProject = null;
                    this.saveData(false);
                    this.refreshProjectsView();
                    showNotification('Daten erfolgreich geladen', 'success');
                } catch (error) {
                    Utils.handleError(error, 'Loading File');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    exportData() {
        try {
            if (!this.currentProject) {
                Utils.showNotification('Bitte wählen Sie zuerst ein Projekt aus', 'warning');
                return;
            }

            // Create export modal with options
            const modal = Utils.createModal({
                title: 'Daten exportieren',
                content: `
                    <div class="export-options">
                        <h4>Exportformat wählen:</h4>
                        <div class="export-format-options">
                            <label class="export-option">
                                <input type="radio" name="export-format" value="excel" checked>
                                <div class="option-content">
                                    <i class="fas fa-file-excel"></i>
                                    <div>
                                        <strong>Excel (.xlsx)</strong>
                                        <p>Vollständige Projektkalkulation mit mehreren Arbeitsblättern</p>
                                    </div>
                                </div>
                            </label>
                            <label class="export-option">
                                <input type="radio" name="export-format" value="json">
                                <div class="option-content">
                                    <i class="fas fa-file-code"></i>
                                    <div>
                                        <strong>JSON (.json)</strong>
                                        <p>Alle Projektdaten für Backup und Import</p>
                                    </div>
                                </div>
                            </label>
                            <label class="export-option">
                                <input type="radio" name="export-format" value="csv">
                                <div class="option-content">
                                    <i class="fas fa-file-csv"></i>
                                    <div>
                                        <strong>CSV (.csv)</strong>
                                        <p>Einfache Tabellendaten für externe Bearbeitung</p>
                                    </div>
                                </div>
                            </label>
                        </div>
                        
                        <div class="export-scope">
                            <h4>Exportumfang:</h4>
                            <div class="scope-options">
                                <label>
                                    <input type="checkbox" id="export-overview" checked>
                                    Projektübersicht
                                </label>
                                <label>
                                    <input type="checkbox" id="export-kalkulation" checked>
                                    Kalkulation KG100-800
                                </label>
                                <label>
                                    <input type="checkbox" id="export-baukosten" checked>
                                    Baukosten KG300-400
                                </label>
                                <label>
                                    <input type="checkbox" id="export-liquiditaet" checked>
                                    Liquiditätsplanung
                                </label>
                            </div>
                        </div>
                    </div>
                `,
                buttons: [
                    {
                        text: 'Abbrechen',
                        className: 'btn-secondary',
                        handler: (modal) => Utils.closeModal(modal)
                    },
                    {
                        text: 'Exportieren',
                        className: 'btn-primary',
                        handler: (modal) => this.performExport(modal)
                    }
                ]
            });
            
            // Add export modal styles
            this.addExportModalStyles();
            
        } catch (error) {
            Utils.handleError(error, 'Export Data');
        }
    }

    async performExport(modal) {
        try {
            const format = modal.querySelector('input[name="export-format"]:checked')?.value;
            const scope = {
                overview: modal.querySelector('#export-overview')?.checked,
                kalkulation: modal.querySelector('#export-kalkulation')?.checked,
                baukosten: modal.querySelector('#export-baukosten')?.checked,
                liquiditaet: modal.querySelector('#export-liquiditaet')?.checked
            };
            
            Utils.closeModal(modal);
            
            switch (format) {
                case 'excel':
                    await this.exportToExcel(scope);
                    break;
                case 'json':
                    this.exportToJSON();
                    break;
                case 'csv':
                    this.exportToCSV(scope);
                    break;
                default:
                    Utils.showNotification('Ungültiges Exportformat', 'error');
            }
        } catch (error) {
            Utils.handleError(error, 'Performing Export');
        }
    }

    async exportToExcel(scope) {
        try {
            if (!window.excelExportModule) {
                Utils.showNotification('Excel-Export-Modul nicht verfügbar', 'error');
                return;
            }

            Utils.showNotification('Excel-Export wird vorbereitet...', 'info', 5000);
            
            // Create a filtered project based on scope
            const exportProject = { ...this.currentProject };
            
            if (!scope.kalkulation) delete exportProject.kalkulation;
            if (!scope.baukosten) delete exportProject.baukosten;
            if (!scope.liquiditaet) delete exportProject.liquiditaetsplanung;
            
            const success = await window.excelExportModule.exportProjectToExcel(exportProject);
            
            if (success) {
                this.addHistoryEntry(this.currentProject.id, 'Excel-Export erstellt', {
                    format: 'Excel (.xlsx)',
                    scope: Object.keys(scope).filter(key => scope[key])
                });
            }
        } catch (error) {
            Utils.handleError(error, 'Excel Export');
        }
    }

    exportToJSON() {
        try {
            const filename = Utils.generateFilename(this.currentProject.name, 'vollstaendig');
            Utils.downloadJSON(this.currentProject, filename);
            
            Utils.showNotification('JSON-Export erfolgreich erstellt', 'success');
            
            this.addHistoryEntry(this.currentProject.id, 'JSON-Export erstellt', {
                format: 'JSON',
                filename
            });
        } catch (error) {
            Utils.handleError(error, 'JSON Export');
        }
    }

    exportToCSV(scope) {
        try {
            const csvData = this.prepareCSVData(scope);
            const filename = Utils.generateFilename(this.currentProject.name, 'kalkulation', 'csv');
            Utils.downloadCSV(csvData, filename);
            
            Utils.showNotification('CSV-Export erfolgreich erstellt', 'success');
            
            this.addHistoryEntry(this.currentProject.id, 'CSV-Export erstellt', {
                format: 'CSV',
                scope: Object.keys(scope).filter(key => scope[key])
            });
        } catch (error) {
            Utils.handleError(error, 'CSV Export');
        }
    }

    prepareCSVData(scope) {
        const data = [];
        
        if (scope.overview) {
            data.push(['PROJEKTÜBERSICHT']);
            data.push(['Projektname', this.currentProject.name]);
            data.push(['Status', this.currentProject.status]);
            data.push(['BGF (m²)', this.currentProject.kennzahlen?.bgf || 0]);
            data.push(['']);
        }
        
        if (scope.kalkulation && this.currentProject.kalkulation) {
            data.push(['KALKULATION KG100-800']);
            data.push(['KG', 'Bezeichnung', 'Betrag (€)']);
            this.currentProject.kalkulation.forEach(kg => {
                data.push([kg.nr, kg.bezeichnung, kg.betrag || 0]);
            });
            data.push(['']);
        }
        
        if (scope.baukosten && this.currentProject.baukosten) {
            data.push(['BAUKOSTEN KG300-400']);
            data.push(['Nr.', 'Gewerk', 'Kalkulation (€)', 'Vergabe (€)']);
            this.currentProject.baukosten.forEach(gewerk => {
                data.push([gewerk.nr, gewerk.bezeichnung, gewerk.kalkulation || 0, gewerk.vergabe || 0]);
            });
            data.push(['']);
        }
        
        return data;
    }

    addExportModalStyles() {
        if (document.querySelector('#export-modal-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'export-modal-styles';
        styles.textContent = `
            .export-options { margin: 20px 0; }
            .export-format-options, .scope-options { margin: 15px 0; }
            .export-option {
                display: block;
                margin: 10px 0;
                padding: 15px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .export-option:hover { border-color: #007bff; background: #f8f9fa; }
            .export-option input[type="radio"] { margin-right: 10px; }
            .export-option input[type="radio"]:checked + .option-content { color: #007bff; }
            .option-content { display: flex; align-items: center; gap: 15px; }
            .option-content i { font-size: 24px; color: #28a745; }
            .option-content strong { font-size: 16px; margin-bottom: 5px; }
            .option-content p { margin: 0; font-size: 14px; color: #666; }
            .scope-options label {
                display: block;
                margin: 8px 0;
                padding: 8px 0;
                cursor: pointer;
            }
            .scope-options input[type="checkbox"] { margin-right: 10px; }
        `;
        document.head.appendChild(styles);
    }

    // UI Helper mit Performance-Verbesserungen
    refreshProjectsView() {
        this.debounceUtils.debounce(() => {
            if (window.projectsModule) {
                window.projectsModule.renderProjects();
            }
        }, 100, 'refreshProjects');
    }

    // Historie Helper mit verbesserter Validierung
    addHistoryEntry(projectId, action, details) {
        try {
            const project = this.projects.find(p => p.id === projectId);
            if (!project) return;

            if (!project.historie) {
                project.historie = [];
            }
            
            const entry = {
                id: Utils.generateId('hist_'),
                timestamp: new Date().toISOString(),
                action: Utils.validateString(action, 1, 100),
                details: details || {},
                user: 'System'
            };
            
            project.historie.unshift(entry);
            
            // Begrenzte Historie (max 100 Einträge)
            if (project.historie.length > 100) {
                project.historie = project.historie.slice(0, 100);
            }
            
            this.saveData(false);
        } catch (error) {
            Utils.handleError(error, 'Adding History Entry');
        }
    }

    createSnapshot(projectId, name) {
        try {
            const project = this.projects.find(p => p.id === projectId);
            if (!project) {
                throw new Error('Projekt nicht gefunden');
            }

            const snapshot = {
                id: Utils.generateId('snap_'),
                name: Utils.validateString(name, 1, 100),
                timestamp: new Date().toISOString(),
                data: Utils.deepClone(project)
            };
            
            if (!project.snapshots) {
                project.snapshots = [];
            }
            
            project.snapshots.unshift(snapshot);
            
            // Limitiere Snapshots (max 20)
            if (project.snapshots.length > 20) {
                project.snapshots = project.snapshots.slice(0, 20);
            }
            
            this.addHistoryEntry(projectId, 'Snapshot erstellt', { name: name });
            this.saveData(false);
            
            return snapshot;
        } catch (error) {
            Utils.handleError(error, 'Creating Snapshot');
            return null;
        }
    }

    // Statistiken und Reports
    getApplicationStatistics() {
        try {
            const stats = {
                totalProjects: this.projects.length,
                projectsByStatus: Utils.groupBy(this.projects, 'status'),
                totalValue: Utils.sum(this.projects.map(p => this.calculateProjectTotal(p))),
                averageProjectValue: 0,
                lastActivity: this.getLastActivity(),
                storageUsed: JSON.stringify(this.projects).length
            };

            stats.averageProjectValue = stats.totalProjects > 0 ? 
                stats.totalValue / stats.totalProjects : 0;

            return stats;
        } catch (error) {
            Utils.handleError(error, 'Getting Statistics');
            return null;
        }
    }

    calculateProjectTotal(project) {
        if (!project.kalkulation) return 0;
        return Utils.sum(Object.values(project.kalkulation), 'betrag');
    }

    getLastActivity() {
        const allDates = this.projects
            .map(p => new Date(p.updated))
            .sort((a, b) => b - a);
        
        return allDates.length > 0 ? allDates[0].toISOString() : null;
    }
}

// App initialisieren wenn DOM bereit ist
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initialisiere Kalkulationstool App...');
    try {
        if (!window.app) {
            window.app = new App();
            console.log('App erfolgreich initialisiert');
        }
    } catch (error) {
        console.error('Fehler bei App-Initialisierung:', error);
        Utils.handleError(error, 'App Initialization');
    }
});

// Export der App-Klasse für globale Verfügbarkeit
window.App = App; 