/**
 * Kalkulation KG100-800 Module
 * Verwaltung der Kostengruppen nach DIN 276 mit Kennzahlen-basierter Kalkulation
 */

class KalkulationModule {
    constructor() {
        this.currentProject = null;
        this.debounceUtils = new Utils();
        this.init();
    }

    init() {
        try {
            this.setupEventListeners();
            this.setupKennzahlenCalculation();
        } catch (error) {
            Utils.handleError(error, 'Kalkulation Module Initialization');
        }
    }

    setupEventListeners() {
        try {
            // Referenzkalkulation Button
            const refBtn = Utils.findElement('#reference-calc-btn');
            if (refBtn) {
                refBtn.addEventListener('click', () => this.showReferenceModal());
            }

            // Add Custom Kostengruppe Button
            const addBtn = Utils.findElement('#add-kostengruppe-btn');
            if (addBtn) {
                addBtn.addEventListener('click', () => this.addCustomKostengruppe());
            }

            // Kennzahlen Inputs
            ['bgf-input', 'bri-input', 'wfl-input', 'grundstuecksflaeche-input', 'we-input'].forEach(id => {
                const input = Utils.findElement(`#${id}`);
                if (input) {
                    input.addEventListener('input', (e) => {
                        const fieldName = id.replace('-input', '').replace('grundstuecksflaeche', 'grundstuecksflaeche');
                        this.updateKennzahl(fieldName, parseFloat(e.target.value) || 0);
                    });
                }
            });

            // Reference Modal Events
            const applyBtn = Utils.findElement('#apply-reference-btn');
            if (applyBtn) {
                applyBtn.addEventListener('click', () => this.applyReferenceCalculation());
            }
        } catch (error) {
            Utils.handleError(error, 'Setting up Kalkulation Event Listeners');
        }
    }

    setupKennzahlenCalculation() {
        // Auto-calculate ratios when values change
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('kg-betrag-input')) {
                this.debounceUtils.debounce(() => {
                    this.calculateKennzahlenRatios();
                }, 500, 'kennzahlenCalc');
            }
        });
    }

    loadProject(project) {
        try {
            this.currentProject = project;
            if (project) {
                this.renderKennzahlen();
                this.renderKostengruppen();
                this.calculateTotals();
                showNotification(`Kalkulation für "${project.name}" geladen`, 'success');
            }
        } catch (error) {
            Utils.handleError(error, 'Loading Project in Kalkulation');
        }
    }

    renderKennzahlen() {
        if (!this.currentProject) return;

        try {
            const kennzahlen = this.currentProject.kennzahlen;
            const inputs = {
                'bgf-input': kennzahlen.bgf || 0,
                'bri-input': kennzahlen.bri || 0,
                'wfl-input': kennzahlen.wfl || 0,
                'grundstuecksflaeche-input': kennzahlen.grundstuecksflaeche || 0,
                'we-input': kennzahlen.we || 0
            };

            Object.entries(inputs).forEach(([id, value]) => {
                const input = Utils.findElement(`#${id}`);
                if (input) {
                    input.value = value;
                }
            });
        } catch (error) {
            Utils.handleError(error, 'Rendering Kennzahlen');
        }
    }

    renderKostengruppen() {
        if (!this.currentProject) return;

        try {
            const tbody = Utils.findElement('#kg-tbody');
            if (!tbody) return;

            tbody.innerHTML = '';

            // Merge standard and custom kostengruppen
            const standardKostengruppen = this.getKostengruppenDefinition();
            const customKostengruppen = this.currentProject.customKostengruppen || {};
            const allKostengruppen = { ...standardKostengruppen, ...customKostengruppen };
            
            // Sort by KG number
            const sortedKGs = Object.keys(allKostengruppen).sort((a, b) => parseInt(a) - parseInt(b));
            
            sortedKGs.forEach(kg => {
                const definition = allKostengruppen[kg];
                const row = this.createKostengruppenRow(kg, definition);
                tbody.appendChild(row);
            });

            this.calculateTotals();
        } catch (error) {
            Utils.handleError(error, 'Rendering Kostengruppen');
        }
    }

    getKostengruppenDefinition() {
        return {
            // KG 100 - Grundstück
            '100': { name: 'Grundstück', color: '#e74c3c' },
            '110': { name: 'Grundstückswert', color: '#e74c3c', parent: '100' },
            '111': { name: 'Grundstücksnebenkosten', color: '#e74c3c', parent: '100' },
            '112': { name: 'Makler', color: '#e74c3c', parent: '100' },
            '113': { name: 'Freimachen Abriss Altlasten', color: '#e74c3c', parent: '100' },

            // KG 200 - Herrichten und Erschließen
            '200': { name: 'Herrichten und Erschließen', color: '#f39c12' },
            '210': { name: 'Fernwärme - Hausanschluss', color: '#f39c12', parent: '200' },
            '211': { name: 'TW/AW-Hausanschluss inkl. Bauwasser', color: '#f39c12', parent: '200' },
            '212': { name: 'Strom-Hausanschluss', color: '#f39c12', parent: '200' },
            '213': { name: 'Telefon/TV-Anschluss', color: '#f39c12', parent: '200' },

            // KG 250 - Maßnahmen LVB
            '250': { name: 'Maßnahmen LVB', color: '#ff8c00' },

            // KG 300 - Bauwerk - Baukonstruktion (Detailliert)
            '300': { name: 'Bauwerk - Baukonstruktion', color: '#3498db' },
            '310': { name: 'Erdbau/ Baugrube', color: '#3498db', parent: '300' },
            '311': { name: 'Spezialtiefbau', color: '#3498db', parent: '300' },
            '312': { name: 'Rohbau', color: '#3498db', parent: '300' },
            '313': { name: 'Gerüst', color: '#3498db', parent: '300' },
            '314': { name: 'Zimmerer- und Holzbauarbeiten', color: '#3498db', parent: '300' },
            '315': { name: 'Dach', color: '#3498db', parent: '300' },
            '316': { name: 'Fassade WDVS', color: '#3498db', parent: '300' },
            '317': { name: 'Fenster', color: '#3498db', parent: '300' },
            '318': { name: 'Innenputz / Dämmarbeiten', color: '#3498db', parent: '300' },
            '319': { name: 'Bodenbelag', color: '#3498db', parent: '300' },
            '320': { name: 'Naturstein', color: '#3498db', parent: '300' },
            '321': { name: 'Fliesenarbeiten', color: '#3498db', parent: '300' },
            '322': { name: 'Trockenbau', color: '#3498db', parent: '300' },
            '323': { name: 'Estrich', color: '#3498db', parent: '300' },
            '324': { name: 'Innentüren', color: '#3498db', parent: '300' },
            '325': { name: 'Badmöbel', color: '#3498db', parent: '300' },
            '326': { name: 'Sonnenschutz', color: '#3498db', parent: '300' },
            '327': { name: 'Malerarbeiten (+inkl. Beschichtung)', color: '#3498db', parent: '300' },
            '328': { name: 'Schlosser', color: '#3498db', parent: '300' },
            '329': { name: 'Toranlagen', color: '#3498db', parent: '300' },
            '330': { name: 'Kellertrennwände', color: '#3498db', parent: '300' },
            '331': { name: 'Stahltüren', color: '#3498db', parent: '300' },
            '332': { name: 'TG - Beschichtung', color: '#3498db', parent: '300' },
            '333': { name: 'Alu-Glas-Elemente', color: '#3498db', parent: '300' },
            '334': { name: 'Schließanlage', color: '#3498db', parent: '300' },
            '335': { name: 'Terrassenbeläge', color: '#3498db', parent: '300' },
            '336': { name: 'Baufeinreinigung', color: '#3498db', parent: '300' },
            '337': { name: 'Bauheizung', color: '#3498db', parent: '300' },
            '338': { name: 'Duschtrennwände (+ Spiegel)', color: '#3498db', parent: '300' },
            '339': { name: 'Bauwerksabdichtung', color: '#3498db', parent: '300' },
            '340': { name: 'Briefkastenanlage', color: '#3498db', parent: '300' },
            '341': { name: 'Paketanlage Micro Hub', color: '#3498db', parent: '300' },
            '342': { name: 'Kunst am Bau', color: '#3498db', parent: '300' },
            '343': { name: 'Tischler', color: '#3498db', parent: '300' },
            '344': { name: 'Parksystem', color: '#3498db', parent: '300' },
            '345': { name: 'Kamin', color: '#3498db', parent: '300' },
            '346': { name: 'Sandstrahlen', color: '#3498db', parent: '300' },
            '347': { name: 'Innentreppen', color: '#3498db', parent: '300' },
            '348': { name: 'Kleinaufträge', color: '#3498db', parent: '300' },
            '349': { name: 'Detailkalkulation', color: '#3498db', parent: '300' },
            '350': { name: 'Unvorhersehbare Kosten', color: '#3498db', parent: '300' },
            '351': { name: 'Erdbau/Abbruch', color: '#3498db', parent: '300' },

            // KG 400 - Bauwerk - Technische Anlagen (Detailliert)
            '400': { name: 'Bauwerk - Technische Anlagen', color: '#9b59b6' },
            '410': { name: 'Elektro', color: '#9b59b6', parent: '400' },
            '411': { name: 'PV-Anlage', color: '#9b59b6', parent: '400' },
            '412': { name: 'Blitzschutz', color: '#9b59b6', parent: '400' },
            '420': { name: 'Heizung-Lüftung-Sanitär', color: '#9b59b6', parent: '400' },
            '430': { name: 'Aufzüge', color: '#9b59b6', parent: '400' },

            // KG 500 - Außenanlagen
            '500': { name: 'Außenanlagen', color: '#27ae60' },
            '510': { name: 'Außenanlagen', color: '#27ae60', parent: '500' },

            // KG 600 - Ausstattung und Kunstwerke
            '600': { name: 'Ausstattung und Kunstwerke', color: '#e67e22' },
            '610': { name: 'Ausstattung und Kunstwerke', color: '#e67e22', parent: '600' },

            // KG 700 - Baunebenkosten (Detailliert)
            '700': { name: 'Baunebenkosten', color: '#95a5a6' },
            
            // Bauherrenaufgaben
            '710': { name: 'Bauherrenaufgaben Regiekosten', color: '#95a5a6', parent: '700' },
            '711': { name: 'Bauherrenaufgaben Regiekosten', color: '#95a5a6', parent: '700' },

            // Architekten und Ingenieure
            '720': { name: 'Architekten und Ingenieure', color: '#95a5a6', parent: '700' },
            '721': { name: 'Vorplanung', color: '#95a5a6', parent: '700' },
            '722': { name: 'Architekten', color: '#95a5a6', parent: '700' },
            '723': { name: 'Statik', color: '#95a5a6', parent: '700' },
            '724': { name: 'HLS Planung', color: '#95a5a6', parent: '700' },
            '725': { name: 'ELT Planung', color: '#95a5a6', parent: '700' },
            '726': { name: 'Bauphysik', color: '#95a5a6', parent: '700' },
            '727': { name: 'Ausschreibung', color: '#95a5a6', parent: '700' },
            '728': { name: 'Spezialtiefbau', color: '#95a5a6', parent: '700' },
            '729': { name: 'Außenanlagenplanung', color: '#95a5a6', parent: '700' },
            '730': { name: 'Schlosserplanung', color: '#95a5a6', parent: '700' },
            '731': { name: 'Sonstige Planungsleistungen', color: '#95a5a6', parent: '700' },

            // Gutachten und Beratung
            '740': { name: 'Gutachten und Beratung', color: '#95a5a6', parent: '700' },
            '741': { name: 'Abnahmen SE+GE/Qualitätskontrolle', color: '#95a5a6', parent: '700' },
            '742': { name: 'Beweissicherung', color: '#95a5a6', parent: '700' },
            '743': { name: 'Boden-/Baugrundgutachten', color: '#95a5a6', parent: '700' },
            '744': { name: 'Bodenanalyse/Schadstoffe', color: '#95a5a6', parent: '700' },
            '745': { name: 'Brandschutz', color: '#95a5a6', parent: '700' },
            '746': { name: 'Brandschutzprüfung', color: '#95a5a6', parent: '700' },
            '747': { name: 'Beratung KFW + Zertifizierungen', color: '#95a5a6', parent: '700' },
            '748': { name: 'Rechtsberatung', color: '#95a5a6', parent: '700' },
            '749': { name: 'Sonstige Gutachten', color: '#95a5a6', parent: '700' },

            // Vertrieb/Finanzierung
            '750': { name: 'Vertrieb/Finanzierung', color: '#95a5a6', parent: '700' },
            '751': { name: 'Vertriebsprovision', color: '#95a5a6', parent: '700' },
            '752': { name: 'Notarkosten', color: '#95a5a6', parent: '700' },
            '753': { name: 'Visualisierungen', color: '#95a5a6', parent: '700' },
            '754': { name: 'Expose', color: '#95a5a6', parent: '700' },
            '755': { name: 'Fotodoku', color: '#95a5a6', parent: '700' },
            '756': { name: 'Vermietung', color: '#95a5a6', parent: '700' },

            // Allgemeine Baunebenkosten
            '760': { name: 'Allgemeine Baunebenkosten', color: '#95a5a6', parent: '700' },
            '761': { name: 'Gebühren Baugenehmigung', color: '#95a5a6', parent: '700' },
            '762': { name: 'Stellplatzablöse', color: '#95a5a6', parent: '700' },
            '763': { name: 'Kommunale Gebühren', color: '#95a5a6', parent: '700' },
            '764': { name: 'Versorger/Wasser/Fernwärme', color: '#95a5a6', parent: '700' },
            '765': { name: 'Baustrom', color: '#95a5a6', parent: '700' },
            '766': { name: 'Baubeheizung', color: '#95a5a6', parent: '700' },
            '767': { name: 'Sondernutzung/VRAO', color: '#95a5a6', parent: '700' },
            '768': { name: 'Prüfstatik', color: '#95a5a6', parent: '700' },
            '769': { name: 'SiGeKo', color: '#95a5a6', parent: '700' },
            '770': { name: 'Vermessungskosten', color: '#95a5a6', parent: '700' },
            '771': { name: 'Sanitärcontainer', color: '#95a5a6', parent: '700' },
            '772': { name: 'Baubewachung', color: '#95a5a6', parent: '700' },
            '773': { name: 'Sonstige Nebenkosten', color: '#95a5a6', parent: '700' },
            
            // KG 800 - Finanzierung
            '800': { name: 'Finanzierung', color: '#34495e' }
        };
    }

    createKostengruppenRow(kg, definition) {
        try {
            const kalkulation = this.currentProject.kalkulation[kg] || { name: definition.name, betrag: 0, hinweise: '' };
            const isSubgroup = definition.parent !== undefined;
            const isMainGroup = !isSubgroup;
            
            const row = Utils.createElement('tr');
            row.className = isSubgroup ? 'kg-subgroup collapsed' : 'kg-main';
            row.dataset.kg = kg;
            
            // Add parent data for subgroups
            if (isSubgroup) {
                row.dataset.parent = definition.parent;
                row.style.display = 'none'; // Start collapsed
            }
            
            const kennzahlen = this.currentProject.kennzahlen;
            const betrag = Utils.validateNumber(kalkulation.betrag);
            
            // Toggle icon for main groups
            const toggleIcon = isMainGroup ? '<i class="fas fa-chevron-right toggle-icon" style="cursor: pointer; margin-right: 8px;"></i>' : '';
            
            row.innerHTML = `
                <td class="kg-number" style="border-left: 4px solid ${definition.color};">
                    <strong>${kg}</strong>
                </td>
                <td class="kg-name ${isSubgroup ? 'kg-subname' : ''}" ${isMainGroup ? 'style="cursor: pointer;"' : ''}>
                    ${toggleIcon}${isSubgroup ? '&nbsp;&nbsp;&nbsp;' : ''}${definition.name}
                </td>
                <td class="kg-betrag">
                    <input type="number" 
                           class="kg-betrag-input" 
                           value="${betrag}" 
                           step="0.01"
                           min="0"
                           data-kg="${kg}">
                </td>
                <td class="kg-ratio-bgf">
                    ${kennzahlen.bgf > 0 ? formatNumber(betrag / kennzahlen.bgf) : '0,00'}
                </td>
                <td class="kg-ratio-bri">
                    ${kennzahlen.bri > 0 ? formatNumber(betrag / kennzahlen.bri) : '0,00'}
                </td>
                <td class="kg-ratio-wfl">
                    ${kennzahlen.wfl > 0 ? formatNumber(betrag / kennzahlen.wfl) : '0,00'}
                </td>
                <td class="kg-ratio-we">
                    ${kennzahlen.we > 0 ? formatNumber(betrag / kennzahlen.we) : '0,00'}
                </td>
                <td class="kg-hinweise">
                    <textarea class="kg-hinweise-input" 
                              data-kg="${kg}" 
                              rows="1" 
                              placeholder="Hinweise...">${Utils.validateString(kalkulation.hinweise)}</textarea>
                </td>
                <td class="kg-actions">
                    <button class="btn-icon" onclick="kalkulationModule.editKostengruppe('${kg}')" title="Bearbeiten">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="kalkulationModule.copyKostengruppe('${kg}')" title="Kopieren">
                        <i class="fas fa-copy"></i>
                    </button>
                    ${this.isCustomKostengruppe(kg) ? 
                        `<button class="btn-icon btn-danger" onclick="kalkulationModule.deleteCustomKostengruppe('${kg}')" title="Löschen">
                            <i class="fas fa-trash"></i>
                        </button>` : ''
                    }
                </td>
            `;

            // Event listeners für Inputs
            const betragInput = row.querySelector('.kg-betrag-input');
            const hinweiseInput = row.querySelector('.kg-hinweise-input');

            if (betragInput) {
                betragInput.addEventListener('input', (e) => {
                    this.updateKostengruppe(kg, 'betrag', parseFloat(e.target.value) || 0);
                });
            }

            if (hinweiseInput) {
                hinweiseInput.addEventListener('input', (e) => {
                    this.updateKostengruppe(kg, 'hinweise', e.target.value);
                });
            }

            // Toggle functionality for main groups
            if (isMainGroup) {
                const nameCell = row.querySelector('.kg-name');
                const toggleIcon = row.querySelector('.toggle-icon');
                
                if (nameCell && toggleIcon) {
                    nameCell.addEventListener('click', () => {
                        this.toggleKostengruppenGroup(kg, toggleIcon);
                    });
                }
            }

            return row;
        } catch (error) {
            Utils.handleError(error, `Creating row for KG ${kg}`);
            return Utils.createElement('tr'); // Empty fallback
        }
    }

    updateKennzahl(type, value) {
        if (!this.currentProject) return;

        try {
            this.currentProject.kennzahlen[type] = Utils.validateNumber(value);
            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Kennzahl aktualisiert', { type, value });
            
            // Update alle Ratios
            this.calculateKennzahlenRatios();
        } catch (error) {
            Utils.handleError(error, `Updating Kennzahl: ${type}`);
        }
    }

    updateKostengruppe(kg, field, value) {
        if (!this.currentProject) return;

        try {
            if (!this.currentProject.kalkulation[kg]) {
                this.currentProject.kalkulation[kg] = { name: '', betrag: 0, hinweise: '' };
            }

            if (field === 'betrag') {
                value = Utils.validateNumber(value);
            } else if (field === 'hinweise') {
                value = Utils.validateString(value, 0, 500);
            }

            this.currentProject.kalkulation[kg][field] = value;
            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Kostengruppe aktualisiert', { kg, field, value });

            // Update calculations
            this.calculateKennzahlenRatios();
            this.calculateTotals();

            // Auto-update Liquiditätsplanung wenn Beträge geändert werden
            if (field === 'betrag' && window.liquiditaetModule && window.liquiditaetModule.currentProject === this.currentProject) {
                this.debounceUtils.debounce(() => {
                    this.refreshLiquiditaetsplanung();
                }, 1000, 'liquiditaetUpdate');
            }
        } catch (error) {
            Utils.handleError(error, `Updating Kostengruppe: ${kg}`);
        }
    }

    refreshLiquiditaetsplanung() {
        try {
            if (window.liquiditaetModule && this.currentProject?.liquiditaetsplanung) {
                // Re-generate liquiditaetsplanung with current kalkulation data
                console.log('Auto-updating Liquiditätsplanung...');
                window.liquiditaetModule.generateLiquiditaetsplanung();
            }
        } catch (error) {
            Utils.handleError(error, 'Auto-refreshing Liquiditaetsplanung');
        }
    }

    calculateKennzahlenRatios() {
        if (!this.currentProject) return;

        try {
            const kennzahlen = this.currentProject.kennzahlen;
            const rows = Utils.findAllElements('#kg-tbody tr[data-kg]');

            rows.forEach(row => {
                const kg = row.dataset.kg;
                const kalkulation = this.currentProject.kalkulation[kg];
                const betrag = kalkulation ? Utils.validateNumber(kalkulation.betrag) : 0;

                // Update ratio cells
                const ratioUpdate = (selector, divisor) => {
                    const cell = row.querySelector(selector);
                    if (cell && divisor > 0) {
                        cell.textContent = formatNumber(betrag / divisor);
                    } else if (cell) {
                        cell.textContent = '0,00';
                    }
                };

                ratioUpdate('.kg-ratio-bgf', kennzahlen.bgf);
                ratioUpdate('.kg-ratio-bri', kennzahlen.bri);
                ratioUpdate('.kg-ratio-wfl', kennzahlen.wfl);
                ratioUpdate('.kg-ratio-we', kennzahlen.we);
            });
        } catch (error) {
            Utils.handleError(error, 'Calculating Kennzahlen Ratios');
        }
    }

    calculateTotals() {
        if (!this.currentProject) return;

        try {
            let totalSum = 0;
            const kgTotals = {};

            // Calculate totals per main group
            Object.entries(this.currentProject.kalkulation).forEach(([kg, data]) => {
                const betrag = Utils.validateNumber(data.betrag);
                const mainKg = kg.charAt(0) + '00';
                
                if (!kgTotals[mainKg]) kgTotals[mainKg] = 0;
                kgTotals[mainKg] += betrag;
                totalSum += betrag;
            });

            // Update display if totals row exists
            this.updateTotalsDisplay(totalSum, kgTotals);
            
        } catch (error) {
            Utils.handleError(error, 'Calculating Totals');
        }
    }

    updateTotalsDisplay(totalSum, kgTotals) {
        // Find or create totals row
        let totalsRow = Utils.findElement('#kg-tbody .totals-row');
        if (!totalsRow) {
            totalsRow = Utils.createElement('tr', 'totals-row');
            const tbody = Utils.findElement('#kg-tbody');
            if (tbody) {
                tbody.appendChild(totalsRow);
            }
        }

        const kennzahlen = this.currentProject.kennzahlen;
        
        totalsRow.innerHTML = `
            <td><strong>GESAMT</strong></td>
            <td><strong>Gesamtsumme</strong></td>
            <td><strong>${formatCurrency(totalSum)}</strong></td>
            <td><strong>${kennzahlen.bgf > 0 ? formatNumber(totalSum / kennzahlen.bgf) : '0,00'}</strong></td>
            <td><strong>${kennzahlen.bri > 0 ? formatNumber(totalSum / kennzahlen.bri) : '0,00'}</strong></td>
            <td><strong>${kennzahlen.wfl > 0 ? formatNumber(totalSum / kennzahlen.wfl) : '0,00'}</strong></td>
            <td><strong>${kennzahlen.we > 0 ? formatNumber(totalSum / kennzahlen.we) : '0,00'}</strong></td>
            <td></td>
            <td></td>
        `;
    }

    showReferenceModal() {
        try {
            if (!this.currentProject) {
                showNotification('Bitte wählen Sie zuerst ein Projekt aus', 'warning');
                return;
            }

            const modal = Utils.createModal({
                title: 'Referenzkalkulation basierend auf Kennzahlen',
                size: 'large',
                content: this.createReferenceModalContent(),
                buttons: [
                    {
                        text: 'Abbrechen',
                        className: 'btn-secondary',
                        action: 'cancel',
                        handler: () => Utils.closeModal(modal)
                    },
                    {
                        text: 'Übernehmen',
                        className: 'btn-primary',
                        action: 'apply',
                        handler: () => this.applyReferenceCalculation()
                    }
                ]
            });

            this.renderReferenceProjects(modal);
        } catch (error) {
            Utils.handleError(error, 'Opening Reference Modal');
        }
    }

    createReferenceModalContent() {
        return `
            <div class="reference-selection">
                <h4>Referenzprojekte auswählen (max. 3):</h4>
                <div id="reference-projects-list" class="reference-projects-list">
                    <!-- Referenzprojekte werden dynamisch geladen -->
                </div>
            </div>
            <div class="reference-preview">
                <h4>Kalkulation Vorschau:</h4>
                <div id="reference-preview-table">
                    <!-- Vorschau wird dynamisch generiert -->
                </div>
            </div>
        `;
    }

    renderReferenceProjects(modal) {
        try {
            const container = modal.querySelector('#reference-projects-list');
            if (!container) return;

            const availableProjects = window.app.projects.filter(p => 
                p.id !== this.currentProject.id && 
                p.kalkulation && 
                Object.keys(p.kalkulation).length > 0
            );

            if (availableProjects.length === 0) {
                container.innerHTML = '<p class="text-muted">Keine Referenzprojekte verfügbar</p>';
                return;
            }

            container.innerHTML = '';
            
            availableProjects.forEach(project => {
                const projectItem = Utils.createElement('div', 'reference-project-item');
                
                const totalCost = this.calculateProjectTotal(project);
                const bgf = project.kennzahlen?.bgf || 0;
                const wfl = project.kennzahlen?.wfl || 0;
                const grundstuecksflaeche = project.kennzahlen?.grundstuecksflaeche || 0;
                const costPerBGF = bgf > 0 ? totalCost / bgf : 0;
                const costPerWFL = wfl > 0 ? totalCost / wfl : 0;

                projectItem.innerHTML = `
                    <input type="checkbox" id="ref-${project.id}" value="${project.id}" class="reference-checkbox">
                    <div class="reference-project-details">
                        <div class="reference-project-name">${project.name}</div>
                        <div class="reference-project-metrics">
                            BGF: ${formatNumber(bgf)} m² | 
                            WFL: ${formatNumber(wfl)} m² | 
                            Grundstück: ${formatNumber(grundstuecksflaeche)} m²<br>
                            Gesamt: ${formatCurrency(totalCost)} | 
                            €/BGF: ${formatNumber(costPerBGF)} | 
                            €/WFL: ${formatNumber(costPerWFL)}
                        </div>
                    </div>
                `;

                projectItem.addEventListener('click', (e) => {
                    if (e.target.type !== 'checkbox') {
                        const checkbox = projectItem.querySelector('input[type="checkbox"]');
                        checkbox.checked = !checkbox.checked;
                    }
                    this.updateReferencePreview(modal);
                });

                const checkbox = projectItem.querySelector('input[type="checkbox"]');
                checkbox.addEventListener('change', () => {
                    // Limit to 3 selections
                    const checkedBoxes = modal.querySelectorAll('.reference-checkbox:checked');
                    if (checkedBoxes.length > 3) {
                        checkbox.checked = false;
                        showNotification('Maximal 3 Referenzprojekte können ausgewählt werden', 'warning');
                        return;
                    }
                    this.updateReferencePreview(modal);
                });

                container.appendChild(projectItem);
            });
        } catch (error) {
            Utils.handleError(error, 'Rendering Reference Projects');
        }
    }

    calculateProjectTotal(project) {
        if (!project.kalkulation) return 0;
        return Utils.sum(Object.values(project.kalkulation), 'betrag');
    }

    updateReferencePreview(modal) {
        try {
            const selectedProjects = this.getSelectedReferenceProjects(modal);
            if (selectedProjects.length === 0) {
                const previewContainer = modal.querySelector('#reference-preview-table');
                if (previewContainer) {
                    previewContainer.innerHTML = '<p class="text-muted">Wählen Sie Referenzprojekte aus</p>';
                }
                return;
            }

            const avgKalkulation = this.calculateAverageFromProjects(selectedProjects);
            this.renderReferencePreviewTable(avgKalkulation, modal);
        } catch (error) {
            Utils.handleError(error, 'Updating Reference Preview');
        }
    }

    getSelectedReferenceProjects(modal) {
        const checkedBoxes = modal.querySelectorAll('.reference-checkbox:checked');
        return Array.from(checkedBoxes).map(checkbox => {
            return window.app.projects.find(p => p.id === checkbox.value);
        }).filter(Boolean);
    }

    calculateAverageFromProjects(projects) {
        const avgKalkulation = {};
        const kostengruppenDefinition = this.getKostengruppenDefinition();

        Object.keys(kostengruppenDefinition).forEach(kg => {
            const values = projects
                .map(p => p.kalkulation[kg]?.betrag || 0)
                .filter(v => v > 0);
            
            avgKalkulation[kg] = values.length > 0 ? 
                values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        });

        // Adjust to current project's BGF
        const currentBGF = this.currentProject.kennzahlen?.bgf || 1;
        const avgBGF = projects.reduce((sum, p) => sum + (p.kennzahlen?.bgf || 0), 0) / projects.length;
        
        if (avgBGF > 0) {
            const factor = currentBGF / avgBGF;
            Object.keys(avgKalkulation).forEach(kg => {
                avgKalkulation[kg] *= factor;
            });
        }

        return avgKalkulation;
    }

    renderReferencePreviewTable(avgKalkulation, modal) {
        const previewContainer = modal.querySelector('#reference-preview-table');
        if (!previewContainer) return;

        const kostengruppenDefinition = this.getKostengruppenDefinition();
        const kennzahlen = this.currentProject.kennzahlen;

        let tableHTML = `
            <table class="calculation-table">
                <thead>
                    <tr>
                        <th>KG</th>
                        <th>Position</th>
                        <th>Betrag (€)</th>
                        <th>€/BGF</th>
                        <th>€/WFL</th>
                        <th>€/Grundstück</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.entries(avgKalkulation).forEach(([kg, betrag]) => {
            if (betrag > 0 && kostengruppenDefinition[kg]) {
                const definition = kostengruppenDefinition[kg];
                const isSubgroup = definition.parent !== undefined;
                const eurPerBGF = kennzahlen.bgf > 0 ? betrag / kennzahlen.bgf : 0;
                const eurPerWFL = kennzahlen.wfl > 0 ? betrag / kennzahlen.wfl : 0;
                const eurPerGrundstueck = kennzahlen.grundstuecksflaeche > 0 ? betrag / kennzahlen.grundstuecksflaeche : 0;

                tableHTML += `
                    <tr class="${isSubgroup ? 'kg-subgroup' : 'kg-main'}">
                        <td style="border-left: 3px solid ${definition.color};">${kg}</td>
                        <td>${isSubgroup ? '&nbsp;&nbsp;&nbsp;' : ''}${definition.name}</td>
                        <td class="text-right">${formatCurrency(betrag)}</td>
                        <td class="text-right">${formatNumber(eurPerBGF)}</td>
                        <td class="text-right">${formatNumber(eurPerWFL)}</td>
                        <td class="text-right">${formatNumber(eurPerGrundstueck)}</td>
                    </tr>
                `;
            }
        });

        const total = Utils.sum(Object.values(avgKalkulation));
        const totalPerBGF = kennzahlen.bgf > 0 ? total / kennzahlen.bgf : 0;
        const totalPerWFL = kennzahlen.wfl > 0 ? total / kennzahlen.wfl : 0;
        const totalPerGrundstueck = kennzahlen.grundstuecksflaeche > 0 ? total / kennzahlen.grundstuecksflaeche : 0;

        tableHTML += `
                    <tr class="totals-row">
                        <td><strong>GESAMT</strong></td>
                        <td><strong>Gesamtsumme</strong></td>
                        <td class="text-right"><strong>${formatCurrency(total)}</strong></td>
                        <td class="text-right"><strong>${formatNumber(totalPerBGF)}</strong></td>
                        <td class="text-right"><strong>${formatNumber(totalPerWFL)}</strong></td>
                        <td class="text-right"><strong>${formatNumber(totalPerGrundstueck)}</strong></td>
                    </tr>
                </tbody>
            </table>
        `;

        previewContainer.innerHTML = tableHTML;
    }

    applyReferenceCalculation() {
        try {
            const modal = document.querySelector('.modal.show');
            if (!modal) return;

            const selectedProjects = this.getSelectedReferenceProjects(modal);
            if (selectedProjects.length === 0) {
                showNotification('Bitte wählen Sie mindestens ein Referenzprojekt aus', 'warning');
                return;
            }

            const avgKalkulation = this.calculateAverageFromProjects(selectedProjects);
            
            // Apply to current project
            Object.entries(avgKalkulation).forEach(([kg, betrag]) => {
                if (betrag > 0) {
                    if (!this.currentProject.kalkulation[kg]) {
                        const definition = this.getKostengruppenDefinition()[kg];
                        this.currentProject.kalkulation[kg] = {
                            name: definition?.name || '',
                            betrag: 0,
                            hinweise: ''
                        };
                    }
                    this.currentProject.kalkulation[kg].betrag = Math.round(betrag);
                }
            });

            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Referenzkalkulation angewandt', {
                referenceProjects: selectedProjects.map(p => p.name),
                totalAmount: Utils.sum(Object.values(avgKalkulation))
            });

            this.renderKostengruppen();
            Utils.closeModal(modal);
            showNotification('Referenzkalkulation erfolgreich übernommen', 'success');
        } catch (error) {
            Utils.handleError(error, 'Applying Reference Calculation');
        }
    }

    editKostengruppe(kg) {
        try {
            const kalkulation = this.currentProject.kalkulation[kg];
            if (!kalkulation) return;

            const modal = Utils.createModal({
                title: `Kostengruppe ${kg} bearbeiten`,
                content: `
                    <form id="kg-edit-form">
                        <div class="form-group">
                            <label>Bezeichnung:</label>
                            <input type="text" name="name" value="${kalkulation.name}" readonly>
                        </div>
                        <div class="form-group">
                            <label>Betrag (€):</label>
                            <input type="number" name="betrag" value="${kalkulation.betrag || 0}" step="0.01" min="0">
                        </div>
                        <div class="form-group">
                            <label>Hinweise:</label>
                            <textarea name="hinweise" rows="3">${kalkulation.hinweise || ''}</textarea>
                        </div>
                    </form>
                `,
                buttons: [
                    {
                        text: 'Abbrechen',
                        className: 'btn-secondary',
                        handler: () => Utils.closeModal(modal)
                    },
                    {
                        text: 'Speichern',
                        className: 'btn-primary',
                        handler: () => {
                            const form = modal.querySelector('#kg-edit-form');
                            const formData = Utils.serializeForm(form);
                            
                            this.updateKostengruppe(kg, 'betrag', parseFloat(formData.betrag) || 0);
                            this.updateKostengruppe(kg, 'hinweise', formData.hinweise);
                            
                            this.renderKostengruppen();
                            Utils.closeModal(modal);
                            showNotification('Kostengruppe aktualisiert', 'success');
                        }
                    }
                ]
            });
        } catch (error) {
            Utils.handleError(error, `Editing Kostengruppe: ${kg}`);
        }
    }

    copyKostengruppe(kg) {
        try {
            const kalkulation = this.currentProject.kalkulation[kg];
            if (!kalkulation) return;

            const data = {
                kg: kg,
                name: kalkulation.name,
                betrag: kalkulation.betrag,
                hinweise: kalkulation.hinweise
            };

            navigator.clipboard.writeText(JSON.stringify(data)).then(() => {
                showNotification(`Kostengruppe ${kg} in Zwischenablage kopiert`, 'success');
            });
        } catch (error) {
            Utils.handleError(error, `Copying Kostengruppe: ${kg}`);
        }
    }

    exportKalkulation() {
        try {
            if (!this.currentProject) {
                showNotification('Kein Projekt ausgewählt', 'warning');
                return;
            }

            const data = {
                projektName: this.currentProject.name,
                kennzahlen: this.currentProject.kennzahlen,
                kalkulation: this.currentProject.kalkulation,
                gesamt: this.calculateProjectTotal(this.currentProject),
                exportiert: new Date().toISOString()
            };

            const filename = Utils.generateFilename(this.currentProject.name, 'kalkulation');
            Utils.downloadJSON(data, filename);
            showNotification('Kalkulation erfolgreich exportiert', 'success');
        } catch (error) {
            Utils.handleError(error, 'Exporting Kalkulation');
        }
    }

    addCustomKostengruppe() {
        try {
            if (!this.currentProject) {
                showNotification('Bitte wählen Sie zuerst ein Projekt aus', 'warning');
                return;
            }

            const modal = Utils.createModal({
                title: 'Neue Kostengruppe hinzufügen',
                content: `
                    <form id="add-kg-form">
                        <div class="form-group">
                            <label>KG-Nummer:</label>
                            <input type="text" name="kg" placeholder="z.B. 399, 499, 799" required pattern="[0-9]+" maxlength="3">
                            <small class="form-text">Geben Sie eine eindeutige 3-stellige Nummer ein</small>
                        </div>
                        <div class="form-group">
                            <label>Bezeichnung:</label>
                            <input type="text" name="name" placeholder="Bezeichnung der Kostengruppe" required maxlength="100">
                        </div>
                        <div class="form-group">
                            <label>Hauptgruppe zuordnen:</label>
                            <select name="parent">
                                <option value="">Neue Hauptgruppe</option>
                                <option value="100">100 - Grundstück</option>
                                <option value="200">200 - Herrichten und Erschließen</option>
                                <option value="250">250 - Maßnahmen LVB</option>
                                <option value="300">300 - Bauwerk - Baukonstruktion</option>
                                <option value="400">400 - Bauwerk - Technische Anlagen</option>
                                <option value="500">500 - Außenanlagen</option>
                                <option value="600">600 - Ausstattung und Kunstwerke</option>
                                <option value="700">700 - Baunebenkosten</option>
                                <option value="800">800 - Finanzierung</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Farbe:</label>
                            <input type="color" name="color" value="#3498db">
                        </div>
                        <div class="form-group">
                            <label>Betrag (€):</label>
                            <input type="number" name="betrag" value="0" step="0.01" min="0">
                        </div>
                        <div class="form-group">
                            <label>Hinweise:</label>
                            <textarea name="hinweise" rows="2" placeholder="Optionale Hinweise"></textarea>
                        </div>
                    </form>
                `,
                buttons: [
                    {
                        text: 'Abbrechen',
                        className: 'btn-secondary',
                        handler: () => Utils.closeModal(modal)
                    },
                    {
                        text: 'Hinzufügen',
                        className: 'btn-primary',
                        handler: () => this.saveCustomKostengruppe(modal)
                    }
                ]
            });
        } catch (error) {
            Utils.handleError(error, 'Adding Custom Kostengruppe');
        }
    }

    saveCustomKostengruppe(modal) {
        try {
            const form = modal.querySelector('#add-kg-form');
            const formData = Utils.serializeForm(form);

            // Validate KG number
            if (!formData.kg || !formData.kg.match(/^[0-9]{3}$/)) {
                showNotification('Bitte geben Sie eine gültige 3-stellige KG-Nummer ein', 'error');
                return;
            }

            // Check if KG already exists
            if (this.getKostengruppenDefinition()[formData.kg] || this.currentProject.kalkulation[formData.kg]) {
                showNotification(`Kostengruppe ${formData.kg} existiert bereits`, 'error');
                return;
            }

            if (!formData.name.trim()) {
                showNotification('Bitte geben Sie eine Bezeichnung ein', 'error');
                return;
            }

            // Add to project's custom kostengruppen
            if (!this.currentProject.customKostengruppen) {
                this.currentProject.customKostengruppen = {};
            }

            const customKG = {
                name: formData.name.trim(),
                color: formData.color || '#3498db',
                parent: formData.parent || undefined
            };

            this.currentProject.customKostengruppen[formData.kg] = customKG;

            // Add to kalkulation with initial values
            this.currentProject.kalkulation[formData.kg] = {
                name: customKG.name,
                betrag: parseFloat(formData.betrag) || 0,
                hinweise: formData.hinweise || ''
            };

            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Kostengruppe hinzugefügt', {
                kg: formData.kg,
                name: formData.name,
                betrag: parseFloat(formData.betrag) || 0
            });

            this.renderKostengruppen();
            Utils.closeModal(modal);
            showNotification(`Kostengruppe ${formData.kg} erfolgreich hinzugefügt`, 'success');

            // Auto-update Liquiditätsplanung wenn vorhanden
            if (window.liquiditaetModule && this.currentProject?.liquiditaetsplanung) {
                this.debounceUtils.debounce(() => {
                    this.refreshLiquiditaetsplanung();
                }, 500, 'liquiditaetUpdateNew');
            }
        } catch (error) {
            Utils.handleError(error, 'Saving Custom Kostengruppe');
        }
    }

    isCustomKostengruppe(kg) {
        return this.currentProject?.customKostengruppen?.[kg] !== undefined;
    }

    deleteCustomKostengruppe(kg) {
        try {
            if (!this.currentProject) return;

            if (!this.isCustomKostengruppe(kg)) {
                showNotification(`Kostengruppe ${kg} ist keine benutzerdefinierte Kostengruppe`, 'warning');
                return;
            }

            const confirm = confirm('Möchten Sie diese Kostengruppe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.');
            if (!confirm) return;

            // Remove from project's custom kostengruppen
            if (this.currentProject.customKostengruppen) {
                delete this.currentProject.customKostengruppen[kg];
            }

            // Remove from kalkulation
            if (this.currentProject.kalkulation[kg]) {
                delete this.currentProject.kalkulation[kg];
            }

            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Kostengruppe gelöscht', { kg });

            this.renderKostengruppen();
            showNotification(`Kostengruppe ${kg} erfolgreich gelöscht`, 'success');

            // Auto-update Liquiditätsplanung wenn vorhanden
            if (window.liquiditaetModule && this.currentProject?.liquiditaetsplanung) {
                this.debounceUtils.debounce(() => {
                    this.refreshLiquiditaetsplanung();
                }, 500, 'liquiditaetUpdateDelete');
            }
        } catch (error) {
            Utils.handleError(error, `Deleting Kostengruppe: ${kg}`);
        }
    }

    toggleKostengruppenGroup(kg, toggleIcon) {
        try {
            const tbody = Utils.findElement('#kg-tbody');
            if (!tbody) return;

            // Find all subgroups that belong to this main group
            const subGroups = tbody.querySelectorAll(`tr[data-parent="${kg}"]`);
            
            // Check current state of first subgroup to determine action
            const firstSubGroup = subGroups[0];
            const shouldExpand = !firstSubGroup || firstSubGroup.style.display === 'none' || firstSubGroup.style.display === '';

            subGroups.forEach(subGroup => {
                if (shouldExpand) {
                    subGroup.style.display = 'table-row';
                } else {
                    subGroup.style.display = 'none';
                }
            });

            // Update toggle icon
            if (toggleIcon) {
                if (shouldExpand) {
                    toggleIcon.classList.remove('fa-chevron-right');
                    toggleIcon.classList.add('fa-chevron-down');
                } else {
                    toggleIcon.classList.remove('fa-chevron-down');
                    toggleIcon.classList.add('fa-chevron-right');
                }
            }
        } catch (error) {
            Utils.handleError(error, `Toggling Kostengruppen Group: ${kg}`);
        }
    }
}

// Export for global access
window.KalkulationModule = KalkulationModule; 