/**
 * Statistiken & Analytics Module
 * Umfassende Projektstatistiken, Vergleiche und Performance-Analysen
 */

class StatistikenModule {
    constructor() {
        this.currentProject = null;
        this.activeTab = 'overview';
        this.charts = new Map();
        this.init();
    }

    init() {
        try {
            this.setupEventListeners();
            this.setupTabNavigation();
            this.loadChartLibrary();
        } catch (error) {
            Utils.handleError(error, 'Statistiken Module Initialization');
        }
    }

    async loadChartLibrary() {
        // Load Chart.js library if not already loaded
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => {
                console.log('Chart.js loaded');
                this.initializeCharts();
            };
            document.head.appendChild(script);
        } else {
            this.initializeCharts();
        }
    }

    setupEventListeners() {
        try {
            const generateReportBtn = Utils.findElement('#generate-report-btn');
            if (generateReportBtn) {
                generateReportBtn.addEventListener('click', () => this.generateReport());
            }

            const exportStatsBtn = Utils.findElement('#export-stats-btn');
            if (exportStatsBtn) {
                exportStatsBtn.addEventListener('click', () => this.exportStatistics());
            }

            const startComparisonBtn = Utils.findElement('#start-comparison-btn');
            if (startComparisonBtn) {
                startComparisonBtn.addEventListener('click', () => this.startProjectComparison());
            }

            // Project selector for statistics
            const statsProjectSelector = Utils.findElement('#stats-project-selector');
            if (statsProjectSelector) {
                statsProjectSelector.addEventListener('change', (e) => {
                    this.filterStatisticsByProject(e.target.value);
                });
            }

        } catch (error) {
            Utils.handleError(error, 'Setting up Statistiken Event Listeners');
        }
    }

    setupTabNavigation() {
        const tabs = Utils.findAllElements('.stats-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                this.switchTab(targetTab);
            });
        });
    }

    switchTab(tabName) {
        try {
            this.activeTab = tabName;

            // Update tab buttons
            Utils.findAllElements('.stats-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.tab === tabName) {
                    tab.classList.add('active');
                }
            });

            // Update tab content
            Utils.findAllElements('.stats-tab-content').forEach(content => {
                content.classList.remove('active');
            });

            const activeContent = Utils.findElement(`#${tabName}-content`);
            if (activeContent) {
                activeContent.classList.add('active');
            }

            // Load content for the active tab
            this.loadTabContent(tabName);
        } catch (error) {
            Utils.handleError(error, `Switching to stats tab: ${tabName}`);
        }
    }

    loadTabContent(tabName) {
        switch (tabName) {
            case 'overview':
                this.loadOverviewCharts();
                break;
            case 'costs':
                this.loadCostAnalysis();
                break;
            case 'performance':
                this.loadPerformanceAnalysis();
                break;
            case 'comparison':
                this.loadProjectComparison();
                break;
        }
    }

    loadProject(project) {
        try {
            this.currentProject = project;
            if (project) {
                this.updateStatisticsOverview();
                this.populateProjectSelectors();
                this.loadTabContent(this.activeTab);
                showNotification(`Statistiken für "${project.name}" geladen`, 'success');
            }
        } catch (error) {
            Utils.handleError(error, 'Loading Project in Statistiken');
        }
    }

    updateStatisticsOverview() {
        try {
            const projects = window.app?.projects || [];
            const totalProjects = projects.length;
            
            // Calculate totals
            const totalVolume = projects.reduce((sum, project) => {
                return sum + this.calculateProjectTotal(project);
            }, 0);

            const avgCostPerSqm = this.calculateAverageCostPerSqm(projects);
            const avgCostDeviation = this.calculateAverageCostDeviation(projects);

            // Update overview cards
            Utils.findElement('#total-projects').textContent = totalProjects;
            Utils.findElement('#total-volume').textContent = formatCurrency(totalVolume);
            Utils.findElement('#avg-cost-per-sqm').textContent = formatCurrency(avgCostPerSqm);
            Utils.findElement('#avg-cost-deviation').textContent = `${avgCostDeviation.toFixed(1)}%`;

            // Update trends
            this.updateTrendIndicators(projects);

        } catch (error) {
            Utils.handleError(error, 'Updating Statistics Overview');
        }
    }

    calculateProjectTotal(project) {
        if (!project?.kalkulation) return 0;
        return Object.values(project.kalkulation).reduce((sum, kg) => {
            return sum + Utils.validateNumber(kg.betrag);
        }, 0);
    }

    calculateAverageCostPerSqm(projects) {
        const validProjects = projects.filter(p => 
            p.kennzahlen?.bgf > 0 && this.calculateProjectTotal(p) > 0
        );

        if (validProjects.length === 0) return 0;

        const total = validProjects.reduce((sum, project) => {
            const totalCost = this.calculateProjectTotal(project);
            const bgf = project.kennzahlen.bgf;
            return sum + (totalCost / bgf);
        }, 0);

        return total / validProjects.length;
    }

    calculateAverageCostDeviation(projects) {
        // Calculate deviation between Kalkulation and actual costs (if available)
        const validProjects = projects.filter(p => 
            p.kalkulation && (p.vertraege || p.baukosten)
        );

        if (validProjects.length === 0) return 0;

        const totalDeviation = validProjects.reduce((sum, project) => {
            const kalkulationTotal = this.calculateProjectTotal(project);
            const actualTotal = this.calculateActualCosts(project);
            
            if (kalkulationTotal > 0) {
                return sum + ((actualTotal - kalkulationTotal) / kalkulationTotal) * 100;
            }
            return sum;
        }, 0);

        return totalDeviation / validProjects.length;
    }

    calculateActualCosts(project) {
        // Try to get actual costs from contracts or construction costs
        if (project.vertraege?.length > 0) {
            return project.vertraege.reduce((sum, vertrag) => {
                return sum + Utils.validateNumber(vertrag.vertragssumme);
            }, 0);
        }

        if (project.baukosten?.length > 0) {
            return project.baukosten.reduce((sum, gewerk) => {
                return sum + Utils.validateNumber(gewerk.vergabe || gewerk.kalkulation);
            }, 0);
        }

        return this.calculateProjectTotal(project);
    }

    updateTrendIndicators(projects) {
        try {
            // Simple trend calculation based on recent projects
            const recentProjects = projects
                .filter(p => p.created)
                .sort((a, b) => new Date(b.created) - new Date(a.created))
                .slice(0, 5);

            const projectsThisMonth = recentProjects.filter(p => {
                const created = new Date(p.created);
                const now = new Date();
                return created.getMonth() === now.getMonth() && 
                       created.getFullYear() === now.getFullYear();
            }).length;

            const avgProjectVolume = recentProjects.length > 0 ? 
                recentProjects.reduce((sum, p) => sum + this.calculateProjectTotal(p), 0) / recentProjects.length : 0;

            // Update trend texts
            Utils.findElement('#projects-trend .trend-text').textContent = `+${projectsThisMonth} diesen Monat`;
            Utils.findElement('#volume-trend .trend-text').textContent = `Ø ${formatCurrency(avgProjectVolume, 'de-DE', 'EUR', 1)} pro Projekt`;

        } catch (error) {
            Utils.handleError(error, 'Updating Trend Indicators');
        }
    }

    populateProjectSelectors() {
        try {
            const projects = window.app?.projects || [];
            const selectors = [
                '#stats-project-selector',
                '#kg-chart-project',
                '#deviation-project',
                '#compare-project-1',
                '#compare-project-2'
            ];

            selectors.forEach(selector => {
                const select = Utils.findElement(selector);
                if (select && select.tagName === 'SELECT') {
                    // Keep first option, clear others
                    const firstOption = select.querySelector('option').cloneNode(true);
                    select.innerHTML = '';
                    select.appendChild(firstOption);

                    projects.forEach(project => {
                        const option = document.createElement('option');
                        option.value = project.id;
                        option.textContent = project.name;
                        select.appendChild(option);
                    });
                }
            });
        } catch (error) {
            Utils.handleError(error, 'Populating Project Selectors');
        }
    }

    initializeCharts() {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded');
            return;
        }

        try {
            this.loadOverviewCharts();
        } catch (error) {
            Utils.handleError(error, 'Initializing Charts');
        }
    }

    loadOverviewCharts() {
        try {
            this.createProjectStatusChart();
            this.createCostGroupsChart();
            this.createProjectTimelineChart();
        } catch (error) {
            Utils.handleError(error, 'Loading Overview Charts');
        }
    }

    createProjectStatusChart() {
        try {
            const ctx = Utils.findElement('#project-status-chart');
            if (!ctx || typeof Chart === 'undefined') return;

            const projects = window.app?.projects || [];
            const statusCounts = projects.reduce((acc, project) => {
                const status = project.status || 'Unbekannt';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});

            // Destroy existing chart
            if (this.charts.has('status')) {
                this.charts.get('status').destroy();
            }

            const chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(statusCounts),
                    datasets: [{
                        data: Object.values(statusCounts),
                        backgroundColor: [
                            '#ffc107', // Planung
                            '#17a2b8', // Genehmigung  
                            '#28a745', // Ausführung
                            '#6c757d'  // Abgeschlossen
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });

            this.charts.set('status', chart);
        } catch (error) {
            Utils.handleError(error, 'Creating Project Status Chart');
        }
    }

    createCostGroupsChart() {
        try {
            const ctx = Utils.findElement('#cost-groups-chart');
            if (!ctx || typeof Chart === 'undefined') return;

            const projects = window.app?.projects || [];
            const costGroups = this.aggregateCostGroups(projects);

            // Destroy existing chart
            if (this.charts.has('costGroups')) {
                this.charts.get('costGroups').destroy();
            }

            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(costGroups),
                    datasets: [{
                        label: 'Durchschnittliche Kosten (€)',
                        data: Object.values(costGroups),
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return formatCurrency(value);
                                }
                            }
                        }
                    }
                }
            });

            this.charts.set('costGroups', chart);
        } catch (error) {
            Utils.handleError(error, 'Creating Cost Groups Chart');
        }
    }

    aggregateCostGroups(projects) {
        const mainGroups = {
            'KG 100': [],
            'KG 200': [],
            'KG 300': [],
            'KG 400': [],
            'KG 500': [],
            'KG 600': [],
            'KG 700': [],
            'KG 800': []
        };

        projects.forEach(project => {
            if (project.kalkulation) {
                Object.entries(project.kalkulation).forEach(([kg, data]) => {
                    const mainGroup = 'KG ' + kg.charAt(0) + '00';
                    if (mainGroups[mainGroup]) {
                        mainGroups[mainGroup].push(Utils.validateNumber(data.betrag));
                    }
                });
            }
        });

        // Calculate averages
        const averages = {};
        Object.entries(mainGroups).forEach(([group, values]) => {
            if (values.length > 0) {
                averages[group] = values.reduce((sum, val) => sum + val, 0) / values.length;
            } else {
                averages[group] = 0;
            }
        });

        return averages;
    }

    createProjectTimelineChart() {
        try {
            const ctx = Utils.findElement('#project-timeline-chart');
            if (!ctx || typeof Chart === 'undefined') return;

            const projects = window.app?.projects || [];
            const timelineData = this.generateTimelineData(projects);

            // Destroy existing chart
            if (this.charts.has('timeline')) {
                this.charts.get('timeline').destroy();
            }

            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: timelineData.labels,
                    datasets: [{
                        label: 'Projektvolumen (€)',
                        data: timelineData.values,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return formatCurrency(value);
                                }
                            }
                        }
                    }
                }
            });

            this.charts.set('timeline', chart);
        } catch (error) {
            Utils.handleError(error, 'Creating Project Timeline Chart');
        }
    }

    generateTimelineData(projects) {
        // Group projects by month
        const monthlyData = {};
        
        projects.forEach(project => {
            if (project.created) {
                const date = new Date(project.created);
                const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                
                if (!monthlyData[key]) {
                    monthlyData[key] = 0;
                }
                monthlyData[key] += this.calculateProjectTotal(project);
            }
        });

        // Sort by date
        const sortedEntries = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b));
        
        return {
            labels: sortedEntries.map(([key]) => key),
            values: sortedEntries.map(([, value]) => value)
        };
    }

    loadCostAnalysis() {
        try {
            this.updateBenchmarks();
            this.createCostDeviationChart();
            this.createCostPerSqmChart();
        } catch (error) {
            Utils.handleError(error, 'Loading Cost Analysis');
        }
    }

    updateBenchmarks() {
        // Update benchmark values based on actual project data
        const projects = window.app?.projects || [];
        const benchmarks = this.calculateBenchmarks(projects);

        // Update benchmark cards with real data
        // This is where you would update the benchmark values shown in the UI
    }

    calculateBenchmarks(projects) {
        // Calculate real benchmarks from project data
        return {
            kg300: this.calculateKGBenchmark(projects, '3'),
            kg400: this.calculateKGBenchmark(projects, '4'),
            kg700Percentage: this.calculateKG700Percentage(projects)
        };
    }

    calculateKGBenchmark(projects, kgPrefix) {
        const validData = [];
        
        projects.forEach(project => {
            if (project.kalkulation && project.kennzahlen?.bgf > 0) {
                let kgTotal = 0;
                Object.entries(project.kalkulation).forEach(([kg, data]) => {
                    if (kg.startsWith(kgPrefix)) {
                        kgTotal += Utils.validateNumber(data.betrag);
                    }
                });
                
                if (kgTotal > 0) {
                    validData.push(kgTotal / project.kennzahlen.bgf);
                }
            }
        });

        return validData.length > 0 ? 
            validData.reduce((sum, val) => sum + val, 0) / validData.length : 0;
    }

    calculateKG700Percentage(projects) {
        const validData = [];
        
        projects.forEach(project => {
            if (project.kalkulation) {
                let kg700Total = 0;
                let projectTotal = 0;
                
                Object.entries(project.kalkulation).forEach(([kg, data]) => {
                    const betrag = Utils.validateNumber(data.betrag);
                    projectTotal += betrag;
                    
                    if (kg.startsWith('7')) {
                        kg700Total += betrag;
                    }
                });
                
                if (projectTotal > 0) {
                    validData.push((kg700Total / projectTotal) * 100);
                }
            }
        });

        return validData.length > 0 ? 
            validData.reduce((sum, val) => sum + val, 0) / validData.length : 0;
    }

    createCostDeviationChart() {
        // Implementation for cost deviation chart
        // Similar structure to other chart methods
    }

    createCostPerSqmChart() {
        // Implementation for cost per sqm chart
        // Similar structure to other chart methods
    }

    loadPerformanceAnalysis() {
        try {
            this.updateKPIs();
            this.createPerformanceTrendChart();
            this.renderRiskMatrix();
        } catch (error) {
            Utils.handleError(error, 'Loading Performance Analysis');
        }
    }

    updateKPIs() {
        // Calculate and update KPI values
        const projects = window.app?.projects || [];
        // Implementation for KPI calculations
    }

    createPerformanceTrendChart() {
        // Implementation for performance trend chart
    }

    renderRiskMatrix() {
        // Implementation for risk matrix visualization
    }

    loadProjectComparison() {
        // Load and setup project comparison functionality
    }

    startProjectComparison() {
        try {
            const project1Id = Utils.findElement('#compare-project-1').value;
            const project2Id = Utils.findElement('#compare-project-2').value;

            if (!project1Id || !project2Id) {
                showNotification('Bitte wählen Sie zwei Projekte zum Vergleichen aus', 'warning');
                return;
            }

            if (project1Id === project2Id) {
                showNotification('Bitte wählen Sie zwei verschiedene Projekte aus', 'warning');
                return;
            }

            const projects = window.app?.projects || [];
            const project1 = projects.find(p => p.id === project1Id);
            const project2 = projects.find(p => p.id === project2Id);

            if (!project1 || !project2) {
                showNotification('Projekte nicht gefunden', 'error');
                return;
            }

            this.performProjectComparison(project1, project2);
        } catch (error) {
            Utils.handleError(error, 'Starting Project Comparison');
        }
    }

    performProjectComparison(project1, project2) {
        try {
            // Generate comparison tables
            this.generateBasicComparisonTable(project1, project2);
            this.generateMetricsComparisonTable(project1, project2);
            this.createComparisonCostChart(project1, project2);

            showNotification('Projektvergleich erfolgreich erstellt', 'success');
        } catch (error) {
            Utils.handleError(error, 'Performing Project Comparison');
        }
    }

    generateBasicComparisonTable(project1, project2) {
        const table = Utils.findElement('#basic-comparison');
        if (!table) return;

        const data = [
            ['Projektname', project1.name, project2.name],
            ['Status', project1.status || 'Unbekannt', project2.status || 'Unbekannt'],
            ['BGF (m²)', formatNumber(project1.kennzahlen?.bgf || 0), formatNumber(project2.kennzahlen?.bgf || 0)],
            ['WFL (m²)', formatNumber(project1.kennzahlen?.wfl || 0), formatNumber(project2.kennzahlen?.wfl || 0)],
            ['WE (Anzahl)', project1.kennzahlen?.we || 0, project2.kennzahlen?.we || 0],
            ['Gesamtkosten', formatCurrency(this.calculateProjectTotal(project1)), formatCurrency(this.calculateProjectTotal(project2))]
        ];

        table.innerHTML = this.createComparisonTableHTML(data);
    }

    generateMetricsComparisonTable(project1, project2) {
        const table = Utils.findElement('#metrics-comparison');
        if (!table) return;

        const total1 = this.calculateProjectTotal(project1);
        const total2 = this.calculateProjectTotal(project2);
        const bgf1 = project1.kennzahlen?.bgf || 0;
        const bgf2 = project2.kennzahlen?.bgf || 0;

        const data = [
            ['€/BGF', bgf1 > 0 ? formatCurrency(total1 / bgf1) : 'N/A', bgf2 > 0 ? formatCurrency(total2 / bgf2) : 'N/A'],
            ['€/WE', project1.kennzahlen?.we > 0 ? formatCurrency(total1 / project1.kennzahlen.we) : 'N/A', 
                     project2.kennzahlen?.we > 0 ? formatCurrency(total2 / project2.kennzahlen.we) : 'N/A']
        ];

        table.innerHTML = this.createComparisonTableHTML(data);
    }

    createComparisonTableHTML(data) {
        let html = '<table class="comparison-table-content">';
        data.forEach(row => {
            html += '<tr>';
            row.forEach((cell, index) => {
                const tag = index === 0 ? 'th' : 'td';
                html += `<${tag}>${cell}</${tag}>`;
            });
            html += '</tr>';
        });
        html += '</table>';
        return html;
    }

    createComparisonCostChart(project1, project2) {
        try {
            const ctx = Utils.findElement('#comparison-cost-chart');
            if (!ctx || typeof Chart === 'undefined') return;

            // Destroy existing chart
            if (this.charts.has('comparison')) {
                this.charts.get('comparison').destroy();
            }

            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Projekt 1', 'Projekt 2'],
                    datasets: [{
                        label: 'Gesamtkosten (€)',
                        data: [
                            this.calculateProjectTotal(project1),
                            this.calculateProjectTotal(project2)
                        ],
                        backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)'],
                        borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return formatCurrency(value);
                                }
                            }
                        }
                    }
                }
            });

            this.charts.set('comparison', chart);
        } catch (error) {
            Utils.handleError(error, 'Creating Comparison Cost Chart');
        }
    }

    filterStatisticsByProject(projectId) {
        // Filter all statistics by selected project
        if (projectId) {
            const projects = window.app?.projects || [];
            const selectedProject = projects.find(p => p.id === projectId);
            if (selectedProject) {
                this.currentProject = selectedProject;
                this.loadTabContent(this.activeTab);
            }
        } else {
            this.currentProject = null;
            this.loadTabContent(this.activeTab);
        }
    }

    generateReport() {
        try {
            const reportData = this.collectReportData();
            this.downloadReport(reportData);
            showNotification('Bericht wird generiert...', 'info');
        } catch (error) {
            Utils.handleError(error, 'Generating Report');
        }
    }

    collectReportData() {
        const projects = window.app?.projects || [];
        
        return {
            generatedAt: new Date().toISOString(),
            overview: {
                totalProjects: projects.length,
                totalVolume: projects.reduce((sum, p) => sum + this.calculateProjectTotal(p), 0),
                avgCostPerSqm: this.calculateAverageCostPerSqm(projects),
                avgCostDeviation: this.calculateAverageCostDeviation(projects)
            },
            projects: projects.map(project => ({
                name: project.name,
                status: project.status,
                totalCost: this.calculateProjectTotal(project),
                bgf: project.kennzahlen?.bgf || 0,
                costPerSqm: project.kennzahlen?.bgf > 0 ? 
                    this.calculateProjectTotal(project) / project.kennzahlen.bgf : 0
            })),
            benchmarks: this.calculateBenchmarks(projects)
        };
    }

    downloadReport(reportData) {
        const filename = Utils.generateFilename('Statistiken_Bericht', 'report', 'json');
        Utils.downloadJSON(reportData, filename);
    }

    exportStatistics() {
        try {
            showNotification('PDF-Export wird vorbereitet...', 'info');
            // Implementation for PDF export would go here
            // For now, export as JSON
            this.generateReport();
        } catch (error) {
            Utils.handleError(error, 'Exporting Statistics');
        }
    }

    refreshChart(chartType) {
        try {
            switch (chartType) {
                case 'status':
                    this.createProjectStatusChart();
                    break;
                case 'costGroups':
                    this.createCostGroupsChart();
                    break;
                case 'timeline':
                    this.createProjectTimelineChart();
                    break;
                default:
                    this.loadTabContent(this.activeTab);
            }
            showNotification('Chart erfolgreich aktualisiert', 'success');
        } catch (error) {
            Utils.handleError(error, `Refreshing chart: ${chartType}`);
        }
    }

    addProjectToComparison() {
        // Implementation for adding projects to comparison
        showNotification('Funktion in Entwicklung', 'info');
    }
}

// Export for global access
window.StatistikenModule = StatistikenModule; 