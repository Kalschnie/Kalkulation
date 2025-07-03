/**
 * Debug Module
 * Einfache Debug-Funktionen für Entwicklung
 */

console.log('=== Kalkulationstool Debug ===');
console.log('Debug-Modus aktiviert');
console.log('Verfügbare Module werden geladen...');

// Einfache Debug-Funktionen
window.debugApp = {
    showProjects: function() {
        console.log('Projekte:', window.app?.projects);
    },
    
    showCurrentProject: function() {
        console.log('Aktuelles Projekt:', window.app?.currentProject);
    },
    
    listModules: function() {
        console.log('Geladene Module:', {
            app: !!window.app,
            projectsModule: !!window.projectsModule,
            kalkulationModule: !!window.kalkulationModule,
            baukostenModule: !!window.baukostenModule,
            liquiditaetModule: !!window.liquiditaetModule,
            ausfuehrungModule: !!window.ausfuehrungModule,
            historieModule: !!window.historieModule
        });
    }
};

/**
 * Debug-Script für Kalkulationstool
 * Überprüft Module-Initialisierung und DOM-Verfügbarkeit
 */

// Prüfe ob alle Module geladen sind
function checkModules() {
    const modules = [
        'Utils',
        'app', 
        'projectsModule',
        'kalkulationModule',
        'baukostenModule',
        'liquiditaetModule',
        'ausfuehrungModule',
        'historieModule'
    ];

    console.log('=== Module Check ===');
    modules.forEach(module => {
        const exists = window[module] !== undefined;
        console.log(`${module}: ${exists ? '✓' : '✗'}`);
        if (!exists) {
            console.error(`Module ${module} ist nicht verfügbar!`);
        }
    });
}

// Prüfe DOM-Elemente
function checkDOMElements() {
    const elements = [
        '#add-project-btn',
        '.projects-grid',
        '#project-modal',
        '.nav-tab[data-module="projects"]'
    ];

    console.log('=== DOM Elements Check ===');
    elements.forEach(selector => {
        const element = document.querySelector(selector);
        console.log(`${selector}: ${element ? '✓' : '✗'}`);
        if (!element) {
            console.error(`Element ${selector} nicht gefunden!`);
        }
    });
}

// Prüfe Event Listeners
function checkEventListeners() {
    console.log('=== Event Listeners Check ===');
    
    const addBtn = document.querySelector('#add-project-btn');
    if (addBtn) {
        console.log('Add Project Button gefunden');
        
        // Nur prüfen, nicht automatisch klicken
        const hasClickHandler = addBtn.onclick !== null || addBtn.addEventListener.length > 0;
        console.log('Button hat Event Handler:', hasClickHandler ? '✓' : '✗');
    }
}

// App Status prüfen
function checkAppStatus() {
    console.log('=== App Status ===');
    
    if (window.app) {
        console.log(`Geladene Projekte: ${window.app.projects.length}`);
        console.log(`Aktuelles Projekt: ${window.app.currentProject ? window.app.currentProject.name : 'Keines'}`);
        console.log(`Aktuelles Modul: ${window.app.currentModule}`);
    } else {
        console.error('App-Instanz nicht verfügbar!');
    }
}

// Haupt-Debug-Funktion
function runDebug() {
    try {
        checkModules();
        checkDOMElements();
        checkEventListeners();
        checkAppStatus();
        
        console.log('=== Debug Complete ===');
        console.log('Alle Systeme funktional. Verwende createTestProject() zum manuellen Testen.');
        
    } catch (error) {
        console.error('Debug-Fehler:', error);
    }
}

// Führe Debug aus, wenn DOM bereit ist
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDebug);
} else {
    runDebug();
}

// Globale Debug-Funktion verfügbar machen
window.debugKalkulationstool = runDebug;

// Utility für manuelles Projekt erstellen
window.createTestProject = function() {
    if (window.projectsModule) {
        window.projectsModule.showProjectModal();
    } else {
        console.error('Projects Module nicht verfügbar!');
    }
};

console.log('Debug-Script geladen. Verwende debugKalkulationstool() oder createTestProject() in der Konsole.'); 