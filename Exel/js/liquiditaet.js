/**
 * Liquiditätsplanung Module
 * Quartalsweise Verteilung der Kosten über Planungs- und Bauzeit
 */

class LiquiditaetModule {
    constructor() {
        this.currentProject = null;
        this.debounceUtils = new Utils();
        this.init();
    }

    init() {
        try {
            this.setupEventListeners();
        } catch (error) {
            Utils.handleError(error, 'Liquiditaet Module Initialization');
        }
    }

    setupEventListeners() {
        try {
            // Generate Liquiditätsplanung Button
            const generateBtn = Utils.findElement('#generate-liquiditaet-btn');
            if (generateBtn) {
                generateBtn.addEventListener('click', () => this.generateLiquiditaetsplanung());
            }

            // Sync with Kalkulation Button
            const syncBtn = Utils.findElement('#sync-liquiditaet-btn');
            if (syncBtn) {
                syncBtn.addEventListener('click', () => this.syncWithKalkulation());
            }

            // Export Liquiditätsplanung Button
            const exportBtn = Utils.findElement('#export-liquiditaet-btn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportLiquiditaetsplanung());
            }

            // Settings change handlers
            ['project-start-date', 'project-duration', 'planning-duration'].forEach(id => {
                const element = Utils.findElement(`#${id}`);
                if (element) {
                    element.addEventListener('change', () => {
                        this.debounceUtils.debounce(() => {
                            if (this.currentProject?.liquiditaetsplanung) {
                                this.generateLiquiditaetsplanung();
                            }
                        }, 500, 'settings-change');
                    });
                }
            });
        } catch (error) {
            Utils.handleError(error, 'Setting up Liquiditaet Event Listeners');
        }
    }

    loadProject(project) {
        try {
            this.currentProject = project;
            if (project) {
                this.loadProjectSettings();
                this.renderLiquiditaetsplanung();
                showNotification(`Liquiditätsplanung für "${project.name}" geladen`, 'success');
            }
        } catch (error) {
            Utils.handleError(error, 'Loading Project in Liquiditaet');
        }
    }

    loadProjectSettings() {
        if (!this.currentProject) return;

        try {
            // Load saved settings or set defaults
            const settings = this.currentProject.liquiditaetsSettings || {};
            
            const startDate = settings.startDate || new Date().toISOString().split('T')[0];
            const duration = Utils.validateNumber(settings.duration, 1, 120) || 24;
            const planningDuration = Utils.validateNumber(settings.planningDuration, 1, 24) || 6;

            const startDateInput = Utils.findElement('#project-start-date');
            const durationInput = Utils.findElement('#project-duration');
            const planningInput = Utils.findElement('#planning-duration');

            if (startDateInput) startDateInput.value = startDate;
            if (durationInput) durationInput.value = duration;
            if (planningInput) planningInput.value = planningDuration;
        } catch (error) {
            Utils.handleError(error, 'Loading Project Settings');
        }
    }

    generateLiquiditaetsplanung() {
        try {
            if (!this.currentProject) {
                showNotification('Bitte wählen Sie zuerst ein Projekt aus', 'warning');
                return;
            }

            // Get settings
            const startDateInput = Utils.findElement('#project-start-date');
            const durationInput = Utils.findElement('#project-duration');
            const planningInput = Utils.findElement('#planning-duration');

            if (!startDateInput?.value) {
                showNotification('Bitte Projektstart-Datum auswählen', 'warning');
                return;
            }

            const startDate = new Date(startDateInput.value);
            const duration = Utils.validateNumber(durationInput?.value, 1, 120) || 24;
            const planningDuration = Utils.validateNumber(planningInput?.value, 1, 24) || 6;

            if (isNaN(startDate.getTime())) {
                showNotification('Ungültiges Startdatum', 'warning');
                return;
            }

            // Save settings
            this.currentProject.liquiditaetsSettings = {
                startDate: startDate.toISOString().split('T')[0],
                duration,
                planningDuration
            };

            // Generate planning data
            const liquiditaetsplanung = this.createLiquiditaetsplanung(startDate, duration, planningDuration);
            this.currentProject.liquiditaetsplanung = liquiditaetsplanung;
            
            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Liquiditätsplanung generiert', {
                startDate: startDate.toISOString().split('T')[0],
                duration,
                planningDuration
            });

            this.renderLiquiditaetsplanung();
            showNotification('Liquiditätsplanung erfolgreich generiert', 'success');
        } catch (error) {
            Utils.handleError(error, 'Generating Liquiditaetsplanung');
        }
    }

    createLiquiditaetsplanung(startDate, duration, planningDuration) {
        try {
            const quarters = this.generateQuarters(startDate, duration);
            const kostenverteilung = this.distributeKosten(quarters, planningDuration);
            
            return {
                startDate: startDate.toISOString().split('T')[0],
                duration,
                planningDuration,
                quarters,
                kostenverteilung,
                generated: new Date().toISOString()
            };
        } catch (error) {
            Utils.handleError(error, 'Creating Liquiditaetsplanung');
            return null;
        }
    }

    generateQuarters(startDate, durationMonths) {
        const quarters = [];
        const start = new Date(startDate);
        
        // Calculate number of quarters needed
        const quarterCount = Math.ceil(durationMonths / 3);
        
        for (let i = 0; i < quarterCount; i++) {
            const quarterStart = new Date(start);
            quarterStart.setMonth(start.getMonth() + (i * 3));
            
            const quarterEnd = new Date(quarterStart);
            quarterEnd.setMonth(quarterStart.getMonth() + 3);
            quarterEnd.setDate(quarterEnd.getDate() - 1);
            
            const year = quarterStart.getFullYear();
            const quarter = Math.floor(quarterStart.getMonth() / 3) + 1;
            
            quarters.push({
                id: `Q${quarter}.${year}`,
                name: `Q${quarter} ${year}`,
                start: quarterStart.toISOString().split('T')[0],
                end: quarterEnd.toISOString().split('T')[0],
                year,
                quarter
            });
        }
        
        return quarters;
    }

    distributeKosten(quarters, planningDuration) {
        const distribution = {};
        const kostengruppen = this.getKostengruppenForDistribution();
        
        kostengruppen.forEach(kg => {
            let betrag = 0;
            
            // Behandle kombinierte Kostengruppen (z.B. 300+400)
            if (kg.combined) {
                betrag = kg.combined.reduce((sum, kgNr) => {
                    const kgData = this.currentProject.kalkulation[kgNr];
                    return sum + (kgData ? Utils.validateNumber(kgData.betrag) : 0);
                }, 0);
            } else {
                // Normale Kostengruppe
                const kgData = this.currentProject.kalkulation[kg.nr];
                betrag = kgData ? Utils.validateNumber(kgData.betrag) : 0;
            }
            
            if (betrag === 0) return;
            
            const quarterDistribution = this.calculateQuarterDistribution(kg, betrag, quarters, planningDuration);
            
            distribution[kg.nr] = {
                name: kg.name || (this.currentProject.kalkulation[kg.nr]?.name) || kg.nr,
                totalBetrag: betrag,
                quarters: quarterDistribution,
                isGroup: kg.isGroup || false,
                parent: kg.parent || null,
                combined: kg.combined || null
            };
        });
        
        return distribution;
    }

    getKostengruppenForDistribution() {
        // Get all available Kostengruppen from current project
        const availableKGs = Object.keys(this.currentProject?.kalkulation || {});
        const predefinedKGs = this.getPredefinedKGSettings();
        const result = [];

        // Add all available KGs from project
        availableKGs.forEach(kg => {
            const predefined = predefinedKGs.find(p => p.nr === kg);
            if (predefined) {
                // Use predefined settings
                result.push(predefined);
            } else {
                // Create default settings based on KG number
                result.push(this.createDefaultKGSettings(kg));
            }
        });

        // Add combined KGs (like 300+400) if their components exist
        const combinedKGs = this.getCombinedKGSettings();
        combinedKGs.forEach(combined => {
            const hasAllComponents = combined.combined.every(kgNr => availableKGs.includes(kgNr));
            if (hasAllComponents) {
                result.push(combined);
            }
        });

        return result;
    }

    getPredefinedKGSettings() {
        return [
            // KG 100 - Grundstück
            { nr: '100', name: 'Grundstück', phase: 'planning', distribution: 'front-loaded', isGroup: true },
            { nr: '110', name: 'Grundstückswert', phase: 'planning', distribution: 'front-loaded', parent: '100' },
            { nr: '111', name: 'Grundstücksnebenkosten', phase: 'planning', distribution: 'front-loaded', parent: '100' },
            { nr: '112', name: 'Makler', phase: 'planning', distribution: 'front-loaded', parent: '100' },
            { nr: '113', name: 'Freimachen Abriss Altlasten', phase: 'construction', distribution: 'early', parent: '100' },
            
            // KG 200 - Herrichten und Erschließen
            { nr: '200', name: 'Herrichten und Erschließen', phase: 'construction', distribution: 'early' },
            { nr: '210', name: 'Fernwärme - Hausanschluss', phase: 'construction', distribution: 'early', parent: '200' },
            { nr: '211', name: 'TW/AW-Hausanschluss inkl. Bauwasser', phase: 'construction', distribution: 'early', parent: '200' },
            { nr: '212', name: 'Strom-Hausanschluss', phase: 'construction', distribution: 'early', parent: '200' },
            { nr: '213', name: 'Telefon/TV-Anschluss', phase: 'construction', distribution: 'early', parent: '200' },
            
            // KG 250 - Maßnahmen LVB
            { nr: '250', name: 'Maßnahmen LVB', phase: 'planning', distribution: 'front-loaded' },
            
            // KG 300 - Bauwerk - Baukonstruktion
            { nr: '300', name: 'Bauwerk - Baukonstruktion', phase: 'construction', distribution: 'linear', isGroup: true },
            
            // KG 400 - Bauwerk - Technische Anlagen
            { nr: '400', name: 'Bauwerk - Technische Anlagen', phase: 'construction', distribution: 'linear', isGroup: true },
            
            // KG 500 - Außenanlagen
            { nr: '500', name: 'Außenanlagen', phase: 'construction', distribution: 'late' },
            { nr: '510', name: 'Außenanlagen', phase: 'construction', distribution: 'late', parent: '500' },
            
            // KG 600 - Ausstattung
            { nr: '600', name: 'Ausstattung und Kunstwerke', phase: 'construction', distribution: 'end', isGroup: true },
            { nr: '610', name: 'Ausstattung und Kunstwerke', phase: 'construction', distribution: 'end', parent: '600' },
            
            // KG 700 - Baunebenkosten (detailliert)
            { nr: '700', name: 'Baunebenkosten', phase: 'both', distribution: 'linear', isGroup: true },
            { nr: '710', name: 'Bauherrenaufgaben Regiekosten', phase: 'both', distribution: 'linear', parent: '700' },
            { nr: '711', name: 'Bauherrenaufgaben Regiekosten', phase: 'both', distribution: 'linear', parent: '700' },
            { nr: '720', name: 'Architekten und Ingenieure', phase: 'both', distribution: 'planning-heavy', parent: '700' },
            { nr: '721', name: 'Vorplanung', phase: 'planning', distribution: 'front-loaded', parent: '700' },
            { nr: '722', name: 'Architekten', phase: 'both', distribution: 'planning-heavy', parent: '700' },
            { nr: '723', name: 'Statik', phase: 'both', distribution: 'planning-heavy', parent: '700' },
            { nr: '724', name: 'HLS Planung', phase: 'both', distribution: 'planning-heavy', parent: '700' },
            { nr: '725', name: 'ELT Planung', phase: 'both', distribution: 'planning-heavy', parent: '700' },
            { nr: '726', name: 'Bauphysik', phase: 'both', distribution: 'planning-heavy', parent: '700' },
            { nr: '727', name: 'Ausschreibung', phase: 'planning', distribution: 'front-loaded', parent: '700' },
            { nr: '740', name: 'Gutachten und Beratung', phase: 'both', distribution: 'early', parent: '700' },
            { nr: '750', name: 'Vertrieb/Finanzierung', phase: 'both', distribution: 'linear', parent: '700' },
            { nr: '760', name: 'Allgemeine Baunebenkosten', phase: 'both', distribution: 'linear', parent: '700' },
            
            // KG 800 - Finanzierung
            { nr: '800', name: 'Finanzierung', phase: 'both', distribution: 'linear' }
        ];
    }

    getCombinedKGSettings() {
        return [
            // KG 300+400 - Bauwerk (kombiniert)
            { nr: '300+400', name: 'Bauwerk - Baukonstruktion + Technische Anlagen', phase: 'construction', distribution: 'linear', combined: ['300', '400'] }
        ];
    }

    createDefaultKGSettings(kg) {
        // Create default settings based on KG number patterns
        const kgNumber = parseInt(kg);
        const mainGroup = Math.floor(kgNumber / 100) * 100;
        
        let phase, distribution, parent;
        
        // Determine phase and distribution based on main group
        switch (mainGroup) {
            case 100: // Grundstück
                phase = 'planning';
                distribution = 'front-loaded';
                parent = kgNumber > 100 ? '100' : undefined;
                break;
            case 200: // Herrichten und Erschließen
                phase = 'construction';
                distribution = 'early';
                parent = kgNumber > 200 ? '200' : undefined;
                break;
            case 300: // Baukonstruktion
                phase = 'construction';
                distribution = 'linear';
                parent = kgNumber > 300 ? '300' : undefined;
                break;
            case 400: // Technische Anlagen
                phase = 'construction';
                distribution = 'linear';
                parent = kgNumber > 400 ? '400' : undefined;
                break;
            case 500: // Außenanlagen
                phase = 'construction';
                distribution = 'late';
                parent = kgNumber > 500 ? '500' : undefined;
                break;
            case 600: // Ausstattung
                phase = 'construction';
                distribution = 'end';
                parent = kgNumber > 600 ? '600' : undefined;
                break;
            case 700: // Baunebenkosten
                phase = 'both';
                distribution = 'linear';
                parent = kgNumber > 700 ? '700' : undefined;
                break;
            case 800: // Finanzierung
                phase = 'both';
                distribution = 'linear';
                break;
            default:
                phase = 'construction';
                distribution = 'linear';
        }

        // Get name from kalkulation data
        const kgData = this.currentProject?.kalkulation?.[kg];
        const name = kgData?.name || `Kostengruppe ${kg}`;

        return {
            nr: kg,
            name: name,
            phase: phase,
            distribution: distribution,
            parent: parent,
            isGroup: kgNumber % 100 === 0 && kgNumber < 800
        };
    }

    calculateQuarterDistribution(kg, totalBetrag, quarters, planningDuration) {
        const quarterDistribution = {};
        const planningQuarters = Math.ceil(planningDuration / 3);
        const constructionStart = planningQuarters;
        
        // Initialize all quarters to 0
        quarters.forEach(quarter => {
            quarterDistribution[quarter.id] = 0;
        });
        
        if (totalBetrag === 0) return quarterDistribution;
        
        // Distribute based on cost group type and phase
        switch (kg.phase) {
            case 'planning':
                this.distributePlanningCosts(quarterDistribution, quarters, totalBetrag, planningQuarters);
                break;
                
            case 'construction':
                this.distributeConstructionCosts(quarterDistribution, quarters, totalBetrag, constructionStart, kg.distribution);
                break;
                
            case 'both':
                const planningPortion = totalBetrag * 0.3;
                const constructionPortion = totalBetrag * 0.7;
                this.distributePlanningCosts(quarterDistribution, quarters, planningPortion, planningQuarters);
                this.distributeConstructionCosts(quarterDistribution, quarters, constructionPortion, constructionStart, kg.distribution);
                break;
                
            case 'planning-heavy':
                // 70% in Planungsphase, 30% in Bauphase (für Architekten/Ingenieure)
                const planningHeavy = totalBetrag * 0.7;
                const constructionLight = totalBetrag * 0.3;
                this.distributePlanningCosts(quarterDistribution, quarters, planningHeavy, planningQuarters);
                this.distributeConstructionCosts(quarterDistribution, quarters, constructionLight, constructionStart, 'early');
                break;
        }
        
        return quarterDistribution;
    }

    distributePlanningCosts(quarterDistribution, quarters, betrag, planningQuarters) {
        if (planningQuarters === 0) return;
        
        const availableQuarters = quarters.slice(0, planningQuarters);
        if (availableQuarters.length === 0) return;
        
        // Front-loaded distribution for planning costs
        const totalWeights = availableQuarters.length + 1;
        availableQuarters.forEach((quarter, index) => {
            const weight = availableQuarters.length - index;
            quarterDistribution[quarter.id] = (betrag * weight) / totalWeights;
        });
    }

    distributeConstructionCosts(quarterDistribution, quarters, betrag, startQuarter, distributionType) {
        const constructionQuarters = quarters.slice(startQuarter);
        if (constructionQuarters.length === 0) return;
        
        switch (distributionType) {
            case 'linear':
                const amountPerQuarter = betrag / constructionQuarters.length;
                constructionQuarters.forEach(quarter => {
                    quarterDistribution[quarter.id] += amountPerQuarter;
                });
                break;
                
            case 'early':
                // 60% in first half, 40% in second half
                const firstHalf = constructionQuarters.slice(0, Math.ceil(constructionQuarters.length / 2));
                const secondHalf = constructionQuarters.slice(Math.ceil(constructionQuarters.length / 2));
                
                firstHalf.forEach(quarter => {
                    quarterDistribution[quarter.id] += (betrag * 0.6) / firstHalf.length;
                });
                
                secondHalf.forEach(quarter => {
                    quarterDistribution[quarter.id] += (betrag * 0.4) / secondHalf.length;
                });
                break;
                
            case 'late':
                // 40% in first half, 60% in second half
                const firstHalfLate = constructionQuarters.slice(0, Math.ceil(constructionQuarters.length / 2));
                const secondHalfLate = constructionQuarters.slice(Math.ceil(constructionQuarters.length / 2));
                
                firstHalfLate.forEach(quarter => {
                    quarterDistribution[quarter.id] += (betrag * 0.4) / firstHalfLate.length;
                });
                
                secondHalfLate.forEach(quarter => {
                    quarterDistribution[quarter.id] += (betrag * 0.6) / secondHalfLate.length;
                });
                break;
                
            case 'end':
                // 80% in last 25% of construction time
                const endQuarters = constructionQuarters.slice(-Math.max(1, Math.ceil(constructionQuarters.length * 0.25)));
                const remainingQuarters = constructionQuarters.slice(0, -endQuarters.length);
                
                remainingQuarters.forEach(quarter => {
                    quarterDistribution[quarter.id] += (betrag * 0.2) / remainingQuarters.length;
                });
                
                endQuarters.forEach(quarter => {
                    quarterDistribution[quarter.id] += (betrag * 0.8) / endQuarters.length;
                });
                break;
                
            default:
                // Fallback to linear
                const defaultAmount = betrag / constructionQuarters.length;
                constructionQuarters.forEach(quarter => {
                    quarterDistribution[quarter.id] += defaultAmount;
                });
        }
    }

    renderLiquiditaetsplanung() {
        try {
            const tableContainer = Utils.findElement('.table-container #liquiditaet-table');
            if (!tableContainer) return;

            if (!this.currentProject?.liquiditaetsplanung) {
                this.renderEmptyLiquiditaetsplanung();
                return;
            }

            const { quarters, kostenverteilung } = this.currentProject.liquiditaetsplanung;
            
            // Update table header
            const thead = tableContainer.querySelector('thead');
            if (thead) {
                this.updateTableHeader(thead, quarters);
            }

            // Update table body
            let tbody = tableContainer.querySelector('tbody');
            if (!tbody) {
                tbody = Utils.createElement('tbody');
                tbody.id = 'liquiditaet-tbody';
                tableContainer.appendChild(tbody);
            } else {
                tbody.innerHTML = '';
                tbody.id = 'liquiditaet-tbody';
            }
            
            this.renderKostengruppenRows(tbody, quarters, kostenverteilung);
            this.addTotalRow(tbody, quarters, kostenverteilung);
            
            console.log('Liquiditätsplanung gerendert:', {
                quarters: quarters.length,
                kostengruppen: Object.keys(kostenverteilung).length,
                gesamtsumme: this.calculateTotalAmount(kostenverteilung)
            });
        } catch (error) {
            Utils.handleError(error, 'Rendering Liquiditaetsplanung');
        }
    }

    renderEmptyLiquiditaetsplanung() {
        const tableContainer = Utils.findElement('.table-container #liquiditaet-table');
        if (!tableContainer) return;

        const tbody = tableContainer.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="100%" class="text-center text-muted" style="padding: 2rem;">
                        Keine Liquiditätsplanung vorhanden. Klicken Sie auf "Automatisch generieren" um zu beginnen.
                    </td>
                </tr>
            `;
        }
    }

    updateTableHeader(thead, quarters) {
        const headerRow = thead.querySelector('tr');
        if (!headerRow) return;

        headerRow.innerHTML = `
            <th>KGR</th>
            <th>Positionsbezeichnung</th>
            <th>Gesamt Kosten</th>
            ${quarters.map(quarter => 
                `<th class="quarter-header">${quarter.name}</th>`
            ).join('')}
            <th>Summe</th>
        `;
    }

    renderKostengruppenRows(tbody, quarters, kostenverteilung) {
        const kostengruppenDef = this.getKostengruppenForDistribution();
        
        // Filtere bereits verwendete einzelne KGs in kombinierten Gruppen
        const usedInCombined = new Set();
        kostengruppenDef.forEach(kgDef => {
            if (kgDef.combined) {
                kgDef.combined.forEach(kg => usedInCombined.add(kg));
            }
        });
        
        kostengruppenDef.forEach(kgDef => {
            const kgData = kostenverteilung[kgDef.nr];
            if (!kgData || kgData.totalBetrag === 0) return;

            // Überspringe einzelne KGs die bereits in kombinierten Gruppen enthalten sind
            if (!kgDef.combined && usedInCombined.has(kgDef.nr)) {
                return;
            }

            const row = Utils.createElement('tr');
            row.dataset.kg = kgDef.nr;
            
            // Bestimme Einrückung basierend auf Hierarchie
            const isSubgroup = kgDef.parent !== undefined;
            const isGroup = kgDef.isGroup;
            const isCombined = kgDef.combined !== undefined;
            const indentation = isSubgroup ? '&nbsp;&nbsp;&nbsp;&nbsp;' : '';
            const rowClass = isGroup ? 'kg-group-row' : (isSubgroup ? 'kg-subgroup-row' : 'kg-main-row');
            row.className = rowClass;
            
            let rowHTML = `
                <td class="kg-designation">
                    <strong>${kgDef.nr}</strong>
                </td>
                <td class="kg-name">
                    ${indentation}${isGroup || isCombined ? '<strong>' : ''}${kgData.name}${isGroup || isCombined ? '</strong>' : ''}
                    ${kgData.combined ? '<br><small class="text-muted">(Kombiniert: KG ' + kgData.combined.join(' + KG ') + ')</small>' : ''}
                </td>
                <td class="kg-total">
                    ${isGroup || isCombined ? '<strong>' : ''}${formatCurrency(kgData.totalBetrag)}${isGroup || isCombined ? '</strong>' : ''}
                </td>
            `;

            // Berechne Quartal-Summe für Validierung
            let quarterSum = 0;
            quarters.forEach(quarter => {
                const amount = kgData.quarters[quarter.id] || 0;
                quarterSum += amount;
                const formattedAmount = amount > 0 ? Math.round(amount) : 0;
                
                rowHTML += `
                    <td class="quarter-cell">
                        ${isGroup ? '<strong>' : ''}
                        <input type="number" 
                               class="quarter-input ${isGroup ? 'group-input' : ''}" 
                               value="${formattedAmount}" 
                               step="100"
                               min="0"
                               data-kg="${kgDef.nr}"
                               data-quarter="${quarter.id}"
                               ${isGroup || isCombined ? 'readonly' : ''}>
                        ${isGroup ? '</strong>' : ''}
                    </td>
                `;
            });

            // Summe Spalte - Zeige sowohl Quartalsumme als auch Gesamtbetrag
            const quarterSumFormatted = formatCurrency(quarterSum);
            const isValidSum = Math.abs(quarterSum - kgData.totalBetrag) < 1; // Toleranz für Rundungsfehler
            
            rowHTML += `
                <td class="kg-sum" title="Quartalssumme: ${quarterSumFormatted}">
                    ${isGroup || isCombined ? '<strong>' : ''}
                    ${formatCurrency(kgData.totalBetrag)}
                    ${isGroup || isCombined ? '</strong>' : ''}
                    ${!isValidSum ? '<br><small class="text-warning">⚠ Differenz: ' + formatCurrency(quarterSum - kgData.totalBetrag) + '</small>' : ''}
                </td>
            `;

            row.innerHTML = rowHTML;

            // Add event listeners für editierbare Inputs
            if (!isGroup && !isCombined) {
                row.querySelectorAll('.quarter-input:not([readonly])').forEach(input => {
                    input.addEventListener('input', (e) => {
                        const kg = e.target.dataset.kg;
                        const quarterId = e.target.dataset.quarter;
                        const amount = Utils.validateNumber(e.target.value);
                        
                        this.debounceUtils.debounce(() => {
                            this.updateQuarterAmount(kg, quarterId, amount);
                        }, 300, `quarter-${kg}-${quarterId}`);
                    });
                });
            }

            tbody.appendChild(row);
        });
    }

    updateQuarterAmount(kg, quarterId, amount) {
        try {
            if (!this.currentProject?.liquiditaetsplanung?.kostenverteilung?.[kg]) return;

            this.currentProject.liquiditaetsplanung.kostenverteilung[kg].quarters[quarterId] = amount;
            window.app.saveData(false);
            
            // Update totals
            this.updateQuarterTotals();
        } catch (error) {
            Utils.handleError(error, `Updating Quarter Amount: ${kg}, ${quarterId}`);
        }
    }

    addTotalRow(tbody, quarters, kostenverteilung) {
        // Gesamtsumme-Zeile
        const totalRow = Utils.createElement('tr', 'totals-row');
        
        const totalAmount = this.calculateTotalAmount(kostenverteilung);
        
        let totalHTML = `
            <td><strong>GESAMT</strong></td>
            <td><strong>Gesamtkosten</strong></td>
            <td><strong>${formatCurrency(totalAmount)}</strong></td>
        `;

        const quarterTotals = {};
        quarters.forEach(quarter => {
            const quarterTotal = this.calculateQuarterTotal(kostenverteilung, quarter.id);
            quarterTotals[quarter.id] = quarterTotal;
            totalHTML += `<td class="quarter-total"><strong>${formatCurrency(quarterTotal)}</strong></td>`;
        });

        // Summe Spalte (Kontrolle - sollte gleich totalAmount sein)
        const sumCheck = Object.values(quarterTotals).reduce((sum, val) => sum + val, 0);
        totalHTML += `<td class="total-sum"><strong>${formatCurrency(sumCheck)}</strong></td>`;

        totalRow.innerHTML = totalHTML;
        tbody.appendChild(totalRow);

        // Kumulierte Zeile
        const cumulativeRow = Utils.createElement('tr', 'cumulative-row');
        
        let cumulativeHTML = `
            <td><strong>KUMULIERT</strong></td>
            <td><strong>Gesamtkosten kumuliert</strong></td>
            <td></td>
        `;

        let runningTotal = 0;
        quarters.forEach(quarter => {
            const quarterTotal = quarterTotals[quarter.id] || 0;
            runningTotal += quarterTotal;
            cumulativeHTML += `<td class="quarter-cumulative"><strong>${formatCurrency(runningTotal)}</strong></td>`;
        });

        // Finale kumulierte Summe (sollte gleich totalAmount sein)
        cumulativeHTML += `<td class="cumulative-final"><strong>${formatCurrency(runningTotal)}</strong></td>`;

        cumulativeRow.innerHTML = cumulativeHTML;
        tbody.appendChild(cumulativeRow);
    }

    calculateTotalAmount(kostenverteilung) {
        // Berechne Gesamtsumme aller Kostengruppen
        return Object.values(kostenverteilung).reduce((total, kgData) => {
            return total + (kgData.totalBetrag || 0);
        }, 0);
    }

    calculateQuarterTotal(kostenverteilung, quarterId) {
        // Berechne Summe für ein spezifisches Quartal
        return Object.values(kostenverteilung).reduce((total, kgData) => {
            const quarterAmount = kgData.quarters[quarterId] || 0;
            return total + quarterAmount;
        }, 0);
    }

    calculateQuarterTotals() {
        if (!this.currentProject?.liquiditaetsplanung) return {};

        const { kostenverteilung, quarters } = this.currentProject.liquiditaetsplanung;
        const totals = {};

        quarters.forEach(quarter => {
            totals[quarter.id] = this.calculateQuarterTotal(kostenverteilung, quarter.id);
        });

        return totals;
    }

    updateQuarterTotals() {
        try {
            if (!this.currentProject?.liquiditaetsplanung) return;

            const { kostenverteilung, quarters } = this.currentProject.liquiditaetsplanung;
            const totals = this.calculateQuarterTotals();
            
            // Update totals row
            const totalRow = Utils.findElement('#liquiditaet-tbody .totals-row');
            if (totalRow) {
                const quarterCells = totalRow.querySelectorAll('.quarter-total');
                quarterCells.forEach((cell, index) => {
                    if (quarters[index]) {
                        const quarterId = quarters[index].id;
                        const total = totals[quarterId] || 0;
                        cell.innerHTML = `<strong>${formatCurrency(total)}</strong>`;
                    }
                });

                // Update total sum check
                const totalSumCell = totalRow.querySelector('.total-sum');
                if (totalSumCell) {
                    const sumCheck = Object.values(totals).reduce((sum, val) => sum + val, 0);
                    totalSumCell.innerHTML = `<strong>${formatCurrency(sumCheck)}</strong>`;
                }
            }

            // Update cumulative row
            const cumulativeRow = Utils.findElement('#liquiditaet-tbody .cumulative-row');
            if (cumulativeRow) {
                const cumulativeCells = cumulativeRow.querySelectorAll('.quarter-cumulative');
                let runningTotal = 0;
                
                cumulativeCells.forEach((cell, index) => {
                    if (quarters[index]) {
                        const quarterId = quarters[index].id;
                        runningTotal += (totals[quarterId] || 0);
                        cell.innerHTML = `<strong>${formatCurrency(runningTotal)}</strong>`;
                    }
                });

                // Update final cumulative sum
                const finalCumulativeCell = cumulativeRow.querySelector('.cumulative-final');
                if (finalCumulativeCell) {
                    finalCumulativeCell.innerHTML = `<strong>${formatCurrency(runningTotal)}</strong>`;
                }
            }
        } catch (error) {
            Utils.handleError(error, 'Updating Quarter Totals');
        }
    }

    exportLiquiditaetsplanung() {
        try {
            if (!this.currentProject) {
                showNotification('Kein Projekt ausgewählt', 'warning');
                return;
            }

            if (!this.currentProject.liquiditaetsplanung) {
                showNotification('Keine Liquiditätsplanung vorhanden', 'warning');
                return;
            }

            const data = this.prepareExportData();
            
            // Export as JSON
            const filename = Utils.generateFilename(this.currentProject.name, 'liquiditaetsplanung');
            Utils.downloadJSON(data, filename);
            
            // Also create CSV for Excel import
            const csvData = this.createCSVFromData(data);
            const csvFilename = Utils.generateFilename(this.currentProject.name, 'liquiditaetsplanung', 'csv');
            const csvBlob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            Utils.downloadBlob(csvBlob, csvFilename);
            
            showNotification('Liquiditätsplanung erfolgreich exportiert (JSON + CSV)', 'success');
        } catch (error) {
            Utils.handleError(error, 'Exporting Liquiditaetsplanung');
        }
    }

    prepareExportData() {
        const { quarters, kostenverteilung, startDate, duration, planningDuration } = this.currentProject.liquiditaetsplanung;
        
        const data = {
            projektName: this.currentProject.name,
            projektdaten: {
                startDate,
                duration,
                planningDuration
            },
            quarters: quarters.map(q => ({
                id: q.id,
                name: q.name,
                start: q.start,
                end: q.end
            })),
            kostenverteilung: {},
            totals: {
                gesamt: 0,
                quartalsTotals: {},
                kumulativ: this.getCumulativeValues()
            },
            cashFlow: this.getProjectCashFlow(),
            exportiert: new Date().toISOString()
        };

        // Process cost distribution
        Object.entries(kostenverteilung).forEach(([kg, kgData]) => {
            data.kostenverteilung[kg] = {
                name: kgData.name,
                totalBetrag: kgData.totalBetrag,
                quarters: kgData.quarters
            };
            data.totals.gesamt += kgData.totalBetrag;
        });

        // Calculate quarter totals
        quarters.forEach(quarter => {
            data.totals.quartalsTotals[quarter.id] = Utils.sum(
                Object.values(kostenverteilung),
                item => item.quarters[quarter.id] || 0
            );
        });

        return data;
    }

    createCSVFromData(data) {
        const headers = ['KGR', 'Positionsbezeichnung', 'Gesamt Kosten'];
        data.quarters.forEach(quarter => {
            headers.push(quarter.name);
        });
        headers.push('Summe');

        const rows = [headers];

        // Add cost group data with hierarchy
        const kostengruppenDef = this.getKostengruppenForDistribution();
        
        kostengruppenDef.forEach(kgDef => {
            const kgData = data.kostenverteilung[kgDef.nr];
            if (!kgData || kgData.totalBetrag === 0) return;
            
            const isSubgroup = kgDef.parent !== undefined;
            const namePrefix = isSubgroup ? '  ' : ''; // Einrückung für Untergruppen
            const displayName = kgData.combined ? 
                `${kgData.name} (${kgData.combined.join(' + ')})` : 
                kgData.name;
                
            const row = [
                kgDef.nr,
                namePrefix + displayName,
                kgData.totalBetrag.toFixed(0)
            ];
            
            data.quarters.forEach(quarter => {
                const amount = kgData.quarters[quarter.id] || 0;
                row.push(amount > 0 ? amount.toFixed(0) : '');
            });
            
            // Summe (gleich wie Gesamtkosten)
            row.push(kgData.totalBetrag.toFixed(0));
            
            rows.push(row);
        });

        // Add totals row
        const totalRow = ['GESAMT', 'Gesamtkosten', data.totals.gesamt.toFixed(0)];
        data.quarters.forEach(quarter => {
            totalRow.push((data.totals.quartalsTotals[quarter.id] || 0).toFixed(0));
        });
        totalRow.push(data.totals.gesamt.toFixed(0));
        rows.push(totalRow);

        // Add cumulative row
        const cumulativeRow = ['KUMULIERT', 'Gesamtkosten kumuliert', ''];
        let runningTotal = 0;
        data.quarters.forEach(quarter => {
            runningTotal += (data.totals.quartalsTotals[quarter.id] || 0);
            cumulativeRow.push(runningTotal.toFixed(0));
        });
        cumulativeRow.push(''); // Leere Summe für kumulierte Zeile
        rows.push(cumulativeRow);

        return Utils.arrayToCSV(rows);
    }

    getCumulativeValues() {
        if (!this.currentProject?.liquiditaetsplanung) return {};

        const { quarters, kostenverteilung } = this.currentProject.liquiditaetsplanung;
        const cumulative = {};
        let runningTotal = 0;

        quarters.forEach(quarter => {
            const quarterTotal = Utils.sum(
                Object.values(kostenverteilung),
                item => item.quarters[quarter.id] || 0
            );
            runningTotal += quarterTotal;
            cumulative[quarter.id] = runningTotal;
        });

        return cumulative;
    }

    getProjectCashFlow() {
        if (!this.currentProject?.liquiditaetsplanung) return {};

        const { quarters, kostenverteilung } = this.currentProject.liquiditaetsplanung;
        const cashFlow = {
            quarterly: {},
            cumulative: this.getCumulativeValues(),
            peaks: {
                highest: { quarter: '', amount: 0 },
                lowest: { quarter: '', amount: Infinity }
            }
        };

        quarters.forEach(quarter => {
            const amount = Utils.sum(
                Object.values(kostenverteilung),
                item => item.quarters[quarter.id] || 0
            );
            
            cashFlow.quarterly[quarter.id] = amount;
            
            if (amount > cashFlow.peaks.highest.amount) {
                cashFlow.peaks.highest = { quarter: quarter.name, amount };
            }
            
            if (amount < cashFlow.peaks.lowest.amount && amount > 0) {
                cashFlow.peaks.lowest = { quarter: quarter.name, amount };
            }
        });

        return cashFlow;
    }

    debugKostenverteilung() {
        if (!this.currentProject?.liquiditaetsplanung) {
            console.log('Keine Liquiditätsplanung vorhanden');
            return;
        }

        const { quarters, kostenverteilung } = this.currentProject.liquiditaetsplanung;
        
        console.log('=== LIQUIDITÄTS-DEBUG ===');
        console.log('Quartale:', quarters.length);
        console.log('Kostengruppen:', Object.keys(kostenverteilung).length);
        
        let gesamtKalkulation = 0;
        let gesamtLiquiditaet = 0;
        let quartalsSummen = {};
        
        // Initialisiere Quartalssummen
        quarters.forEach(quarter => quartalsSummen[quarter.id] = 0);
        
        console.log('\n=== KOSTENGRUPPEN ===');
        Object.entries(kostenverteilung).forEach(([kg, data]) => {
            const quartalsTotal = Object.values(data.quarters).reduce((sum, val) => sum + val, 0);
            gesamtKalkulation += data.totalBetrag;
            gesamtLiquiditaet += quartalsTotal;
            
            // Addiere zu Quartalssummen
            quarters.forEach(quarter => {
                quartalsSummen[quarter.id] += (data.quarters[quarter.id] || 0);
            });
            
            const differenz = quartalsTotal - data.totalBetrag;
            console.log(`KG ${kg}: Kalkulation=${formatCurrency(data.totalBetrag)}, Quartale=${formatCurrency(quartalsTotal)}, Diff=${formatCurrency(differenz)}`);
            
            if (Math.abs(differenz) > 1) {
                console.warn(`⚠️ Differenz bei KG ${kg}: ${formatCurrency(differenz)}`);
            }
        });
        
        console.log('\n=== QUARTALS-SUMMEN ===');
        let kumulativ = 0;
        quarters.forEach(quarter => {
            kumulativ += quartalsSummen[quarter.id];
            console.log(`${quarter.name}: ${formatCurrency(quartalsSummen[quarter.id])} (Kumulativ: ${formatCurrency(kumulativ)})`);
        });
        
        console.log('\n=== GESAMT-KONTROLLE ===');
        console.log(`Kalkulation Total: ${formatCurrency(gesamtKalkulation)}`);
        console.log(`Liquidität Total: ${formatCurrency(gesamtLiquiditaet)}`);
        console.log(`Differenz: ${formatCurrency(gesamtLiquiditaet - gesamtKalkulation)}`);
        
        if (Math.abs(gesamtLiquiditaet - gesamtKalkulation) > 1) {
            console.error('🚨 FEHLER: Gesamt-Differenz zwischen Kalkulation und Liquidität!');
        } else {
            console.log('✅ Berechnungen stimmen überein');
        }
    }

    // Öffentliche Debug-Funktion
    debug() {
        this.debugKostenverteilung();
    }

    // Performance und Layout Debug
    debugTableLayout() {
        const table = Utils.findElement('#liquiditaet-table');
        const container = Utils.findElement('.table-container');
        
        if (!table || !container) {
            console.log('Tabelle oder Container nicht gefunden');
            return;
        }

        console.log('=== TABELLEN-LAYOUT DEBUG ===');
        console.log('Container Breite:', container.offsetWidth, 'px');
        console.log('Tabelle Breite:', table.offsetWidth, 'px');
        console.log('Horizontales Scrolling:', container.scrollWidth > container.clientWidth ? 'JA' : 'NEIN');
        console.log('Scroll-Breite:', container.scrollWidth, 'px');
        console.log('Client-Breite:', container.clientWidth, 'px');
        
        // Prüfe Quartale
        const quarters = table.querySelectorAll('.quarter-header');
        console.log('Anzahl Quartale:', quarters.length);
        console.log('Geschätzte Mindestbreite:', (quarters.length * 120) + 400, 'px');
        
        // Viewport-Info
        console.log('Viewport Breite:', window.innerWidth, 'px');
        console.log('Mobile Ansicht:', window.innerWidth <= 768 ? 'JA' : 'NEIN');
    }

    syncWithKalkulation() {
        try {
            if (!this.currentProject) {
                showNotification('Bitte wählen Sie zuerst ein Projekt aus', 'warning');
                return;
            }

            if (!this.currentProject.liquiditaetsplanung) {
                showNotification('Keine Liquiditätsplanung vorhanden. Bitte zuerst generieren.', 'warning');
                return;
            }

            // Re-generate with current kalkulation data
            this.generateLiquiditaetsplanung();
            showNotification('Liquiditätsplanung erfolgreich mit Kalkulation synchronisiert', 'success');
        } catch (error) {
            Utils.handleError(error, 'Syncing with Kalkulation');
        }
    }
}

// Initialize Liquiditaet Module
window.liquiditaetModule = new LiquiditaetModule(); 