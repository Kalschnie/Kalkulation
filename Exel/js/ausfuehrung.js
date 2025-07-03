/**
 * Ausführung & Bauabrechnung Module
 * Verwaltung von Verträgen, Rechnungen und detaillierter Kostenbetrachtung
 */

class AusfuehrungModule {
    constructor() {
        this.currentProject = null;
        this.debounceUtils = new Utils();
        this.init();
    }

    init() {
        try {
            this.setupEventListeners();
        } catch (error) {
            Utils.handleError(error, 'Ausfuehrung Module Initialization');
        }
    }

    setupEventListeners() {
        try {
            // Add Contract Button
            const addBtn = Utils.findElement('#add-contract-btn');
            if (addBtn) {
                addBtn.addEventListener('click', () => this.addContract());
            }
        } catch (error) {
            Utils.handleError(error, 'Setting up Ausfuehrung Event Listeners');
        }
    }

    loadProject(project) {
        try {
            this.currentProject = project;
            if (project) {
                this.renderContracts();
                this.renderGFListe();
                showNotification(`Ausführung für "${project.name}" geladen`, 'success');
            }
        } catch (error) {
            Utils.handleError(error, 'Loading Project in Ausfuehrung');
        }
    }

    renderContracts() {
        if (!this.currentProject) return;

        try {
            const tbody = Utils.findElement('#contracts-tbody');
            if (!tbody) return;

            tbody.innerHTML = '';

            // Initialize contracts if not exists
            if (!this.currentProject.vertraege) {
                this.currentProject.vertraege = [];
                window.app.saveData(false);
            }

            this.currentProject.vertraege.forEach((vertrag, index) => {
                const row = this.createContractRow(vertrag, index);
                tbody.appendChild(row);
            });

            // Add summary row
            this.addContractsSummary(tbody);
        } catch (error) {
            Utils.handleError(error, 'Rendering Contracts');
        }
    }

    createContractRow(vertrag, index) {
        try {
            const row = Utils.createElement('tr');
            row.dataset.index = index;
            
            const bezahlt = Utils.validateNumber(vertrag.bezahlt);
            const vertragssumme = Utils.validateNumber(vertrag.vertragssumme);
            const offen = vertragssumme - bezahlt;
            
            row.innerHTML = `
                <td class="contract-nr">
                    <input type="text" 
                           class="contract-input" 
                           value="${Utils.validateString(vertrag.vertragNr)}" 
                           data-field="vertragNr"
                           data-index="${index}"
                           maxlength="20"
                           placeholder="V001">
                </td>
                <td class="contract-gewerk">
                    <select class="contract-select" 
                            data-field="gewerk"
                            data-index="${index}">
                        <option value="">Gewerk auswählen</option>
                        ${this.getGewerkOptions(vertrag.gewerk)}
                    </select>
                </td>
                <td class="contract-summe">
                    <input type="number" 
                           class="contract-input currency-input" 
                           value="${vertragssumme}" 
                           step="0.01"
                           min="0"
                           data-field="vertragssumme"
                           data-index="${index}">
                </td>
                <td class="contract-bezahlt">
                    <input type="number" 
                           class="contract-input currency-input" 
                           value="${bezahlt}" 
                           step="0.01"
                           min="0"
                           data-field="bezahlt"
                           data-index="${index}">
                </td>
                <td class="contract-offen ${offen > 0 ? 'text-warning' : 'text-success'}">
                    <strong>${formatCurrency(offen)}</strong>
                </td>
                <td class="contract-status">
                    <select class="contract-select" 
                            data-field="status"
                            data-index="${index}">
                        <option value="Angebot" ${vertrag.status === 'Angebot' ? 'selected' : ''}>Angebot</option>
                        <option value="Beauftragt" ${vertrag.status === 'Beauftragt' ? 'selected' : ''}>Beauftragt</option>
                        <option value="In Ausführung" ${vertrag.status === 'In Ausführung' ? 'selected' : ''}>In Ausführung</option>
                        <option value="Abgeschlossen" ${vertrag.status === 'Abgeschlossen' ? 'selected' : ''}>Abgeschlossen</option>
                        <option value="Storniert" ${vertrag.status === 'Storniert' ? 'selected' : ''}>Storniert</option>
                    </select>
                </td>
                <td class="contract-actions">
                    <button class="btn-icon" onclick="ausfuehrungModule.editContract(${index})" title="Details bearbeiten">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="ausfuehrungModule.addPayment(${index})" title="Zahlung hinzufügen">
                        <i class="fas fa-plus-circle"></i>
                    </button>
                    <button class="btn-icon" onclick="ausfuehrungModule.deleteContract(${index})" title="Löschen">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            // Add event listeners with debouncing
            row.querySelectorAll('input, select').forEach(input => {
                input.addEventListener('input', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    const field = e.target.dataset.field;
                    const value = e.target.type === 'number' ? 
                        Utils.validateNumber(e.target.value) : 
                        Utils.validateString(e.target.value);
                    
                    this.debounceUtils.debounce(() => {
                        this.updateContract(index, field, value);
                    }, 300, `contract-${index}-${field}`);
                });
            });

            return row;
        } catch (error) {
            Utils.handleError(error, `Creating Contract row for index ${index}`);
            return Utils.createElement('tr'); // Empty fallback
        }
    }

    getGewerkOptions(selectedGewerk) {
        let options = '';
        
        if (this.currentProject?.baukosten) {
            this.currentProject.baukosten.forEach(gewerk => {
                const selected = gewerk.name === selectedGewerk ? 'selected' : '';
                options += `<option value="${gewerk.name}" ${selected}>${gewerk.nr} - ${gewerk.name}</option>`;
            });
        }
        
        return options;
    }

    updateContract(index, field, value) {
        if (!this.currentProject?.vertraege?.[index]) return;

        try {
            const vertrag = this.currentProject.vertraege[index];
            const oldValue = vertrag[field];

            // Validate based on field type
            if (['vertragssumme', 'bezahlt'].includes(field)) {
                value = Utils.validateNumber(value);
            } else if (field === 'vertragNr') {
                value = Utils.validateString(value, 0, 20);
            } else {
                value = Utils.validateString(value, 0, 100);
            }

            vertrag[field] = value;

            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Vertrag aktualisiert', {
                vertrag: vertrag.vertragNr,
                field,
                oldValue,
                newValue: value
            });

            // Update calculated fields
            this.updateContractCalculatedFields(index);
            this.updateContractsSummary();
        } catch (error) {
            Utils.handleError(error, `Updating Contract at index ${index}`);
        }
    }

    updateContractCalculatedFields(index) {
        try {
            const row = Utils.findElement(`tr[data-index="${index}"]`);
            if (!row) return;

            const vertrag = this.currentProject.vertraege[index];
            const vertragssumme = Utils.validateNumber(vertrag.vertragssumme);
            const bezahlt = Utils.validateNumber(vertrag.bezahlt);
            const offen = vertragssumme - bezahlt;
            
            const offenCell = row.querySelector('.contract-offen');
            if (offenCell) {
                offenCell.innerHTML = `<strong>${formatCurrency(offen)}</strong>`;
                offenCell.className = `contract-offen ${offen > 0 ? 'text-warning' : 'text-success'}`;
            }
        } catch (error) {
            Utils.handleError(error, `Updating calculated fields for contract ${index}`);
        }
    }

    addContract() {
        try {
            if (!this.currentProject) {
                showNotification('Bitte wählen Sie zuerst ein Projekt aus', 'warning');
                return;
            }

            if (!this.currentProject.vertraege) {
                this.currentProject.vertraege = [];
            }

            const nextNumber = (this.currentProject.vertraege.length + 1).toString().padStart(3, '0');
            const newContract = {
                vertragNr: `V${nextNumber}`,
                gewerk: '',
                vertragssumme: 0,
                bezahlt: 0,
                status: 'Angebot',
                zahlungen: [],
                created: new Date().toISOString()
            };

            this.currentProject.vertraege.push(newContract);
            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Vertrag hinzugefügt', { vertragNr: newContract.vertragNr });
            
            this.renderContracts();
            showNotification('Neuer Vertrag hinzugefügt', 'success');
        } catch (error) {
            Utils.handleError(error, 'Adding Contract');
        }
    }

    editContract(index) {
        try {
            const vertrag = this.currentProject?.vertraege?.[index];
            if (!vertrag) {
                showNotification('Vertrag nicht gefunden', 'error');
                return;
            }

            const modal = Utils.createModal({
                title: `Vertrag "${vertrag.vertragNr}" bearbeiten`,
                content: this.createContractEditForm(vertrag),
                buttons: [
                    {
                        text: 'Abbrechen',
                        className: 'btn-secondary',
                        handler: () => Utils.closeModal(modal)
                    },
                    {
                        text: 'Speichern',
                        className: 'btn-primary',
                        handler: () => this.saveContractEdit(modal, index)
                    }
                ]
            });
        } catch (error) {
            Utils.handleError(error, `Editing Contract at index ${index}`);
        }
    }

    createContractEditForm(vertrag) {
        return `
            <form id="contract-edit-form">
                <div class="form-group">
                    <label>Vertragsnummer:</label>
                    <input type="text" name="vertragNr" value="${vertrag.vertragNr || ''}" maxlength="20" required>
                </div>
                <div class="form-group">
                    <label>Gewerk:</label>
                    <select name="gewerk">
                        <option value="">Gewerk auswählen</option>
                        ${this.getGewerkOptions(vertrag.gewerk)}
                    </select>
                </div>
                <div class="form-group">
                    <label>Vertragssumme (€):</label>
                    <input type="number" name="vertragssumme" value="${vertrag.vertragssumme || 0}" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Bezahlt (€):</label>
                    <input type="number" name="bezahlt" value="${vertrag.bezahlt || 0}" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <select name="status">
                        <option value="Angebot" ${vertrag.status === 'Angebot' ? 'selected' : ''}>Angebot</option>
                        <option value="Beauftragt" ${vertrag.status === 'Beauftragt' ? 'selected' : ''}>Beauftragt</option>
                        <option value="In Ausführung" ${vertrag.status === 'In Ausführung' ? 'selected' : ''}>In Ausführung</option>
                        <option value="Abgeschlossen" ${vertrag.status === 'Abgeschlossen' ? 'selected' : ''}>Abgeschlossen</option>
                        <option value="Storniert" ${vertrag.status === 'Storniert' ? 'selected' : ''}>Storniert</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Hinweise:</label>
                    <textarea name="hinweise" rows="3" maxlength="500">${vertrag.hinweise || ''}</textarea>
                </div>
            </form>
        `;
    }

    saveContractEdit(modal, index) {
        try {
            const form = modal.querySelector('#contract-edit-form');
            const formData = Utils.serializeForm(form);

            if (!formData.vertragNr?.trim()) {
                showNotification('Vertragsnummer ist erforderlich', 'warning');
                return;
            }

            const updatedContract = {
                ...this.currentProject.vertraege[index],
                vertragNr: Utils.validateString(formData.vertragNr.trim(), 1, 20),
                gewerk: Utils.validateString(formData.gewerk, 0, 100),
                vertragssumme: Utils.validateNumber(formData.vertragssumme),
                bezahlt: Utils.validateNumber(formData.bezahlt),
                status: Utils.validateString(formData.status, 0, 50),
                hinweise: Utils.validateString(formData.hinweise, 0, 500)
            };

            this.currentProject.vertraege[index] = updatedContract;
            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Vertrag bearbeitet', { vertrag: updatedContract.vertragNr });

            this.renderContracts();
            Utils.closeModal(modal);
            showNotification('Vertrag erfolgreich aktualisiert', 'success');
        } catch (error) {
            Utils.handleError(error, 'Saving Contract Edit');
        }
    }

    addPayment(index) {
        try {
            const vertrag = this.currentProject?.vertraege?.[index];
            if (!vertrag) {
                showNotification('Vertrag nicht gefunden', 'error');
                return;
            }

            const modal = Utils.createModal({
                title: `Zahlung für Vertrag "${vertrag.vertragNr}" hinzufügen`,
                content: this.createPaymentForm(vertrag),
                buttons: [
                    {
                        text: 'Abbrechen',
                        className: 'btn-secondary',
                        handler: () => Utils.closeModal(modal)
                    },
                    {
                        text: 'Hinzufügen',
                        className: 'btn-primary',
                        handler: () => this.savePayment(modal, index)
                    }
                ]
            });
        } catch (error) {
            Utils.handleError(error, `Adding Payment for contract ${index}`);
        }
    }

    createPaymentForm(vertrag) {
        const offen = (vertrag.vertragssumme || 0) - (vertrag.bezahlt || 0);
        
        return `
            <form id="payment-form">
                <div class="form-group">
                    <label>Betrag (€):</label>
                    <input type="number" name="betrag" value="${Math.max(0, offen)}" step="0.01" min="0" max="${offen}" required>
                    <small class="form-text">Offener Betrag: ${formatCurrency(offen)}</small>
                </div>
                <div class="form-group">
                    <label>Datum:</label>
                    <input type="date" name="datum" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label>Typ:</label>
                    <select name="typ">
                        <option value="Abschlagszahlung">Abschlagszahlung</option>
                        <option value="Schlusszahlung">Schlusszahlung</option>
                        <option value="Vorauszahlung">Vorauszahlung</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Beschreibung:</label>
                    <textarea name="beschreibung" rows="2" maxlength="200" placeholder="Optionale Beschreibung"></textarea>
                </div>
            </form>
        `;
    }

    savePayment(modal, index) {
        try {
            const form = modal.querySelector('#payment-form');
            const formData = Utils.serializeForm(form);

            const betrag = Utils.validateNumber(formData.betrag);
            if (betrag <= 0) {
                showNotification('Betrag muss größer als 0 sein', 'warning');
                return;
            }

            const vertrag = this.currentProject.vertraege[index];
            if (!vertrag.zahlungen) {
                vertrag.zahlungen = [];
            }

            const payment = {
                id: Utils.generateId('payment_'),
                betrag: betrag,
                datum: formData.datum,
                typ: Utils.validateString(formData.typ, 0, 50),
                beschreibung: Utils.validateString(formData.beschreibung, 0, 200),
                created: new Date().toISOString()
            };

            vertrag.zahlungen.push(payment);
            vertrag.bezahlt = (vertrag.bezahlt || 0) + betrag;

            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Zahlung hinzugefügt', {
                vertrag: vertrag.vertragNr,
                betrag: betrag
            });

            this.renderContracts();
            Utils.closeModal(modal);
            showNotification('Zahlung erfolgreich hinzugefügt', 'success');
        } catch (error) {
            Utils.handleError(error, 'Saving Payment');
        }
    }

    deleteContract(index) {
        try {
            const vertrag = this.currentProject?.vertraege?.[index];
            if (!vertrag) {
                showNotification('Vertrag nicht gefunden', 'error');
                return;
            }

            const confirmed = confirm(`Möchten Sie den Vertrag "${vertrag.vertragNr}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`);
            if (!confirmed) return;

            const deletedVertragNr = vertrag.vertragNr;
            this.currentProject.vertraege.splice(index, 1);
            
            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Vertrag gelöscht', { vertrag: deletedVertragNr });

            this.renderContracts();
            showNotification('Vertrag erfolgreich gelöscht', 'success');
        } catch (error) {
            Utils.handleError(error, `Deleting Contract at index ${index}`);
        }
    }

    addContractsSummary(tbody) {
        try {
            if (!this.currentProject?.vertraege?.length) return;

            const summary = Utils.sum(this.currentProject.vertraege, vertrag => ({
                totalSum: Utils.validateNumber(vertrag.vertragssumme),
                totalPaid: Utils.validateNumber(vertrag.bezahlt)
            }), (acc, curr) => ({
                totalSum: acc.totalSum + curr.totalSum,
                totalPaid: acc.totalPaid + curr.totalPaid
            }), { totalSum: 0, totalPaid: 0 });

            const totalOpen = summary.totalSum - summary.totalPaid;

            const summaryRow = Utils.createElement('tr', 'totals-row');
            summaryRow.innerHTML = `
                <td><strong>GESAMT</strong></td>
                <td><strong>Alle Verträge</strong></td>
                <td><strong>${formatCurrency(summary.totalSum)}</strong></td>
                <td><strong>${formatCurrency(summary.totalPaid)}</strong></td>
                <td class="${totalOpen > 0 ? 'text-warning' : 'text-success'}">
                    <strong>${formatCurrency(totalOpen)}</strong>
                </td>
                <td></td>
                <td></td>
            `;

            tbody.appendChild(summaryRow);
        } catch (error) {
            Utils.handleError(error, 'Adding Contracts Summary');
        }
    }

    updateContractsSummary() {
        try {
            const tbody = Utils.findElement('#contracts-tbody');
            if (!tbody) return;

            // Remove existing summary row
            const existingSummary = tbody.querySelector('.totals-row');
            if (existingSummary) {
                existingSummary.remove();
            }

            // Add new summary
            this.addContractsSummary(tbody);
        } catch (error) {
            Utils.handleError(error, 'Updating Contracts Summary');
        }
    }

    renderGFListe() {
        try {
            if (!this.currentProject) return;

            const tbody = Utils.findElement('#gf-liste-tbody');
            if (!tbody) return;

            tbody.innerHTML = '';

            const comparison = this.createKalkulationComparison();
            
            comparison.forEach(item => {
                const row = this.createGFListeRow(item);
                tbody.appendChild(row);
            });

            this.addGFListeTotals(tbody, comparison);
        } catch (error) {
            Utils.handleError(error, 'Rendering GF Liste');
        }
    }

    createKalkulationComparison() {
        const comparison = [];
        
        // Get data from different modules
        const kalkulation = this.currentProject.kalkulation || {};
        const baukosten = this.currentProject.baukosten || [];
        const vertraege = this.currentProject.vertraege || [];

        // Create a comprehensive comparison
        const gewerkMap = new Map();

        // Add Kalkulation data (KG 300-400)
        Object.entries(kalkulation).forEach(([kg, data]) => {
            if (kg.startsWith('3') || kg.startsWith('4')) {
                gewerkMap.set(kg, {
                    nr: kg,
                    name: data.name,
                    kalkulation: Utils.validateNumber(data.betrag),
                    baukosten: 0,
                    vertraege: 0,
                    status: 'Kalkulation'
                });
            }
        });

        // Add Baukosten data
        baukosten.forEach(gewerk => {
            const key = gewerk.name;
            const existing = Array.from(gewerkMap.values()).find(item => item.name === gewerk.name);
            
            if (existing) {
                existing.baukosten = Utils.validateNumber(gewerk.vergabe || gewerk.kalkulation);
            } else {
                gewerkMap.set(key, {
                    nr: gewerk.nr,
                    name: gewerk.name,
                    kalkulation: 0,
                    baukosten: Utils.validateNumber(gewerk.vergabe || gewerk.kalkulation),
                    vertraege: 0,
                    status: 'Baukosten'
                });
            }
        });

        // Add Verträge data
        vertraege.forEach(vertrag => {
            const existing = Array.from(gewerkMap.values()).find(item => item.name === vertrag.gewerk);
            
            if (existing) {
                existing.vertraege += Utils.validateNumber(vertrag.vertragssumme);
            } else if (vertrag.gewerk) {
                gewerkMap.set(vertrag.gewerk, {
                    nr: 'V',
                    name: vertrag.gewerk,
                    kalkulation: 0,
                    baukosten: 0,
                    vertraege: Utils.validateNumber(vertrag.vertragssumme),
                    status: 'Vertrag'
                });
            }
        });

        // Convert to array and calculate deviations
        Array.from(gewerkMap.values()).forEach(item => {
            const referenceValue = item.baukosten || item.kalkulation || item.vertraege;
            const finalValue = item.vertraege || item.baukosten || item.kalkulation;
            
            item.abweichung = finalValue - referenceValue;
            item.abweichungPercent = referenceValue > 0 ? (item.abweichung / referenceValue) * 100 : 0;
            item.gewerkStatus = this.getGewerkStatus(item, item.abweichungPercent);
            
            comparison.push(item);
        });

        return comparison.sort((a, b) => a.name.localeCompare(b.name));
    }

    getGewerkStatus(gewerk, abweichungPercent) {
        if (gewerk.vertraege > 0) {
            if (abweichungPercent <= -5) return { status: 'Einsparung', class: 'text-success' };
            if (abweichungPercent >= 10) return { status: 'Überschreitung', class: 'text-danger' };
            return { status: 'Im Rahmen', class: 'text-primary' };
        }
        if (gewerk.baukosten > 0) return { status: 'Kalkuliert', class: 'text-info' };
        return { status: 'Offen', class: 'text-warning' };
    }

    createGFListeRow(item) {
        const row = Utils.createElement('tr');
        
        row.innerHTML = `
            <td class="gf-nr">${item.nr}</td>
            <td class="gf-name">${item.name}</td>
            <td class="gf-kalkulation">${formatCurrency(item.kalkulation)}</td>
            <td class="gf-baukosten">${formatCurrency(item.baukosten)}</td>
            <td class="gf-vertraege">${formatCurrency(item.vertraege)}</td>
            <td class="gf-abweichung ${item.abweichung >= 0 ? 'text-danger' : 'text-success'}">
                ${formatCurrency(item.abweichung)}
            </td>
            <td class="gf-abweichung-percent ${item.abweichungPercent >= 10 ? 'text-danger' : item.abweichungPercent <= -5 ? 'text-success' : ''}">
                ${formatNumber(item.abweichungPercent, 1)}%
            </td>
            <td class="gf-status ${item.gewerkStatus.class}">
                <span class="badge">${item.gewerkStatus.status}</span>
            </td>
        `;

        return row;
    }

    addGFListeTotals(tbody, comparison) {
        try {
            const totals = comparison.reduce((acc, item) => ({
                kalkulation: acc.kalkulation + item.kalkulation,
                baukosten: acc.baukosten + item.baukosten,
                vertraege: acc.vertraege + item.vertraege,
                abweichung: acc.abweichung + item.abweichung
            }), { kalkulation: 0, baukosten: 0, vertraege: 0, abweichung: 0 });

            const referenceTotal = totals.baukosten || totals.kalkulation;
            const abweichungPercent = referenceTotal > 0 ? (totals.abweichung / referenceTotal) * 100 : 0;

            const totalRow = Utils.createElement('tr', 'totals-row');
            totalRow.innerHTML = `
                <td><strong>GESAMT</strong></td>
                <td><strong>Alle Gewerke</strong></td>
                <td><strong>${formatCurrency(totals.kalkulation)}</strong></td>
                <td><strong>${formatCurrency(totals.baukosten)}</strong></td>
                <td><strong>${formatCurrency(totals.vertraege)}</strong></td>
                <td class="${totals.abweichung >= 0 ? 'text-danger' : 'text-success'}">
                    <strong>${formatCurrency(totals.abweichung)}</strong>
                </td>
                <td class="${abweichungPercent >= 10 ? 'text-danger' : abweichungPercent <= -5 ? 'text-success' : ''}">
                    <strong>${formatNumber(abweichungPercent, 1)}%</strong>
                </td>
                <td></td>
            `;

            tbody.appendChild(totalRow);
        } catch (error) {
            Utils.handleError(error, 'Adding GF Liste Totals');
        }
    }

    exportContracts() {
        try {
            if (!this.currentProject) {
                showNotification('Kein Projekt ausgewählt', 'warning');
                return;
            }

            const data = {
                projektName: this.currentProject.name,
                vertraege: this.currentProject.vertraege || [],
                zusammenfassung: this.getContractSummary(),
                exportiert: new Date().toISOString()
            };

            const filename = Utils.generateFilename(this.currentProject.name, 'vertraege');
            Utils.downloadJSON(data, filename);
            showNotification('Verträge erfolgreich exportiert', 'success');
        } catch (error) {
            Utils.handleError(error, 'Exporting Contracts');
        }
    }

    getContractSummary() {
        if (!this.currentProject?.vertraege?.length) return {};

        return this.currentProject.vertraege.reduce((acc, vertrag) => {
            const summe = Utils.validateNumber(vertrag.vertragssumme);
            const bezahlt = Utils.validateNumber(vertrag.bezahlt);
            
            acc.anzahl++;
            acc.gesamtsumme += summe;
            acc.bezahlt += bezahlt;
            acc.offen += (summe - bezahlt);
            
            acc.nachStatus[vertrag.status] = (acc.nachStatus[vertrag.status] || 0) + 1;
            
            return acc;
        }, {
            anzahl: 0,
            gesamtsumme: 0,
            bezahlt: 0,
            offen: 0,
            nachStatus: {}
        });
    }

    exportGFListe() {
        try {
            if (!this.currentProject) {
                showNotification('Kein Projekt ausgewählt', 'warning');
                return;
            }

            const comparison = this.createKalkulationComparison();
            const data = {
                projektName: this.currentProject.name,
                gfListe: comparison,
                zusammenfassung: this.getProjectStatistics(),
                exportiert: new Date().toISOString()
            };

            const filename = Utils.generateFilename(this.currentProject.name, 'gf_liste');
            Utils.downloadJSON(data, filename);
            showNotification('GF-Liste erfolgreich exportiert', 'success');
        } catch (error) {
            Utils.handleError(error, 'Exporting GF Liste');
        }
    }

    getProjectStatistics() {
        try {
            const comparison = this.createKalkulationComparison();
            
            const stats = {
                anzahlGewerke: comparison.length,
                kalkulationGesamt: Utils.sum(comparison, item => item.kalkulation),
                baukostenGesamt: Utils.sum(comparison, item => item.baukosten),
                vertraegeGesamt: Utils.sum(comparison, item => item.vertraege),
                abweichungGesamt: Utils.sum(comparison, item => item.abweichung),
                status: {
                    abgeschlossen: comparison.filter(item => item.gewerkStatus.status === 'Im Rahmen').length,
                    ueberschreitung: comparison.filter(item => item.gewerkStatus.status === 'Überschreitung').length,
                    einsparung: comparison.filter(item => item.gewerkStatus.status === 'Einsparung').length,
                    offen: comparison.filter(item => item.gewerkStatus.status === 'Offen').length
                }
            };

            const referenceTotal = stats.baukostenGesamt || stats.kalkulationGesamt;
            stats.abweichungPercent = referenceTotal > 0 ? (stats.abweichungGesamt / referenceTotal) * 100 : 0;

            return stats;
        } catch (error) {
            Utils.handleError(error, 'Getting Project Statistics');
            return {};
        }
    }
}

// Export for global access
window.AusfuehrungModule = AusfuehrungModule; 