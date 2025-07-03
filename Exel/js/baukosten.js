/**
 * Baukosten Module (KG300-400)
 * Einfache Version für Gewerke-Verwaltung
 */

class BaukostenModule {
    constructor() {
        this.currentProject = null;
        this.init();
    }

    init() {
        try {
            this.setupEventListeners();
            console.log('Baukosten Module initialisiert');
        } catch (error) {
            console.error('Fehler bei Baukosten-Initialisierung:', error);
        }
    }

    setupEventListeners() {
        // Basic event listeners
        const addBtn = document.getElementById('add-gewerk-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addGewerk());
        }
    }

    loadProject(project) {
        this.currentProject = project;
        if (project) {
            this.renderBaukosten();
        }
    }

    renderBaukosten() {
        console.log('Baukosten rendern für Projekt:', this.currentProject?.name);
        // Basis-Implementierung
    }

    addGewerk() {
        console.log('Gewerk hinzufügen');
        // Basis-Implementierung
    }
}

// Export für globalen Zugriff
window.BaukostenModule = BaukostenModule; 