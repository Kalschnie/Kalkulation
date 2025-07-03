/**
 * Excel Export Module
 * Dedicated module for creating proper Excel (.xlsx) files with formatting
 */

class ExcelExportModule {
    constructor() {
        this.workbook = null;
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            // Load SheetJS library if not already loaded
            if (!window.XLSX) {
                await this.loadSheetJS();
            }
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize Excel Export Module:', error);
            Utils.showNotification('Excel-Export nicht verfügbar. Verwende CSV-Export.', 'warning');
        }
    }

    async loadSheetJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Export project data to Excel with multiple sheets
     */
    async exportProjectToExcel(project) {
        if (!this.initialized || !window.XLSX) {
            Utils.showNotification('Excel-Export nicht verfügbar', 'error');
            return false;
        }

        try {
            this.workbook = window.XLSX.utils.book_new();
            
            // Add different sheets for different modules
            await this.addProjectOverviewSheet(project);
            await this.addKalkulationSheet(project);
            await this.addBaukostenSheet(project);
            await this.addLiquiditaetSheet(project);
            
            // Generate filename
            const filename = this.generateExcelFilename(project.name);
            
            // Write and download the file
            window.XLSX.writeFile(this.workbook, filename);
            
            Utils.showNotification(`Excel-Datei "${filename}" wurde erfolgreich erstellt`, 'success');
            return true;
        } catch (error) {
            Utils.handleError(error, 'Excel Export');
            return false;
        }
    }

    /**
     * Project Overview Sheet
     */
    addProjectOverviewSheet(project) {
        const data = [
            ['PROJEKTÜBERSICHT'],
            [''],
            ['Projektname:', project.name],
            ['Status:', project.status],
            ['Erstellt:', Utils.formatDate(project.created)],
            ['Zuletzt geändert:', Utils.formatDate(project.updated)],
            ['Beschreibung:', project.description || 'Keine Beschreibung'],
            [''],
            ['KENNZAHLEN'],
            ['BGF (m²):', project.kennzahlen?.bgf || 0],
            ['BRI (m³):', project.kennzahlen?.bri || 0],
            ['WFL (m²):', project.kennzahlen?.wfl || 0],
            ['Grundstücksfläche (m²):', project.kennzahlen?.grundstuecksflaeche || 0],
            ['Wohneinheiten:', project.kennzahlen?.we || 0],
            [''],
            ['KOSTENZUSAMMENFASSUNG'],
            ['Gesamtkosten:', Utils.formatCurrency(this.calculateProjectTotal(project))],
            ['Kosten/BGF:', project.kennzahlen?.bgf ? 
                Utils.formatCurrency(this.calculateProjectTotal(project) / project.kennzahlen.bgf) : 'N/A'],
            ['Kosten/WE:', project.kennzahlen?.we ? 
                Utils.formatCurrency(this.calculateProjectTotal(project) / project.kennzahlen.we) : 'N/A']
        ];

        const worksheet = window.XLSX.utils.aoa_to_sheet(data);
        
        // Apply basic formatting
        this.applyBasicFormatting(worksheet, data.length);
        
        window.XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Projektübersicht');
    }

    /**
     * Kalkulation Sheet (KG 100-800)
     */
    addKalkulationSheet(project) {
        if (!project.kalkulation || Object.keys(project.kalkulation).length === 0) {
            return;
        }

        const headers = [
            'KG', 'Positionsbezeichnung', 'Gesamt (€)', 
            '€/BGF', '€/BRI', '€/WFL', '€/WE', 'Hinweise'
        ];
        
        const data = [headers];
        
        let totalKosten = 0;
        
        // project.kalkulation ist ein Objekt, nicht ein Array
        Object.entries(project.kalkulation).forEach(([kgNr, kg]) => {
            const gesamt = kg.betrag || 0;
            totalKosten += gesamt;
            
            const bgf = project.kennzahlen?.bgf || 1;
            const bri = project.kennzahlen?.bri || 1;
            const wfl = project.kennzahlen?.wfl || 1;
            const we = project.kennzahlen?.we || 1;
            
            data.push([
                kgNr,
                kg.name || kg.bezeichnung,
                gesamt,
                Math.round(gesamt / bgf),
                Math.round(gesamt / bri),
                Math.round(gesamt / wfl),
                Math.round(gesamt / we),
                kg.hinweise || ''
            ]);
        });
        
        // Add total row
        data.push([
            'GESAMT', 'Gesamtkosten', totalKosten, '', '', '', '', ''
        ]);

        const worksheet = window.XLSX.utils.aoa_to_sheet(data);
        
        // Format currency columns
        this.formatCurrencyColumns(worksheet, [2, 3, 4, 5, 6], data.length);
        
        window.XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Kalkulation KG100-800');
    }

    /**
     * Baukosten Sheet (KG 300-400)
     */
    addBaukostenSheet(project) {
        if (!project.baukosten) {
            return;
        }

        // Handle both array and object structures
        const baukostenEntries = Array.isArray(project.baukosten) 
            ? project.baukosten.map((item, index) => [index, item])
            : Object.entries(project.baukosten);

        if (baukostenEntries.length === 0) {
            return;
        }

        const headers = [
            'Nr.', 'Gewerk', 'Kalkulation (€)', 'Vergabe (€)', 
            'Mehr-/Minderkosten (€)', 'Abzüge/Skonto (€)', 'Netto Endkosten (€)', 'Hinweise'
        ];
        
        const data = [headers];
        
        baukostenEntries.forEach(([key, gewerk]) => {
            const kalkulation = gewerk.kalkulation || 0;
            const vergabe = gewerk.vergabe || 0;
            const mehrMinderkosten = gewerk.mehrMinderkosten || 0;
            const abzuege = gewerk.abzuege || 0;
            const nettoEndkosten = vergabe + mehrMinderkosten - abzuege;
            
            data.push([
                gewerk.nr || key,
                gewerk.bezeichnung || gewerk.name,
                kalkulation,
                vergabe,
                mehrMinderkosten,
                abzuege,
                nettoEndkosten,
                gewerk.hinweise || ''
            ]);
        });

        const worksheet = window.XLSX.utils.aoa_to_sheet(data);
        
        // Format currency columns
        this.formatCurrencyColumns(worksheet, [2, 3, 4, 5, 6], data.length);
        
        window.XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Baukosten KG300-400');
    }

    /**
     * Liquiditätsplanung Sheet
     */
    addLiquiditaetSheet(project) {
        if (!project.liquiditaetsplanung || !project.liquiditaetsplanung.quarters) {
            return;
        }

        const { quarters, kostenverteilung } = project.liquiditaetsplanung;
        
        // Build headers
        const headers = ['KG', 'Positionsbezeichnung', 'Gesamt (€)'];
        quarters.forEach(quarter => headers.push(quarter.name));
        headers.push('Summe Kontrolle');
        
        const data = [headers];
        
        // Add cost groups
        Object.entries(kostenverteilung).forEach(([kg, kgData]) => {
            if (!kgData || kgData.totalBetrag === 0) return;
            
            const row = [kg, kgData.name, kgData.totalBetrag];
            quarters.forEach(quarter => {
                row.push(kgData.quarters[quarter.id] || 0);
            });
            row.push(kgData.totalBetrag); // Control sum
            
            data.push(row);
        });
        
        // Add totals row
        const totalRow = ['GESAMT', 'Gesamtkosten', 0];
        quarters.forEach(quarter => {
            const quarterTotal = Object.values(kostenverteilung).reduce((sum, kgData) => {
                return sum + (kgData.quarters[quarter.id] || 0);
            }, 0);
            totalRow.push(quarterTotal);
            totalRow[2] += quarterTotal;
        });
        totalRow.push(totalRow[2]); // Control sum
        data.push(totalRow);
        
        // Add cumulative row
        const cumulativeRow = ['KUMULIERT', 'Kumulierte Kosten', ''];
        let runningTotal = 0;
        quarters.forEach(quarter => {
            const quarterTotal = Object.values(kostenverteilung).reduce((sum, kgData) => {
                return sum + (kgData.quarters[quarter.id] || 0);
            }, 0);
            runningTotal += quarterTotal;
            cumulativeRow.push(runningTotal);
        });
        cumulativeRow.push(''); // No control sum for cumulative
        data.push(cumulativeRow);

        const worksheet = window.XLSX.utils.aoa_to_sheet(data);
        
        // Format currency columns (all except first two and last)
        const currencyColumns = [];
        for (let i = 2; i < headers.length - 1; i++) {
            currencyColumns.push(i);
        }
        this.formatCurrencyColumns(worksheet, currencyColumns, data.length);
        
        window.XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Liquiditätsplanung');
    }

    /**
     * Calculate total project costs
     */
    calculateProjectTotal(project) {
        if (!project.kalkulation) return 0;
        
        // Kalkulation ist ein Objekt, nicht ein Array
        return Object.values(project.kalkulation).reduce((total, kg) => {
            return total + (parseFloat(kg.betrag) || 0);
        }, 0);
    }

    /**
     * Apply basic formatting to worksheet
     */
    applyBasicFormatting(worksheet, rowCount) {
        // Set column widths
        const colWidths = [
            { wch: 20 }, // Column A
            { wch: 40 }, // Column B
            { wch: 15 }  // Column C
        ];
        worksheet['!cols'] = colWidths;
    }

    /**
     * Format currency columns
     */
    formatCurrencyColumns(worksheet, columnIndices, rowCount) {
        columnIndices.forEach(colIndex => {
            for (let row = 2; row <= rowCount; row++) { // Skip header row
                const cellRef = window.XLSX.utils.encode_cell({ r: row - 1, c: colIndex });
                if (worksheet[cellRef] && typeof worksheet[cellRef].v === 'number') {
                    worksheet[cellRef].t = 'n';
                    worksheet[cellRef].z = '#,##0 "€"';
                }
            }
        });
    }

    /**
     * Generate Excel filename
     */
    generateExcelFilename(projectName) {
        const sanitizedName = projectName.replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, '');
        const timestamp = new Date().toISOString().split('T')[0];
        return `${sanitizedName}_Kalkulation_${timestamp}.xlsx`;
    }

    /**
     * Quick export for specific module
     */
    async exportLiquiditaetToExcel(project) {
        if (!this.initialized || !window.XLSX) {
            return false;
        }

        try {
            this.workbook = window.XLSX.utils.book_new();
            await this.addLiquiditaetSheet(project);
            
            const filename = `${project.name}_Liquiditaetsplanung_${new Date().toISOString().split('T')[0]}.xlsx`;
            window.XLSX.writeFile(this.workbook, filename);
            
            return true;
        } catch (error) {
            Utils.handleError(error, 'Liquiditaet Excel Export');
            return false;
        }
    }
}

// Global instance
window.excelExportModule = new ExcelExportModule(); 