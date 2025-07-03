/**
 * Ausführung & Bauabrechnung Module (Enhanced Version)
 * Verwaltung von Verträgen, Rechnungen, Zahlungen und detaillierter Kostenbetrachtung
 */

class AusfuehrungModule {
    constructor() {
        this.currentProject = null;
        this.debounceUtils = new Utils();
        this.activeTab = 'contracts';
        this.init();
    }

    init() {
        try {
            this.setupEventListeners();
            this.setupTabNavigation();
        } catch (error) {
            Utils.handleError(error, 'Ausfuehrung Module Initialization');
        }
    }

    setupEventListeners() {
        try {
            // Main action buttons
            const addContractBtn = Utils.findElement('#add-contract-btn');
            if (addContractBtn) {
                addContractBtn.addEventListener('click', () => this.addContract());
            }

            const addInvoiceBtn = Utils.findElement('#add-invoice-btn');
            if (addInvoiceBtn) {
                addInvoiceBtn.addEventListener('click', () => this.addInvoice());
            }

            const exportBtn = Utils.findElement('#export-execution-btn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportExecution());
            }

            // Search and filter functionality
            this.setupSearchAndFilter();

        } catch (error) {
            Utils.handleError(error, 'Setting up Ausfuehrung Event Listeners');
        }
    }

    setupTabNavigation() {
        const tabs = Utils.findAllElements('.execution-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                this.switchTab(targetTab);
            });
        });
    }

    setupSearchAndFilter() {
        // Contracts search and filter
        const contractsSearch = Utils.findElement('#contracts-search');
        if (contractsSearch) {
            contractsSearch.addEventListener('input', (e) => {
                this.debounceUtils.debounce(() => {
                    this.filterContracts(e.target.value);
                }, 300, 'contracts-search');
            });
        }

        const contractsFilter = Utils.findElement('#contracts-filter');
        if (contractsFilter) {
            contractsFilter.addEventListener('change', (e) => {
                this.filterContractsByStatus(e.target.value);
            });
        }

        // Similar setup for invoices and payments...
    }

    switchTab(tabName) {
        try {
            // Update active tab
            this.activeTab = tabName;

            // Update tab buttons
            Utils.findAllElements('.execution-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.tab === tabName) {
                    tab.classList.add('active');
                }
            });

            // Update tab content
            Utils.findAllElements('.execution-tab-content').forEach(content => {
                content.classList.remove('active');
            });

            const activeContent = Utils.findElement(`#${tabName}-content`);
            if (activeContent) {
                activeContent.classList.add('active');
            }

            // Load content for the active tab
            this.loadTabContent(tabName);
        } catch (error) {
            Utils.handleError(error, `Switching to tab: ${tabName}`);
        }
    }

    loadTabContent(tabName) {
        switch (tabName) {
            case 'contracts':
                this.renderContracts();
                break;
            case 'invoices':
                this.renderInvoices();
                break;
            case 'payments':
                this.renderPayments();
                break;
            case 'gf-liste':
                this.renderGFListe();
                break;
        }
    }

    loadProject(project) {
        try {
            this.currentProject = project;
            if (project) {
                this.updateOverviewCards();
                this.loadTabContent(this.activeTab);
                showNotification(`Ausführung für "${project.name}" geladen`, 'success');
            }
        } catch (error) {
            Utils.handleError(error, 'Loading Project in Ausfuehrung');
        }
    }

    updateOverviewCards() {
        if (!this.currentProject) return;

        try {
            const contracts = this.currentProject.vertraege || [];
            const invoices = this.currentProject.rechnungen || [];
            
            // Calculate totals
            const contractsTotal = Utils.sum(contracts, 'vertragssumme');
            const paidTotal = Utils.sum(contracts, 'bezahlt');
            const outstandingTotal = contractsTotal - paidTotal;
            const progress = contractsTotal > 0 ? (paidTotal / contractsTotal) * 100 : 0;

            // Update cards
            Utils.findElement('#contracts-count').textContent = contracts.length;
            Utils.findElement('#contracts-value').textContent = formatCurrency(contractsTotal);
            Utils.findElement('#paid-value').textContent = formatCurrency(paidTotal);
            Utils.findElement('#paid-percentage').textContent = `${Math.round(progress)}%`;
            Utils.findElement('#outstanding-value').textContent = formatCurrency(outstandingTotal);
            Utils.findElement('#outstanding-percentage').textContent = `${Math.round(100 - progress)}%`;
            Utils.findElement('#progress-percentage').textContent = `${Math.round(progress)}%`;

        } catch (error) {
            Utils.handleError(error, 'Updating Overview Cards');
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
            const faelligkeit = vertrag.faelligkeit || '';
            
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
                    <input type="text" 
                           class="contract-input currency-input" 
                           value="${vertragssumme > 0 ? formatNumberWithThousands(vertragssumme, 0) : ''}" 
                           data-field="vertragssumme"
                           data-index="${index}"
                           placeholder="0">
                </td>
                <td class="contract-bezahlt">
                    <input type="text" 
                           class="contract-input currency-input" 
                           value="${bezahlt > 0 ? formatNumberWithThousands(bezahlt, 0) : ''}" 
                           data-field="bezahlt"
                           data-index="${index}"
                           placeholder="0">
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
                <td class="contract-due">
                    <input type="date" 
                           class="contract-input date-input" 
                           value="${faelligkeit}" 
                           data-field="faelligkeit"
                           data-index="${index}">
                </td>
                <td class="contract-actions">
                    <button class="btn-icon" onclick="ausfuehrungModule.editContract(${index})" title="Details bearbeiten">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="ausfuehrungModule.addPayment(${index})" title="Zahlung hinzufügen">
                        <i class="fas fa-plus-circle"></i>
                    </button>
                    <button class="btn-icon" onclick="ausfuehrungModule.viewPayments(${index})" title="Zahlungen anzeigen">
                        <i class="fas fa-eye"></i>
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
                    let value = e.target.value;
                    
                    // Parse value based on field type
                    if (['vertragssumme', 'bezahlt'].includes(field)) {
                        value = parseGermanNumber(value);
                    }
                    
                    this.debounceUtils.debounce(() => {
                        this.updateContract(index, field, value);
                    }, 300, `contract-${index}-${field}`);
                });

                // Setup number formatting for currency inputs
                if (input.classList.contains('currency-input')) {
                    input.addEventListener('blur', (e) => {
                        const value = parseGermanNumber(e.target.value) || 0;
                        if (value > 0) {
                            e.target.value = formatNumberWithThousands(value, 0);
                        }
                    });
                }
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
            window.app.addHistoryEntry(this.currentProject.id, 'Vertrag bearbeitet', {
                vertragNr: updatedContract.vertragNr
            });

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
                        text: 'Zahlung hinzufügen',
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
        const offenBetrag = Utils.validateNumber(vertrag.vertragssumme) - Utils.validateNumber(vertrag.bezahlt);
        
        return `
            <form id="payment-form">
                <div class="form-group">
                    <label>Zahlungsbetrag (€):</label>
                    <input type="number" name="betrag" value="${offenBetrag > 0 ? offenBetrag : 0}" 
                           step="0.01" min="0" max="${offenBetrag}" required>
                    <small class="form-hint">Offener Betrag: ${formatCurrency(offenBetrag)}</small>
                </div>
                <div class="form-group">
                    <label>Zahlungsdatum:</label>
                    <input type="date" name="datum" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label>Zahlungstyp:</label>
                    <select name="typ" required>
                        <option value="Abschlag">Abschlag</option>
                        <option value="Teilzahlung">Teilzahlung</option>
                        <option value="Schlusszahlung">Schlusszahlung</option>
                        <option value="Skonto">Skonto</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Bemerkung:</label>
                    <textarea name="bemerkung" rows="3" maxlength="200"></textarea>
                </div>
            </form>
        `;
    }

    savePayment(modal, index) {
        try {
            const form = modal.querySelector('#payment-form');
            const formData = Utils.serializeForm(form);

            if (!formData.betrag || formData.betrag <= 0) {
                showNotification('Bitte geben Sie einen gültigen Zahlungsbetrag ein', 'warning');
                return;
            }

            const vertrag = this.currentProject.vertraege[index];
            const zahlung = {
                id: Date.now(),
                betrag: Utils.validateNumber(formData.betrag),
                datum: formData.datum,
                typ: formData.typ,
                bemerkung: Utils.validateString(formData.bemerkung, 0, 200),
                created: new Date().toISOString()
            };

            if (!vertrag.zahlungen) {
                vertrag.zahlungen = [];
            }

            vertrag.zahlungen.push(zahlung);
            vertrag.bezahlt = Utils.validateNumber(vertrag.bezahlt) + zahlung.betrag;

            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Zahlung hinzugefügt', {
                vertragNr: vertrag.vertragNr,
                betrag: zahlung.betrag,
                typ: zahlung.typ
            });

            this.renderContracts();
            this.updateOverviewCards();
            Utils.closeModal(modal);
            showNotification('Zahlung erfolgreich hinzugefügt', 'success');
        } catch (error) {
            Utils.handleError(error, 'Saving Payment');
        }
    }

    viewPayments(index) {
        try {
            const vertrag = this.currentProject?.vertraege?.[index];
            if (!vertrag) {
                showNotification('Vertrag nicht gefunden', 'error');
                return;
            }

            const modal = Utils.createModal({
                title: `Zahlungen für Vertrag "${vertrag.vertragNr}"`,
                content: this.createPaymentsView(vertrag),
                size: 'large',
                buttons: [
                    {
                        text: 'Schließen',
                        className: 'btn-secondary',
                        handler: () => Utils.closeModal(modal)
                    }
                ]
            });
        } catch (error) {
            Utils.handleError(error, `Viewing payments for contract ${index}`);
        }
    }

    createPaymentsView(vertrag) {
        const zahlungen = vertrag.zahlungen || [];
        let paymentsHTML = '';

        if (zahlungen.length === 0) {
            paymentsHTML = '<p class="text-muted">Noch keine Zahlungen vorhanden.</p>';
        } else {
            paymentsHTML = `
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Datum</th>
                                <th>Betrag</th>
                                <th>Typ</th>
                                <th>Bemerkung</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${zahlungen.map((zahlung, index) => `
                                <tr>
                                    <td>${new Date(zahlung.datum).toLocaleDateString('de-DE')}</td>
                                    <td>${formatCurrency(zahlung.betrag)}</td>
                                    <td><span class="badge">${zahlung.typ}</span></td>
                                    <td>${zahlung.bemerkung || '-'}</td>
                                    <td>
                                        <button class="btn-icon" onclick="ausfuehrungModule.deletePayment('${vertrag.vertragNr}', ${index})" title="Löschen">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        const totalPaid = zahlungen.reduce((sum, z) => sum + Utils.validateNumber(z.betrag), 0);
        const offenBetrag = Utils.validateNumber(vertrag.vertragssumme) - totalPaid;

        return `
            <div class="payments-overview">
                <div class="payment-summary">
                    <div class="summary-card">
                        <h4>Vertragssumme</h4>
                        <div class="summary-value">${formatCurrency(vertrag.vertragssumme)}</div>
                    </div>
                    <div class="summary-card">
                        <h4>Bezahlt</h4>
                        <div class="summary-value text-success">${formatCurrency(totalPaid)}</div>
                    </div>
                    <div class="summary-card">
                        <h4>Offen</h4>
                        <div class="summary-value ${offenBetrag > 0 ? 'text-warning' : 'text-success'}">${formatCurrency(offenBetrag)}</div>
                    </div>
                </div>
                ${paymentsHTML}
            </div>
        `;
    }

    deleteContract(index) {
        try {
            const vertrag = this.currentProject?.vertraege?.[index];
            if (!vertrag) {
                showNotification('Vertrag nicht gefunden', 'error');
                return;
            }

            if (!confirm(`Möchten Sie den Vertrag "${vertrag.vertragNr}" wirklich löschen?`)) {
                return;
            }

            this.currentProject.vertraege.splice(index, 1);
            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Vertrag gelöscht', {
                vertragNr: vertrag.vertragNr
            });

            this.renderContracts();
            this.updateOverviewCards();
            showNotification('Vertrag erfolgreich gelöscht', 'success');
        } catch (error) {
            Utils.handleError(error, `Deleting Contract at index ${index}`);
        }
    }

    addContractsSummary(tbody) {
        try {
            const contracts = this.currentProject?.vertraege || [];
            const totals = contracts.reduce((acc, vertrag) => {
                acc.vertragssumme += Utils.validateNumber(vertrag.vertragssumme);
                acc.bezahlt += Utils.validateNumber(vertrag.bezahlt);
                return acc;
            }, { vertragssumme: 0, bezahlt: 0 });

            const offen = totals.vertragssumme - totals.bezahlt;

            const summaryRow = Utils.createElement('tr', 'contracts-summary');
            summaryRow.innerHTML = `
                <td colspan="2"><strong>Summe:</strong></td>
                <td><strong>${formatCurrency(totals.vertragssumme)}</strong></td>
                <td><strong>${formatCurrency(totals.bezahlt)}</strong></td>
                <td><strong class="${offen > 0 ? 'text-warning' : 'text-success'}">${formatCurrency(offen)}</strong></td>
                <td colspan="3"></td>
            `;

            tbody.appendChild(summaryRow);
        } catch (error) {
            Utils.handleError(error, 'Adding Contracts Summary');
        }
    }

    updateContractsSummary() {
        const summaryRow = Utils.findElement('.contracts-summary');
        if (summaryRow) {
            summaryRow.remove();
        }

        const tbody = Utils.findElement('#contracts-tbody');
        if (tbody) {
            this.addContractsSummary(tbody);
        }

        this.updateOverviewCards();
    }

    renderInvoices() {
        // Implementation for rendering invoices
        const tbody = Utils.findElement('#invoices-tbody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Rechnungsmodul in Entwicklung</td></tr>';
    }

    renderPayments() {
        // Implementation for rendering payments overview
        const tbody = Utils.findElement('#payments-tbody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Zahlungsübersicht in Entwicklung</td></tr>';
    }

    renderGFListe() {
        if (!this.currentProject) return;

        try {
            const tbody = Utils.findElement('#gf-liste-tbody');
            if (!tbody) return;

            tbody.innerHTML = '';

            const comparison = this.createKalkulationComparison();
            
            comparison.forEach((item, index) => {
                const row = this.createGFListeRow(item, index);
                tbody.appendChild(row);
            });

            this.addGFListeTotals(tbody, comparison);
            this.updateDeviationSummary(comparison);
        } catch (error) {
            Utils.handleError(error, 'Rendering GF Liste');
        }
    }

    createKalkulationComparison() {
        const kalkulation = this.currentProject?.kalkulation || {};
        const baukosten = this.currentProject?.baukosten || [];
        const vertraege = this.currentProject?.vertraege || [];

        const comparison = [];

        // Process Kalkulation items
        Object.entries(kalkulation).forEach(([kg, data]) => {
            const kalkulationBetrag = Utils.validateNumber(data.betrag);
            
            // Find corresponding Baukosten
            const baukostenGewerk = baukosten.find(b => b.nr === kg);
            const baukostenBetrag = baukostenGewerk ? 
                Utils.validateNumber(baukostenGewerk.vergabe || baukostenGewerk.kalkulation) : 0;

            // Find corresponding Verträge
            const vertrageBetrag = vertraege
                .filter(v => v.gewerk === baukostenGewerk?.name)
                .reduce((sum, v) => sum + Utils.validateNumber(v.vertragssumme), 0);

            // Use Verträge if available, otherwise Baukosten
            const actualBetrag = vertrageBetrag > 0 ? vertrageBetrag : baukostenBetrag;
            const abweichung = actualBetrag - kalkulationBetrag;
            const abweichungPercent = kalkulationBetrag > 0 ? (abweichung / kalkulationBetrag) * 100 : 0;

            comparison.push({
                nr: kg,
                position: data.name || `Kostengruppe ${kg}`,
                kalkulation: kalkulationBetrag,
                baukosten: baukostenBetrag,
                vertraege: vertrageBetrag,
                actual: actualBetrag,
                abweichung,
                abweichungPercent,
                status: this.getGewerkStatus(baukostenGewerk, abweichungPercent)
            });
        });

        return comparison.sort((a, b) => a.nr.localeCompare(b.nr));
    }

    getGewerkStatus(gewerk, abweichungPercent) {
        if (!gewerk) return 'Nicht vergeben';
        if (gewerk.status) return gewerk.status;
        
        if (Math.abs(abweichungPercent) <= 5) return 'Im Rahmen';
        if (abweichungPercent > 5) return 'Über Budget';
        return 'Unter Budget';
    }

    createGFListeRow(item, index) {
        const row = Utils.createElement('tr');
        row.dataset.index = index;

        const abweichungClass = item.abweichung > 0 ? 'text-danger' : 
                               item.abweichung < 0 ? 'text-success' : '';

        row.innerHTML = `
            <td>${item.nr}</td>
            <td>${item.position}</td>
            <td class="text-right">${formatCurrency(item.kalkulation)}</td>
            <td class="text-right">${formatCurrency(item.baukosten)}</td>
            <td class="text-right">${formatCurrency(item.vertraege)}</td>
            <td class="text-right ${abweichungClass}">
                <strong>${formatCurrency(item.abweichung)}</strong>
            </td>
            <td class="text-right ${abweichungClass}">
                <strong>${item.abweichungPercent.toFixed(1)}%</strong>
            </td>
            <td>
                <span class="badge ${this.getStatusClass(item.status)}">${item.status}</span>
            </td>
        `;

        return row;
    }

    getStatusClass(status) {
        switch (status) {
            case 'Im Rahmen': return 'badge-success';
            case 'Über Budget': return 'badge-danger';
            case 'Unter Budget': return 'badge-info';
            case 'Nicht vergeben': return 'badge-warning';
            default: return 'badge-secondary';
        }
    }

    addGFListeTotals(tbody, comparison) {
        const totals = comparison.reduce((acc, item) => {
            acc.kalkulation += item.kalkulation;
            acc.baukosten += item.baukosten;
            acc.vertraege += item.vertraege;
            acc.actual += item.actual;
            acc.abweichung += item.abweichung;
            return acc;
        }, { kalkulation: 0, baukosten: 0, vertraege: 0, actual: 0, abweichung: 0 });

        const abweichungPercent = totals.kalkulation > 0 ? 
            (totals.abweichung / totals.kalkulation) * 100 : 0;

        const summaryRow = Utils.createElement('tr', 'gf-summary');
        summaryRow.innerHTML = `
            <td colspan="2"><strong>SUMME:</strong></td>
            <td class="text-right"><strong>${formatCurrency(totals.kalkulation)}</strong></td>
            <td class="text-right"><strong>${formatCurrency(totals.baukosten)}</strong></td>
            <td class="text-right"><strong>${formatCurrency(totals.vertraege)}</strong></td>
            <td class="text-right ${totals.abweichung > 0 ? 'text-danger' : 'text-success'}">
                <strong>${formatCurrency(totals.abweichung)}</strong>
            </td>
            <td class="text-right ${totals.abweichung > 0 ? 'text-danger' : 'text-success'}">
                <strong>${abweichungPercent.toFixed(1)}%</strong>
            </td>
            <td></td>
        `;

        tbody.appendChild(summaryRow);
    }

    updateDeviationSummary(comparison) {
        try {
            const savings = comparison
                .filter(item => item.abweichung < 0)
                .reduce((sum, item) => sum + Math.abs(item.abweichung), 0);

            const overruns = comparison
                .filter(item => item.abweichung > 0)
                .reduce((sum, item) => sum + item.abweichung, 0);

            const netDeviation = overruns - savings;

            Utils.findElement('#total-savings').textContent = formatCurrency(savings);
            Utils.findElement('#total-overruns').textContent = formatCurrency(overruns);
            Utils.findElement('#net-deviation').textContent = formatCurrency(netDeviation);
        } catch (error) {
            Utils.handleError(error, 'Updating Deviation Summary');
        }
    }

    filterContracts(searchTerm) {
        // Implementation for filtering contracts
        this.applyFilter('contracts', searchTerm);
    }

    filterContractsByStatus(status) {
        // Implementation for filtering by status
        this.applyStatusFilter('contracts', status);
    }

    applyFilter(type, searchTerm) {
        try {
            const tbody = Utils.findElement(`#${type}-tbody`);
            if (!tbody) return;

            const rows = tbody.querySelectorAll('tr:not(.summary):not(.total)');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                const matches = !searchTerm || text.includes(searchTerm.toLowerCase());
                row.style.display = matches ? '' : 'none';
            });
        } catch (error) {
            Utils.handleError(error, `Applying filter for ${type}`);
        }
    }

    applyStatusFilter(type, status) {
        try {
            const tbody = Utils.findElement(`#${type}-tbody`);
            if (!tbody) return;

            const rows = tbody.querySelectorAll('tr:not(.summary):not(.total)');
            
            rows.forEach(row => {
                const statusCell = row.querySelector('.contract-status select');
                const matches = !status || (statusCell && statusCell.value === status);
                row.style.display = matches ? '' : 'none';
            });
        } catch (error) {
            Utils.handleError(error, `Applying status filter for ${type}`);
        }
    }

    addInvoice() {
        showNotification('Rechnungsmodul in Entwicklung', 'info');
    }

    exportExecution() {
        try {
            if (!this.currentProject) {
                showNotification('Kein Projekt ausgewählt', 'warning');
                return;
            }

            const data = {
                project: this.currentProject.name,
                exported: new Date().toISOString(),
                contracts: this.getContractSummary(),
                gfListe: this.createKalkulationComparison(),
                statistics: this.getProjectStatistics()
            };

            const filename = Utils.generateFilename(this.currentProject.name, 'ausfuehrung', 'json');
            Utils.downloadJSON(data, filename);
            
            showNotification('Ausführungsdaten erfolgreich exportiert', 'success');
        } catch (error) {
            Utils.handleError(error, 'Exporting Execution Data');
        }
    }

    getContractSummary() {
        const contracts = this.currentProject?.vertraege || [];
        return {
            total: contracts.length,
            totalValue: contracts.reduce((sum, c) => sum + Utils.validateNumber(c.vertragssumme), 0),
            totalPaid: contracts.reduce((sum, c) => sum + Utils.validateNumber(c.bezahlt), 0),
            byStatus: contracts.reduce((acc, c) => {
                acc[c.status] = (acc[c.status] || 0) + 1;
                return acc;
            }, {})
        };
    }

    getProjectStatistics() {
        const comparison = this.createKalkulationComparison();
        const totals = comparison.reduce((acc, item) => {
            acc.kalkulation += item.kalkulation;
            acc.actual += item.actual;
            return acc;
        }, { kalkulation: 0, actual: 0 });

        return {
            totalBudget: totals.kalkulation,
            totalActual: totals.actual,
            deviation: totals.actual - totals.kalkulation,
            deviationPercent: totals.kalkulation > 0 ? 
                ((totals.actual - totals.kalkulation) / totals.kalkulation) * 100 : 0,
            itemsCount: comparison.length,
            itemsOverBudget: comparison.filter(item => item.abweichungPercent > 5).length,
            itemsUnderBudget: comparison.filter(item => item.abweichungPercent < -5).length
        };
    }
}

// Export for global access
window.AusfuehrungModule = AusfuehrungModule; 