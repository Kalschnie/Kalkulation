/**
 * Projektverwaltung Module
 * Verwaltung von Projekten, CRUD-Operationen und UI
 */

class ProjectsModule {
    constructor() {
        this.debounceUtils = new Utils();
        this.currentFilter = { search: '', status: 'all' };
        this.init();
    }

    init() {
        try {
            this.setupEventListeners();
            this.renderProjects();
        } catch (error) {
            Utils.handleError(error, 'Projects Module Initialization');
        }
    }

    setupEventListeners() {
        // Header-Button für neues Projekt
        const addBtn = Utils.findElement('#add-project-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showProjectModal());
        }

        // Existing modal buttons (falls das alte Modal noch verwendet wird)
        const saveBtn = Utils.findElement('#save-project-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveProject());
        }

        const cancelBtn = Utils.findElement('#cancel-project-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeProjectModal());
        }
    }

    renderProjects() {
        try {
            const container = Utils.findElement('.projects-grid');
            const template = container?.querySelector('.project-card.template');
            
            if (!container || !template) {
                console.warn('Projects container or template not found');
                return;
            }

            // Clear existing projects (except template)
            Utils.findAllElements('.projects-grid .project-card:not(.template)')
                .forEach(card => card.remove());

            const filteredProjects = this.getFilteredProjects();
            
            if (filteredProjects.length === 0) {
                this.renderEmptyState(container);
                return;
            }

            filteredProjects.forEach(project => {
                const card = this.createProjectCard(project, template);
                container.appendChild(card);
            });
        } catch (error) {
            Utils.handleError(error, 'Rendering Projects');
        }
    }

    getFilteredProjects() {
        return window.app.projects.filter(project => {
            const matchesSearch = !this.currentFilter.search || 
                project.name.toLowerCase().includes(this.currentFilter.search.toLowerCase()) ||
                (project.description || '').toLowerCase().includes(this.currentFilter.search.toLowerCase());

            const matchesStatus = this.currentFilter.status === 'all' || 
                project.status === this.currentFilter.status;

            return matchesSearch && matchesStatus;
        });
    }

    renderEmptyState(container) {
        const emptyState = Utils.createElement('div', 'empty-state', `
            <i class="fas fa-folder-open" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
            <h3>Keine Projekte vorhanden</h3>
            <p>Erstellen Sie Ihr erstes Projekt, um zu beginnen.</p>
            <button class="btn btn-primary" onclick="projectsModule.showProjectModal()">
                <i class="fas fa-plus"></i> Neues Projekt erstellen
            </button>
        `);
        container.appendChild(emptyState);
    }

    createProjectCard(project, template) {
        const card = template.cloneNode(true);
        card.classList.remove('template');
        card.dataset.projectId = project.id;

        try {
            // Update content with safe data handling
            const nameElement = card.querySelector('.project-name');
            const statusElement = card.querySelector('.project-status');
            const bgfElement = card.querySelector('.project-bgf');
            const costElement = card.querySelector('.project-cost');
            const dateElement = card.querySelector('.project-date');

            if (nameElement) nameElement.textContent = project.name || 'Unbenanntes Projekt';
            
            if (statusElement) {
                statusElement.textContent = project.status || 'Unbekannt';
                statusElement.className = `project-status status-${(project.status || 'unknown').toLowerCase()}`;
            }

            // Calculate metrics safely
            const totalCost = this.calculateTotalCost(project);
            const bgf = project.kennzahlen?.bgf || 0;

            if (bgfElement) bgfElement.textContent = `${formatNumber(bgf)} m²`;
            if (costElement) costElement.textContent = formatCurrency(totalCost);
            if (dateElement) dateElement.textContent = Utils.formatDate(project.created);

            // Setup event listeners
            this.setupCardEventListeners(card, project);

            return card;
        } catch (error) {
            Utils.handleError(error, `Creating project card for ${project.name}`);
            return template.cloneNode(true); // Return empty template on error
        }
    }

    setupCardEventListeners(card, project) {
        const editBtn = card.querySelector('.edit-project');
        const deleteBtn = card.querySelector('.delete-project');
        const openBtn = card.querySelector('.open-project');

        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editProject(project.id);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteProject(project.id);
            });
        }

        if (openBtn) {
            openBtn.addEventListener('click', () => {
                this.openProject(project.id);
            });
        }

        // Make entire card clickable
        card.addEventListener('click', () => {
            this.openProject(project.id);
        });
    }

    calculateTotalCost(project) {
        if (!project.kalkulation) return 0;
        return Utils.sum(Object.values(project.kalkulation), 'betrag');
    }

    showProjectModal(project = null) {
        try {
            // Check if existing modal exists, if so, use it
            const existingModal = Utils.findElement('#project-modal');
            if (existingModal) {
                this.showExistingModal(project);
                return;
            }

            // Otherwise create new modal
            const isEdit = !!project;
            const title = isEdit ? 'Projekt bearbeiten' : 'Neues Projekt erstellen';
            
            const modal = Utils.createModal({
                title: title,
                size: 'normal',
                content: this.createProjectFormHTML(project),
                buttons: [
                    {
                        text: 'Abbrechen',
                        className: 'btn-secondary',
                        action: 'cancel',
                        handler: () => this.closeProjectModal()
                    },
                    {
                        text: isEdit ? 'Aktualisieren' : 'Erstellen',
                        className: 'btn-primary',
                        action: 'save',
                        handler: () => this.saveProject()
                    }
                ]
            });

            this.currentModal = modal;
            
            if (project) {
                modal.dataset.projectId = project.id;
                this.populateProjectForm(modal, project);
            }
        } catch (error) {
            Utils.handleError(error, 'Opening Project Modal');
        }
    }

    showExistingModal(project = null) {
        const modal = Utils.findElement('#project-modal');
        const form = Utils.findElement('#project-form');
        
        if (!modal || !form) return;
        
        // Reset form
        form.reset();
        
        if (project) {
            // Edit mode
            Utils.findElement('#project-modal .modal-header h3').textContent = 'Projekt bearbeiten';
            const nameInput = Utils.findElement('#project-name-input');
            const statusInput = Utils.findElement('#project-status-input');
            const descInput = Utils.findElement('#project-description-input');
            
            if (nameInput) nameInput.value = project.name || '';
            if (statusInput) statusInput.value = project.status || 'Planung';
            if (descInput) descInput.value = project.description || '';
            
            modal.dataset.projectId = project.id;
        } else {
            // Create mode
            Utils.findElement('#project-modal .modal-header h3').textContent = 'Neues Projekt';
            delete modal.dataset.projectId;
        }
        
        modal.classList.add('show');
    }

    createProjectFormHTML(project = null) {
        return `
            <form id="project-form" class="project-form">
                <div class="form-group">
                    <label for="project-name">Projektname *</label>
                    <input type="text" 
                           id="project-name" 
                           name="name" 
                           required 
                           maxlength="100"
                           placeholder="Geben Sie den Projektnamen ein">
                </div>
                
                <div class="form-group">
                    <label for="project-status">Projektstatus</label>
                    <select id="project-status" name="status">
                        <option value="Planung">Planung</option>
                        <option value="Genehmigung">Genehmigung</option>
                        <option value="Ausführung">Ausführung</option>
                        <option value="Abgeschlossen">Abgeschlossen</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="project-description">Beschreibung</label>
                    <textarea id="project-description" 
                              name="description" 
                              rows="3" 
                              maxlength="500"
                              placeholder="Optionale Projektbeschreibung"></textarea>
                </div>
                
                <div class="kennzahlen-grid">
                    <div class="form-group">
                        <label for="project-bgf">BGF (m²)</label>
                        <input type="number" 
                               id="project-bgf" 
                               name="bgf" 
                               min="0" 
                               step="0.01"
                               placeholder="0">
                    </div>
                    
                    <div class="form-group">
                        <label for="project-bri">BRI (m³)</label>
                        <input type="number" 
                               id="project-bri" 
                               name="bri" 
                               min="0" 
                               step="0.01"
                               placeholder="0">
                    </div>
                    
                    <div class="form-group">
                        <label for="project-wfl">WFL (m²)</label>
                        <input type="number" 
                               id="project-wfl" 
                               name="wfl" 
                               min="0" 
                               step="0.01"
                               placeholder="0">
                    </div>
                    
                    <div class="form-group">
                        <label for="project-we">WE (Anzahl)</label>
                        <input type="number" 
                               id="project-we" 
                               name="we" 
                               min="0" 
                               step="1"
                               placeholder="0">
                    </div>
                </div>
            </form>
        `;
    }

    populateProjectForm(modal, project) {
        const form = modal.querySelector('#project-form');
        if (!form) return;

        const formData = {
            name: project.name || '',
            status: project.status || 'Planung',
            description: project.description || '',
            bgf: project.kennzahlen?.bgf || 0,
            bri: project.kennzahlen?.bri || 0,
            wfl: project.kennzahlen?.wfl || 0,
            we: project.kennzahlen?.we || 0
        };

        Utils.populateForm(form, formData);
    }

    saveProject() {
        try {
            // Check for existing modal first
            const existingModal = Utils.findElement('#project-modal');
            let modal, form;
            
            if (existingModal && existingModal.classList.contains('show')) {
                modal = existingModal;
                form = Utils.findElement('#project-form');
            } else {
                modal = this.currentModal;
                form = modal?.querySelector('#project-form');
            }

            if (!modal || !form) {
                throw new Error('Modal oder Formular nicht gefunden');
            }

            // Get form data
            let formData;
            if (form.querySelector('[name="name"]')) {
                formData = Utils.serializeForm(form);
            } else {
                // Fallback for existing modal structure
                const nameInput = Utils.findElement('#project-name-input');
                const statusInput = Utils.findElement('#project-status-input');
                const descInput = Utils.findElement('#project-description-input');
                
                formData = {
                    name: nameInput?.value || '',
                    status: statusInput?.value || 'Planung',
                    description: descInput?.value || ''
                };
            }
            
            // Validation
            const name = Utils.validateString(formData.name, 1, 100);
            if (!name) {
                throw new Error('Projektname ist erforderlich');
            }

            const projectData = {
                name: name,
                status: formData.status || 'Planung',
                description: Utils.validateString(formData.description, 0, 500),
                bgf: Utils.validateNumber(formData.bgf),
                bri: Utils.validateNumber(formData.bri),
                wfl: Utils.validateNumber(formData.wfl),
                we: Utils.validateNumber(formData.we)
            };

            let success = false;
            const isEdit = modal.dataset.projectId;

            if (isEdit) {
                // Update existing project
                const result = window.app.updateProject(modal.dataset.projectId, projectData);
                success = !!result;
                if (success) {
                    window.app.addHistoryEntry(modal.dataset.projectId, 'Projekt aktualisiert', projectData);
                    showNotification('Projekt erfolgreich aktualisiert', 'success');
                }
            } else {
                // Create new project
                const project = window.app.createProject(projectData);
                success = !!project;
                if (success) {
                    window.app.addHistoryEntry(project.id, 'Projekt erstellt', projectData);
                    showNotification('Projekt erfolgreich erstellt', 'success');
                }
            }

            if (success) {
                this.renderProjects();
                this.closeProjectModal();
            }
        } catch (error) {
            Utils.handleError(error, 'Saving Project');
        }
    }

    editProject(projectId) {
        try {
            const project = window.app.projects.find(p => p.id === projectId);
            if (!project) {
                throw new Error('Projekt nicht gefunden');
            }
            this.showProjectModal(project);
        } catch (error) {
            Utils.handleError(error, 'Editing Project');
        }
    }

    deleteProject(projectId) {
        try {
            const project = window.app.projects.find(p => p.id === projectId);
            if (!project) {
                throw new Error('Projekt nicht gefunden');
            }

            const confirmed = confirm(`Möchten Sie das Projekt "${project.name}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`);
            if (!confirmed) return;

            const success = window.app.deleteProject(projectId);
            if (success) {
                this.renderProjects();
                showNotification('Projekt erfolgreich gelöscht', 'success');
            }
        } catch (error) {
            Utils.handleError(error, 'Deleting Project');
        }
    }

    openProject(projectId) {
        try {
            const project = window.app.setCurrentProject(projectId);
            if (project) {
                window.app.showModule('kalkulation');
                showNotification(`Projekt "${project.name}" geöffnet`, 'success');
            } else {
                throw new Error('Projekt konnte nicht geöffnet werden');
            }
        } catch (error) {
            Utils.handleError(error, 'Opening Project');
        }
    }

    closeProjectModal() {
        // Close existing modal
        const existingModal = Utils.findElement('#project-modal');
        if (existingModal) {
            existingModal.classList.remove('show');
        }
        
        // Close new modal
        if (this.currentModal) {
            Utils.closeModal(this.currentModal);
            this.currentModal = null;
        }
    }

    // Advanced Features
    duplicateProject(projectId) {
        try {
            const originalProject = window.app.projects.find(p => p.id === projectId);
            if (!originalProject) {
                throw new Error('Originalprojekt nicht gefunden');
            }

            const duplicatedData = {
                name: `${originalProject.name} (Kopie)`,
                status: 'Planung',
                description: originalProject.description,
                bgf: originalProject.kennzahlen?.bgf || 0,
                bri: originalProject.kennzahlen?.bri || 0,
                wfl: originalProject.kennzahlen?.wfl || 0,
                we: originalProject.kennzahlen?.we || 0
            };

            const newProject = window.app.createProject(duplicatedData);
            if (!newProject) {
                throw new Error('Projekt konnte nicht dupliziert werden');
            }
            
            // Copy all data except ID and timestamps
            newProject.kennzahlen = { ...originalProject.kennzahlen };
            newProject.kalkulation = Utils.deepClone(originalProject.kalkulation);
            newProject.baukosten = Utils.deepClone(originalProject.baukosten || []);
            newProject.liquiditaetsplanung = Utils.deepClone(originalProject.liquiditaetsplanung || {});
            
            window.app.saveData(false);
            window.app.addHistoryEntry(newProject.id, 'Projekt dupliziert', { originalName: originalProject.name });
            
            this.renderProjects();
            showNotification('Projekt erfolgreich dupliziert', 'success');
        } catch (error) {
            Utils.handleError(error, 'Duplicating Project');
        }
    }

    exportProject(projectId) {
        try {
            const project = window.app.projects.find(p => p.id === projectId);
            if (!project) {
                throw new Error('Projekt nicht gefunden');
            }

            const data = {
                project: project,
                exported: new Date().toISOString(),
                version: '1.1.0'
            };

            const filename = Utils.generateFilename(project.name, 'projekt');
            Utils.downloadJSON(data, filename);
            showNotification('Projekt erfolgreich exportiert', 'success');
        } catch (error) {
            Utils.handleError(error, 'Exporting Project');
        }
    }

    // Statistics and Filtering
    getProjectStatistics() {
        try {
            const projects = window.app.projects;
            const stats = {
                total: projects.length,
                byStatus: Utils.groupBy(projects, 'status'),
                totalValue: Utils.sum(projects.map(p => this.calculateTotalCost(p))),
                averageValue: 0,
                averageBGF: 0,
                recentProjects: projects
                    .filter(p => {
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return new Date(p.created) > weekAgo;
                    }).length
            };

            stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;
            stats.averageBGF = stats.total > 0 ? 
                Utils.sum(projects, p => p.kennzahlen?.bgf || 0) / stats.total : 0;

            return stats;
        } catch (error) {
            Utils.handleError(error, 'Getting Project Statistics');
            return null;
        }
    }

    filterProjects(searchTerm = '', statusFilter = 'all') {
        this.currentFilter = {
            search: Utils.validateString(searchTerm),
            status: statusFilter
        };
        
        this.debounceUtils.debounce(() => {
            this.renderProjects();
        }, 300, 'filterProjects');
    }

    sortProjects(criteria = 'name', direction = 'asc') {
        try {
            window.app.projects = Utils.sortBy(window.app.projects, criteria, direction);
            this.renderProjects();
        } catch (error) {
            Utils.handleError(error, 'Sorting Projects');
        }
    }

    // Bulk Operations
    exportAllProjects() {
        try {
            const data = {
                projects: window.app.projects,
                exported: new Date().toISOString(),
                version: '1.1.0',
                statistics: this.getProjectStatistics()
            };

            const filename = Utils.generateFilename('alle_projekte', 'export');
            Utils.downloadJSON(data, filename);
            showNotification('Alle Projekte erfolgreich exportiert', 'success');
        } catch (error) {
            Utils.handleError(error, 'Exporting All Projects');
        }
    }

    // Project Templates
    createProjectFromTemplate(templateName) {
        try {
            const templates = this.getProjectTemplates();
            const template = templates[templateName];
            
            if (!template) {
                throw new Error(`Template "${templateName}" nicht gefunden`);
            }

            const project = window.app.createProject(template);
            if (!project) {
                throw new Error('Projekt konnte nicht aus Template erstellt werden');
            }

            // Apply template-specific data
            if (template.kalkulation) {
                Object.assign(project.kalkulation, template.kalkulation);
            }
            
            window.app.saveData(false);
            window.app.addHistoryEntry(project.id, 'Projekt aus Vorlage erstellt', { template: templateName });
            
            this.renderProjects();
            showNotification(`Projekt aus Vorlage "${templateName}" erstellt`, 'success');
            
            return project;
        } catch (error) {
            Utils.handleError(error, `Creating project from template: ${templateName}`);
            return null;
        }
    }

    getProjectTemplates() {
        return {
            'wohnbau': {
                name: 'Neues Wohnbauprojekt',
                status: 'Planung',
                description: 'Wohnbauprojekt basierend auf Standardvorlage',
                bgf: 1000,
                bri: 3000,
                wfl: 800,
                we: 12,
                kalkulation: this.getWohnbauTemplate()
            },
            'gewerbebau': {
                name: 'Neues Gewerbebauprojekt',
                status: 'Planung',
                description: 'Gewerbebauprojekt basierend auf Standardvorlage',
                bgf: 2000,
                bri: 6000,
                wfl: 1800,
                we: 0,
                kalkulation: this.getGewerbebauTemplate()
            }
        };
    }

    getWohnbauTemplate() {
        return {
            '100': { name: 'Grundstück', betrag: 800000, hinweise: 'Durchschnittswert Wohnbau' },
            '200': { name: 'Herrichten und Erschließen', betrag: 50000, hinweise: '' },
            '300': { name: 'Bauwerk - Baukonstruktion', betrag: 1200000, hinweise: '1200€/m² BGF' },
            '400': { name: 'Bauwerk - Technische Anlagen', betrag: 400000, hinweise: '400€/m² BGF' },
            '500': { name: 'Außenanlagen', betrag: 100000, hinweise: '' },
            '700': { name: 'Baunebenkosten', betrag: 350000, hinweise: '~15% der Baukosten' }
        };
    }

    getGewerbebauTemplate() {
        return {
            '100': { name: 'Grundstück', betrag: 1500000, hinweise: 'Durchschnittswert Gewerbebau' },
            '200': { name: 'Herrichten und Erschließen', betrag: 150000, hinweise: '' },
            '300': { name: 'Bauwerk - Baukonstruktion', betrag: 2000000, hinweise: '1000€/m² BGF' },
            '400': { name: 'Bauwerk - Technische Anlagen', betrag: 800000, hinweise: '400€/m² BGF' },
            '500': { name: 'Außenanlagen', betrag: 200000, hinweise: '' },
            '700': { name: 'Baunebenkosten', betrag: 600000, hinweise: '~15% der Baukosten' }
        };
    }
}

// Initialize Projects Module
window.projectsModule = new ProjectsModule(); 