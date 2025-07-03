/**
 * Baukosten KG300-400 Module
 * Gewerkeweise Kalkulation mit Versionsvergleich und Mehr-/Minderkosten
 */

class BaukostenModule {
    constructor() {
        this.currentProject = null;
        this.debounceUtils = new Utils();
        this.init();
    }

    init() {
        try {
            this.setupEventListeners();
        } catch (error) {
            Utils.handleError(error, 'Baukosten Module Initialization');
        }
    }

    setupEventListeners() {
        try {
            // Add Gewerk Button
            const addBtn = Utils.findElement('#add-gewerk-btn');
            if (addBtn) {
                addBtn.addEventListener('click', () => this.addGewerk());
            }

            // Compare Versions Button
            const compareBtn = Utils.findElement('#compare-versions-btn');
            if (compareBtn) {
                compareBtn.addEventListener('click', () => this.showVersionComparison());
            }
        } catch (error) {
            Utils.handleError(error, 'Setting up Baukosten Event Listeners');
        }
    }

    loadProject(project) {
        try {
            this.currentProject = project;
            if (project) {
                this.renderBaukosten();
                showNotification(`Baukosten für "${project.name}" geladen`, 'success');
            }
        } catch (error) {
            Utils.handleError(error, 'Loading Project in Baukosten');
        }
    }

    renderBaukosten() {
        if (!this.currentProject) return;

        try {
            const tbody = Utils.findElement('#baukosten-tbody');
            if (!tbody) return;

            tbody.innerHTML = '';

            // Initialize baukosten if not exists
            if (!this.currentProject.baukosten) {
                this.currentProject.baukosten = this.getDefaultGewerke();
                window.app.saveData(false);
            }

            this.currentProject.baukosten.forEach((gewerk, index) => {
                const row = this.createGewerkRow(gewerk, index);
                tbody.appendChild(row);
            });

            this.calculateBaukostenTotals();
        } catch (error) {
            Utils.handleError(error, 'Rendering Baukosten');
        }
    }

    getDefaultGewerke() {
        return [
            { nr: '02', name: 'Erdbau', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '03', name: 'Rohbau', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '05', name: 'Gerüstbau', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '06', name: 'Zimmerer', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '07', name: 'Dach', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '08', name: 'WDVS', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '09', name: 'Fenster + Raffstore', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '10', name: 'Innenputz', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '11', name: 'Parkett', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '12', name: 'Fliesen Flure', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '13', name: 'Fliesenarbeiten', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '14', name: 'Trockenbau', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '15', name: 'Estrich', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '16', name: 'Innentüren', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '17', name: 'Sonnenschutz', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '18', name: 'Maler', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '19', name: 'Schlosser', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '20', name: 'Elektro', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '20.1', name: 'Blitzschutz', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '20.2', name: 'PV-Anlage', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' },
            { nr: '21', name: 'HLS', kalkulation: 0, vergabe: 0, mehrkosten: 0, abzuege: 0, hinweise: '' }
        ];
    }

    createGewerkRow(gewerk, index) {
        try {
            const row = Utils.createElement('tr');
            row.dataset.index = index;
            
            const kalkulation = Utils.validateNumber(gewerk.kalkulation);
            const vergabe = Utils.validateNumber(gewerk.vergabe);
            const mehrkosten = Utils.validateNumber(gewerk.mehrkosten);
            const abzuege = Utils.validateNumber(gewerk.abzuege);
            
            const nettoEndkosten = (vergabe || kalkulation) + mehrkosten - abzuege;
            
            row.innerHTML = `
                <td class="gewerk-nr">
                    <input type="text" 
                           class="gewerk-nr-input" 
                           value="${Utils.validateString(gewerk.nr)}" 
                           data-field="nr"
                           data-index="${index}"
                           maxlength="10">
                </td>
                <td class="gewerk-name">
                    <input type="text" 
                           class="gewerk-name-input" 
                           value="${Utils.validateString(gewerk.name)}" 
                           data-field="name"
                           data-index="${index}"
                           maxlength="100">
                </td>
                <td class="gewerk-kalkulation">
                    <input type="number" 
                           class="gewerk-input currency-input" 
                           value="${kalkulation}" 
                           step="0.01"
                           min="0"
                           data-field="kalkulation"
                           data-index="${index}">
                </td>
                <td class="gewerk-vergabe">
                    <input type="number" 
                           class="gewerk-input currency-input" 
                           value="${vergabe}" 
                           step="0.01"
                           min="0"
                           data-field="vergabe"
                           data-index="${index}">
                </td>
                <td class="gewerk-mehrkosten">
                    <input type="number" 
                           class="gewerk-input currency-input" 
                           value="${mehrkosten}" 
                           step="0.01"
                           data-field="mehrkosten"
                           data-index="${index}">
                </td>
                <td class="gewerk-abzuege">
                    <input type="number" 
                           class="gewerk-input currency-input" 
                           value="${abzuege}" 
                           step="0.01"
                           data-field="abzuege"
                           data-index="${index}">
                </td>
                <td class="gewerk-netto ${nettoEndkosten < 0 ? 'text-danger' : ''}">
                    <strong>${formatCurrency(nettoEndkosten)}</strong>
                </td>
                <td class="gewerk-hinweise">
                    <textarea class="gewerk-hinweise-input" 
                              rows="1" 
                              data-field="hinweise"
                              data-index="${index}"
                              maxlength="500"
                              placeholder="Hinweise...">${Utils.validateString(gewerk.hinweise)}</textarea>
                </td>
                <td class="gewerk-actions">
                    <button class="btn-icon" onclick="baukostenModule.editGewerk(${index})" title="Details bearbeiten">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="baukostenModule.duplicateGewerk(${index})" title="Duplizieren">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn-icon" onclick="baukostenModule.deleteGewerk(${index})" title="Löschen">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            // Add event listeners for all inputs with debouncing
            row.querySelectorAll('input, textarea').forEach(input => {
                input.addEventListener('input', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    const field = e.target.dataset.field;
                    const value = e.target.type === 'number' ? 
                        Utils.validateNumber(e.target.value) : 
                        Utils.validateString(e.target.value);
                    
                    this.debounceUtils.debounce(() => {
                        this.updateGewerk(index, field, value);
                    }, 300, `gewerk-${index}-${field}`);
                });
            });

            return row;
        } catch (error) {
            Utils.handleError(error, `Creating Gewerk row for index ${index}`);
            return Utils.createElement('tr'); // Empty fallback
        }
    }

    updateGewerk(index, field, value) {
        if (!this.currentProject?.baukosten?.[index]) return;

        try {
            const gewerk = this.currentProject.baukosten[index];
            const oldValue = gewerk[field];

            // Validate based on field type
            if (['kalkulation', 'vergabe', 'mehrkosten', 'abzuege'].includes(field)) {
                value = Utils.validateNumber(value);
            } else if (field === 'hinweise') {
                value = Utils.validateString(value, 0, 500);
            } else {
                value = Utils.validateString(value, 0, 100);
            }

            gewerk[field] = value;

            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Gewerk aktualisiert', {
                gewerk: gewerk.name,
                field,
                oldValue,
                newValue: value
            });

            // Update calculated fields
            this.updateCalculatedFields(index);
            this.calculateBaukostenTotals();
        } catch (error) {
            Utils.handleError(error, `Updating Gewerk at index ${index}`);
        }
    }

    updateCalculatedFields(index) {
        try {
            const row = Utils.findElement(`tr[data-index="${index}"]`);
            if (!row) return;

            const gewerk = this.currentProject.baukosten[index];
            const kalkulation = Utils.validateNumber(gewerk.kalkulation);
            const vergabe = Utils.validateNumber(gewerk.vergabe);
            const mehrkosten = Utils.validateNumber(gewerk.mehrkosten);
            const abzuege = Utils.validateNumber(gewerk.abzuege);
            
            const nettoEndkosten = (vergabe || kalkulation) + mehrkosten - abzuege;
            
            const nettoCell = row.querySelector('.gewerk-netto');
            if (nettoCell) {
                nettoCell.innerHTML = `<strong>${formatCurrency(nettoEndkosten)}</strong>`;
                nettoCell.className = `gewerk-netto ${nettoEndkosten < 0 ? 'text-danger' : ''}`;
            }
        } catch (error) {
            Utils.handleError(error, `Updating calculated fields for index ${index}`);
        }
    }

    calculateBaukostenTotals() {
        if (!this.currentProject?.baukosten) return;

        try {
            let totalKalkulation = 0;
            let totalVergabe = 0;
            let totalMehrkosten = 0;
            let totalAbzuege = 0;

            this.currentProject.baukosten.forEach(gewerk => {
                totalKalkulation += Utils.validateNumber(gewerk.kalkulation);
                totalVergabe += Utils.validateNumber(gewerk.vergabe);
                totalMehrkosten += Utils.validateNumber(gewerk.mehrkosten);
                totalAbzuege += Utils.validateNumber(gewerk.abzuege);
            });

            const totalNetto = totalVergabe + totalMehrkosten - totalAbzuege;

            this.updateTotalsDisplay(totalKalkulation, totalVergabe, totalMehrkosten, totalAbzuege, totalNetto);
        } catch (error) {
            Utils.handleError(error, 'Calculating Baukosten Totals');
        }
    }

    updateTotalsDisplay(totalKalkulation, totalVergabe, totalMehrkosten, totalAbzuege, totalNetto) {
        try {
            const tbody = Utils.findElement('#baukosten-tbody');
            if (!tbody) return;

            // Find or create totals row
            let totalsRow = tbody.querySelector('.totals-row');
            if (!totalsRow) {
                totalsRow = Utils.createElement('tr', 'totals-row');
                tbody.appendChild(totalsRow);
            }

            totalsRow.innerHTML = `
                <td><strong>GESAMT</strong></td>
                <td><strong>Gesamtsumme</strong></td>
                <td><strong>${formatCurrency(totalKalkulation)}</strong></td>
                <td><strong>${formatCurrency(totalVergabe)}</strong></td>
                <td><strong>${formatCurrency(totalMehrkosten)}</strong></td>
                <td><strong>${formatCurrency(totalAbzuege)}</strong></td>
                <td class="${totalNetto < 0 ? 'text-danger' : ''}">
                    <strong>${formatCurrency(totalNetto)}</strong>
                </td>
                <td></td>
                <td></td>
            `;
        } catch (error) {
            Utils.handleError(error, 'Updating Totals Display');
        }
    }

    addGewerk() {
        try {
            if (!this.currentProject) {
                showNotification('Bitte wählen Sie zuerst ein Projekt aus', 'warning');
                return;
            }

            const modal = Utils.createModal({
                title: 'Neues Gewerk hinzufügen',
                content: this.createGewerkFormHTML(),
                buttons: [
                    {
                        text: 'Abbrechen',
                        className: 'btn-secondary',
                        handler: () => Utils.closeModal(modal)
                    },
                    {
                        text: 'Hinzufügen',
                        className: 'btn-primary',
                        handler: () => this.saveNewGewerk(modal)
                    }
                ]
            });
        } catch (error) {
            Utils.handleError(error, 'Adding Gewerk');
        }
    }

    createGewerkFormHTML() {
        const nextNr = this.getNextGewerkNumber();
        
        return `
            <form id="gewerk-form">
                <div class="form-group">
                    <label>Gewerk Nr.:</label>
                    <input type="text" name="nr" value="${nextNr}" maxlength="10" required>
                </div>
                <div class="form-group">
                    <label>Bezeichnung:</label>
                    <input type="text" name="name" maxlength="100" placeholder="Gewerk Bezeichnung" required>
                </div>
                <div class="form-group">
                    <label>Kalkulation (€):</label>
                    <input type="number" name="kalkulation" value="0" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Vergabe (€):</label>
                    <input type="number" name="vergabe" value="0" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Mehr-/Minderkosten (€):</label>
                    <input type="number" name="mehrkosten" value="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Abzüge/Skonto (€):</label>
                    <input type="number" name="abzuege" value="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Hinweise:</label>
                    <textarea name="hinweise" rows="3" maxlength="500" placeholder="Optionale Hinweise"></textarea>
                </div>
            </form>
        `;
    }

    getNextGewerkNumber() {
        if (!this.currentProject?.baukosten?.length) return '01';
        
        const numbers = this.currentProject.baukosten
            .map(g => parseFloat(g.nr) || 0)
            .filter(n => !isNaN(n));
        
        const maxNum = Math.max(...numbers, 0);
        return String(maxNum + 1).padStart(2, '0');
    }

    saveNewGewerk(modal) {
        try {
            const form = modal.querySelector('#gewerk-form');
            const formData = Utils.serializeForm(form);

            // Validation
            if (!formData.name?.trim()) {
                showNotification('Bezeichnung ist erforderlich', 'warning');
                return;
            }

            if (!formData.nr?.trim()) {
                showNotification('Gewerk Nr. ist erforderlich', 'warning');
                return;
            }

            // Check for duplicate number
            const existingGewerk = this.currentProject.baukosten.find(g => g.nr === formData.nr.trim());
            if (existingGewerk) {
                showNotification('Gewerk Nr. bereits vorhanden', 'warning');
                return;
            }

            const newGewerk = {
                nr: Utils.validateString(formData.nr.trim(), 1, 10),
                name: Utils.validateString(formData.name.trim(), 1, 100),
                kalkulation: Utils.validateNumber(formData.kalkulation),
                vergabe: Utils.validateNumber(formData.vergabe),
                mehrkosten: Utils.validateNumber(formData.mehrkosten),
                abzuege: Utils.validateNumber(formData.abzuege),
                hinweise: Utils.validateString(formData.hinweise, 0, 500)
            };

            this.currentProject.baukosten.push(newGewerk);
            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Gewerk hinzugefügt', { gewerk: newGewerk.name });

            this.renderBaukosten();
            Utils.closeModal(modal);
            showNotification('Gewerk erfolgreich hinzugefügt', 'success');
        } catch (error) {
            Utils.handleError(error, 'Saving New Gewerk');
        }
    }

    editGewerk(index) {
        try {
            const gewerk = this.currentProject?.baukosten?.[index];
            if (!gewerk) {
                showNotification('Gewerk nicht gefunden', 'error');
                return;
            }

            const modal = Utils.createModal({
                title: `Gewerk "${gewerk.name}" bearbeiten`,
                content: this.createEditGewerkFormHTML(gewerk),
                buttons: [
                    {
                        text: 'Abbrechen',
                        className: 'btn-secondary',
                        handler: () => Utils.closeModal(modal)
                    },
                    {
                        text: 'Speichern',
                        className: 'btn-primary',
                        handler: () => this.saveEditedGewerk(modal, index)
                    }
                ]
            });
        } catch (error) {
            Utils.handleError(error, `Editing Gewerk at index ${index}`);
        }
    }

    createEditGewerkFormHTML(gewerk) {
        return `
            <form id="gewerk-edit-form">
                <div class="form-group">
                    <label>Gewerk Nr.:</label>
                    <input type="text" name="nr" value="${gewerk.nr || ''}" maxlength="10" required>
                </div>
                <div class="form-group">
                    <label>Bezeichnung:</label>
                    <input type="text" name="name" value="${gewerk.name || ''}" maxlength="100" required>
                </div>
                <div class="form-group">
                    <label>Kalkulation (€):</label>
                    <input type="number" name="kalkulation" value="${gewerk.kalkulation || 0}" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Vergabe (€):</label>
                    <input type="number" name="vergabe" value="${gewerk.vergabe || 0}" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Mehr-/Minderkosten (€):</label>
                    <input type="number" name="mehrkosten" value="${gewerk.mehrkosten || 0}" step="0.01">
                </div>
                <div class="form-group">
                    <label>Abzüge/Skonto (€):</label>
                    <input type="number" name="abzuege" value="${gewerk.abzuege || 0}" step="0.01">
                </div>
                <div class="form-group">
                    <label>Hinweise:</label>
                    <textarea name="hinweise" rows="3" maxlength="500">${gewerk.hinweise || ''}</textarea>
                </div>
            </form>
        `;
    }

    saveEditedGewerk(modal, index) {
        try {
            const form = modal.querySelector('#gewerk-edit-form');
            const formData = Utils.serializeForm(form);

            // Validation
            if (!formData.name?.trim()) {
                showNotification('Bezeichnung ist erforderlich', 'warning');
                return;
            }

            if (!formData.nr?.trim()) {
                showNotification('Gewerk Nr. ist erforderlich', 'warning');
                return;
            }

            // Check for duplicate number (excluding current)
            const existingGewerk = this.currentProject.baukosten.find((g, i) => 
                i !== index && g.nr === formData.nr.trim()
            );
            if (existingGewerk) {
                showNotification('Gewerk Nr. bereits vorhanden', 'warning');
                return;
            }

            const updatedGewerk = {
                nr: Utils.validateString(formData.nr.trim(), 1, 10),
                name: Utils.validateString(formData.name.trim(), 1, 100),
                kalkulation: Utils.validateNumber(formData.kalkulation),
                vergabe: Utils.validateNumber(formData.vergabe),
                mehrkosten: Utils.validateNumber(formData.mehrkosten),
                abzuege: Utils.validateNumber(formData.abzuege),
                hinweise: Utils.validateString(formData.hinweise, 0, 500)
            };

            this.currentProject.baukosten[index] = updatedGewerk;
            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Gewerk bearbeitet', { gewerk: updatedGewerk.name });

            this.renderBaukosten();
            Utils.closeModal(modal);
            showNotification('Gewerk erfolgreich aktualisiert', 'success');
        } catch (error) {
            Utils.handleError(error, 'Saving Edited Gewerk');
        }
    }

    duplicateGewerk(index) {
        try {
            const originalGewerk = this.currentProject?.baukosten?.[index];
            if (!originalGewerk) {
                showNotification('Gewerk nicht gefunden', 'error');
                return;
            }

            const duplicatedGewerk = {
                ...Utils.deepClone(originalGewerk),
                nr: this.getNextGewerkNumber(),
                name: `${originalGewerk.name} (Kopie)`
            };

            this.currentProject.baukosten.push(duplicatedGewerk);
            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Gewerk dupliziert', {
                original: originalGewerk.name,
                duplicate: duplicatedGewerk.name
            });

            this.renderBaukosten();
            showNotification('Gewerk erfolgreich dupliziert', 'success');
        } catch (error) {
            Utils.handleError(error, `Duplicating Gewerk at index ${index}`);
        }
    }

    deleteGewerk(index) {
        try {
            const gewerk = this.currentProject?.baukosten?.[index];
            if (!gewerk) {
                showNotification('Gewerk nicht gefunden', 'error');
                return;
            }

            const confirmed = confirm(`Möchten Sie das Gewerk "${gewerk.name}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`);
            if (!confirmed) return;

            const deletedGewerkName = gewerk.name;
            this.currentProject.baukosten.splice(index, 1);
            
            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Gewerk gelöscht', { gewerk: deletedGewerkName });

            this.renderBaukosten();
            showNotification('Gewerk erfolgreich gelöscht', 'success');
        } catch (error) {
            Utils.handleError(error, `Deleting Gewerk at index ${index}`);
        }
    }

    createBaukostenVersion(name) {
        try {
            if (!this.currentProject) {
                showNotification('Kein Projekt ausgewählt', 'warning');
                return;
            }

            if (!name || name.trim().length === 0) {
                showNotification('Versionsname ist erforderlich', 'warning');
                return;
            }

            if (!this.currentProject.baukostenVersions) {
                this.currentProject.baukostenVersions = [];
            }

            const version = {
                id: Utils.generateId('version_'),
                name: Utils.validateString(name.trim(), 1, 100),
                created: new Date().toISOString(),
                baukosten: Utils.deepClone(this.currentProject.baukosten)
            };

            this.currentProject.baukostenVersions.push(version);
            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Baukosten-Version erstellt', { versionName: name });

            showNotification(`Version "${name}" erfolgreich erstellt`, 'success');
            return version;
        } catch (error) {
            Utils.handleError(error, 'Creating Baukosten Version');
            return null;
        }
    }

    showVersionComparison() {
        try {
            if (!this.currentProject) {
                showNotification('Bitte wählen Sie zuerst ein Projekt aus', 'warning');
                return;
            }

            const versions = this.currentProject.baukostenVersions || [];
            if (versions.length === 0) {
                showNotification('Keine Versionen zum Vergleich vorhanden', 'info');
                return;
            }

            const modal = Utils.createModal({
                title: 'Baukosten-Versionen vergleichen',
                size: 'large',
                content: this.createVersionComparisonHTML(versions),
                buttons: [
                    {
                        text: 'Schließen',
                        className: 'btn-secondary',
                        handler: () => Utils.closeModal(modal)
                    },
                    {
                        text: 'Vergleichen',
                        className: 'btn-primary',
                        handler: () => this.generateComparison(modal)
                    }
                ]
            });
        } catch (error) {
            Utils.handleError(error, 'Opening Version Comparison');
        }
    }

    createVersionComparisonHTML(versions) {
        const currentVersion = {
            id: 'current',
            name: 'Aktuelle Version',
            created: new Date().toISOString(),
            baukosten: this.currentProject.baukosten
        };

        const allVersions = [currentVersion, ...versions];

        return `
            <div class="version-comparison">
                <div class="version-selection">
                    <div class="form-group">
                        <label>Version 1:</label>
                        <select id="version1-select">
                            ${allVersions.map(v => 
                                `<option value="${v.id}">${v.name} (${Utils.formatDate(v.created)})</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Version 2:</label>
                        <select id="version2-select">
                            ${allVersions.map((v, index) => 
                                `<option value="${v.id}" ${index === 1 ? 'selected' : ''}>${v.name} (${Utils.formatDate(v.created)})</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <div id="comparison-result">
                    <p class="text-muted">Wählen Sie zwei Versionen aus und klicken Sie auf "Vergleichen"</p>
                </div>
            </div>
        `;
    }

    generateComparison(modal) {
        try {
            const version1Id = modal.querySelector('#version1-select').value;
            const version2Id = modal.querySelector('#version2-select').value;

            if (version1Id === version2Id) {
                showNotification('Bitte wählen Sie zwei verschiedene Versionen aus', 'warning');
                return;
            }

            const version1 = this.getVersionById(version1Id);
            const version2 = this.getVersionById(version2Id);

            if (!version1 || !version2) {
                showNotification('Eine oder beide Versionen wurden nicht gefunden', 'error');
                return;
            }

            const comparisonTable = this.createComparisonTable(version1, version2);
            const resultContainer = modal.querySelector('#comparison-result');
            if (resultContainer) {
                resultContainer.innerHTML = comparisonTable;
            }
        } catch (error) {
            Utils.handleError(error, 'Generating Comparison');
        }
    }

    getVersionById(versionId) {
        if (versionId === 'current') {
            return {
                id: 'current',
                name: 'Aktuelle Version',
                created: new Date().toISOString(),
                baukosten: this.currentProject.baukosten
            };
        }
        
        return this.currentProject.baukostenVersions?.find(v => v.id === versionId);
    }

    createComparisonTable(version1, version2) {
        try {
            const allGewerkeNrs = new Set([
                ...version1.baukosten.map(g => g.nr),
                ...version2.baukosten.map(g => g.nr)
            ]);

            let tableHTML = `
                <h4>Vergleich: ${version1.name} vs ${version2.name}</h4>
                <table class="calculation-table comparison-table">
                    <thead>
                        <tr>
                            <th>Nr.</th>
                            <th>Gewerk</th>
                            <th>${version1.name} (€)</th>
                            <th>${version2.name} (€)</th>
                            <th>Differenz (€)</th>
                            <th>Differenz (%)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            let totalV1 = 0;
            let totalV2 = 0;

            Array.from(allGewerkeNrs).sort().forEach(nr => {
                const gewerk1 = version1.baukosten.find(g => g.nr === nr);
                const gewerk2 = version2.baukosten.find(g => g.nr === nr);

                const name = gewerk1?.name || gewerk2?.name || 'Unbekannt';
                const netto1 = this.calculateGewerkNetto(gewerk1);
                const netto2 = this.calculateGewerkNetto(gewerk2);
                const diff = netto2 - netto1;
                const diffPercent = netto1 !== 0 ? (diff / netto1) * 100 : (netto2 !== 0 ? 100 : 0);

                totalV1 += netto1;
                totalV2 += netto2;

                const diffClass = diff > 0 ? 'text-danger' : diff < 0 ? 'text-success' : '';

                tableHTML += `
                    <tr>
                        <td>${nr}</td>
                        <td>${name}</td>
                        <td class="text-right">${formatCurrency(netto1)}</td>
                        <td class="text-right">${formatCurrency(netto2)}</td>
                        <td class="text-right ${diffClass}">${formatCurrency(diff)}</td>
                        <td class="text-right ${diffClass}">${formatNumber(diffPercent, 1)}%</td>
                    </tr>
                `;
            });

            const totalDiff = totalV2 - totalV1;
            const totalDiffPercent = totalV1 !== 0 ? (totalDiff / totalV1) * 100 : (totalV2 !== 0 ? 100 : 0);
            const totalDiffClass = totalDiff > 0 ? 'text-danger' : totalDiff < 0 ? 'text-success' : '';

            tableHTML += `
                    <tr class="totals-row">
                        <td><strong>GESAMT</strong></td>
                        <td><strong>Gesamtsumme</strong></td>
                        <td class="text-right"><strong>${formatCurrency(totalV1)}</strong></td>
                        <td class="text-right"><strong>${formatCurrency(totalV2)}</strong></td>
                        <td class="text-right ${totalDiffClass}"><strong>${formatCurrency(totalDiff)}</strong></td>
                        <td class="text-right ${totalDiffClass}"><strong>${formatNumber(totalDiffPercent, 1)}%</strong></td>
                    </tr>
                </tbody>
            </table>
            `;

            return tableHTML;
        } catch (error) {
            Utils.handleError(error, 'Creating Comparison Table');
            return '<p class="text-danger">Fehler beim Erstellen der Vergleichstabelle</p>';
        }
    }

    calculateGewerkNetto(gewerk) {
        if (!gewerk) return 0;
        
        const kalkulation = Utils.validateNumber(gewerk.kalkulation);
        const vergabe = Utils.validateNumber(gewerk.vergabe);
        const mehrkosten = Utils.validateNumber(gewerk.mehrkosten);
        const abzuege = Utils.validateNumber(gewerk.abzuege);
        
        return (vergabe || kalkulation) + mehrkosten - abzuege;
    }

    exportBaukosten() {
        try {
            if (!this.currentProject) {
                showNotification('Kein Projekt ausgewählt', 'warning');
                return;
            }

            const data = {
                projektName: this.currentProject.name,
                baukosten: this.currentProject.baukosten,
                versionen: this.currentProject.baukostenVersions || [],
                gesamtKalkulation: Utils.sum(this.currentProject.baukosten, g => Utils.validateNumber(g.kalkulation)),
                gesamtVergabe: Utils.sum(this.currentProject.baukosten, g => Utils.validateNumber(g.vergabe)),
                exportiert: new Date().toISOString()
            };

            const filename = Utils.generateFilename(this.currentProject.name, 'baukosten');
            Utils.downloadJSON(data, filename);
            showNotification('Baukosten erfolgreich exportiert', 'success');
        } catch (error) {
            Utils.handleError(error, 'Exporting Baukosten');
        }
    }
}

// Initialize Baukosten Module
window.baukostenModule = new BaukostenModule(); 