/**
 * Historie Module
 * Versionierung und Änderungsprotokoll für Projekte
 */

class HistorieModule {
    constructor() {
        this.currentProject = null;
        this.init();
    }

    init() {
        try {
            this.setupEventListeners();
        } catch (error) {
            Utils.handleError(error, 'Historie Module Initialization');
        }
    }

    setupEventListeners() {
        try {
            // Create Snapshot Button
            const createBtn = Utils.findElement('#create-snapshot-btn');
            if (createBtn) {
                createBtn.addEventListener('click', () => this.createSnapshot());
            }

            // Compare Snapshots Button
            const compareBtn = Utils.findElement('#compare-snapshots-btn');
            if (compareBtn) {
                compareBtn.addEventListener('click', () => this.compareSnapshots());
            }
        } catch (error) {
            Utils.handleError(error, 'Setting up Historie Event Listeners');
        }
    }

    loadProject(project) {
        try {
            this.currentProject = project;
            if (project) {
                this.renderSnapshots();
                this.renderChangelog();
                showNotification(`Historie für "${project.name}" geladen`, 'success');
            }
        } catch (error) {
            Utils.handleError(error, 'Loading Project in Historie');
        }
    }

    renderSnapshots() {
        if (!this.currentProject) return;

        try {
            const container = Utils.findElement('#snapshots-grid');
            if (!container) return;

            container.innerHTML = '';

            const snapshots = this.currentProject.snapshots || [];
            
            if (snapshots.length === 0) {
                container.innerHTML = '<p class="text-muted">Keine Snapshots vorhanden</p>';
                return;
            }

            snapshots.forEach(snapshot => {
                const card = this.createSnapshotCard(snapshot);
                container.appendChild(card);
            });
        } catch (error) {
            Utils.handleError(error, 'Rendering Snapshots');
        }
    }

    createSnapshotCard(snapshot) {
        const card = Utils.createElement('div', 'snapshot-card');
        
        card.innerHTML = `
            <div class="snapshot-header">
                <h4>${snapshot.name}</h4>
                <small>${Utils.formatDateTime(snapshot.timestamp)}</small>
            </div>
            <div class="snapshot-actions">
                <button class="btn btn-sm btn-primary" onclick="historieModule.restoreSnapshot('${snapshot.id}')">
                    <i class="fas fa-undo"></i> Wiederherstellen
                </button>
                <button class="btn btn-sm btn-info" onclick="historieModule.viewSnapshot('${snapshot.id}')">
                    <i class="fas fa-eye"></i> Anzeigen
                </button>
                <button class="btn btn-sm btn-danger" onclick="historieModule.deleteSnapshot('${snapshot.id}')">
                    <i class="fas fa-trash"></i> Löschen
                </button>
            </div>
        `;

        return card;
    }

    renderChangelog() {
        if (!this.currentProject) return;

        try {
            const container = Utils.findElement('#changelog-container');
            if (!container) return;

            container.innerHTML = '';

            const historie = this.currentProject.historie || [];
            
            if (historie.length === 0) {
                container.innerHTML = '<p class="text-muted">Keine Änderungen protokolliert</p>';
                return;
            }

            historie.forEach(entry => {
                const item = this.createChangelogItem(entry);
                container.appendChild(item);
            });
        } catch (error) {
            Utils.handleError(error, 'Rendering Changelog');
        }
    }

    createChangelogItem(entry) {
        const item = Utils.createElement('div', 'changelog-item');
        
        const detailsHtml = entry.details ? 
            Object.entries(entry.details).map(([key, value]) => 
                `<small><strong>${key}:</strong> ${JSON.stringify(value)}</small>`
            ).join('<br>') : '';
        
        item.innerHTML = `
            <div class="changelog-header">
                <span class="changelog-action">${entry.action}</span>
                <span class="changelog-timestamp">${Utils.formatDateTime(entry.timestamp)}</span>
            </div>
            ${detailsHtml ? `<div class="changelog-details">${detailsHtml}</div>` : ''}
        `;

        return item;
    }

    createSnapshot() {
        try {
            if (!this.currentProject) {
                showNotification('Kein Projekt ausgewählt', 'warning');
                return;
            }

            const name = prompt('Name für den Snapshot:');
            if (!name || name.trim().length === 0) {
                return;
            }

            const snapshot = window.app.createSnapshot(this.currentProject.id, name.trim());
            if (snapshot) {
                this.renderSnapshots();
                showNotification('Snapshot erfolgreich erstellt', 'success');
            }
        } catch (error) {
            Utils.handleError(error, 'Creating Snapshot');
        }
    }

    restoreSnapshot(snapshotId) {
        try {
            const snapshot = this.getSnapshotById(snapshotId);
            if (!snapshot) {
                showNotification('Snapshot nicht gefunden', 'error');
                return;
            }

            const confirmed = confirm(`Möchten Sie wirklich zum Snapshot "${snapshot.name}" zurückkehren?\n\nAlle aktuellen Änderungen gehen verloren!`);
            if (!confirmed) return;

            // Restore project data
            const restoredData = Utils.deepClone(snapshot.data);
            Object.assign(this.currentProject, restoredData);
            
            window.app.saveData(false);
            window.app.addHistoryEntry(this.currentProject.id, 'Snapshot wiederhergestellt', { 
                snapshotName: snapshot.name,
                snapshotId: snapshotId 
            });

            // Refresh all modules
            this.refreshAllModules();
            showNotification(`Snapshot "${snapshot.name}" wiederhergestellt`, 'success');
        } catch (error) {
            Utils.handleError(error, 'Restoring Snapshot');
        }
    }

    viewSnapshot(snapshotId) {
        try {
            const snapshot = this.getSnapshotById(snapshotId);
            if (!snapshot) {
                showNotification('Snapshot nicht gefunden', 'error');
                return;
            }

            const modal = Utils.createModal({
                title: `Snapshot: ${snapshot.name}`,
                size: 'large',
                content: this.createSnapshotViewHTML(snapshot),
                buttons: [
                    {
                        text: 'Schließen',
                        className: 'btn-secondary',
                        handler: () => Utils.closeModal(modal)
                    }
                ]
            });
        } catch (error) {
            Utils.handleError(error, 'Viewing Snapshot');
        }
    }

    createSnapshotViewHTML(snapshot) {
        return `
            <div class="snapshot-view">
                <h4>Snapshot-Informationen</h4>
                <ul>
                    <li><strong>Name:</strong> ${snapshot.name}</li>
                    <li><strong>Erstellt:</strong> ${Utils.formatDateTime(snapshot.timestamp)}</li>
                    <li><strong>Projekt:</strong> ${snapshot.data.name}</li>
                    <li><strong>Status:</strong> ${snapshot.data.status}</li>
                </ul>
                
                <h4>Kennzahlen</h4>
                <ul>
                    <li><strong>BGF:</strong> ${formatNumber(snapshot.data.kennzahlen?.bgf || 0)} m²</li>
                    <li><strong>BRI:</strong> ${formatNumber(snapshot.data.kennzahlen?.bri || 0)} m³</li>
                    <li><strong>WFL:</strong> ${formatNumber(snapshot.data.kennzahlen?.wfl || 0)} m²</li>
                    <li><strong>WE:</strong> ${snapshot.data.kennzahlen?.we || 0}</li>
                </ul>
                
                <h4>Kalkulation (Top 5)</h4>
                <ul>
                    ${this.getTopKalkulationItems(snapshot.data.kalkulation).map(item => 
                        `<li><strong>KG ${item.kg}:</strong> ${formatCurrency(item.betrag)}</li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }

    getTopKalkulationItems(kalkulation) {
        if (!kalkulation) return [];
        
        return Object.entries(kalkulation)
            .map(([kg, data]) => ({ kg, betrag: data.betrag || 0 }))
            .sort((a, b) => b.betrag - a.betrag)
            .slice(0, 5);
    }

    deleteSnapshot(snapshotId) {
        try {
            const snapshot = this.getSnapshotById(snapshotId);
            if (!snapshot) {
                showNotification('Snapshot nicht gefunden', 'error');
                return;
            }

            const confirmed = confirm(`Möchten Sie den Snapshot "${snapshot.name}" wirklich löschen?`);
            if (!confirmed) return;

            const snapshots = this.currentProject.snapshots || [];
            const index = snapshots.findIndex(s => s.id === snapshotId);
            
            if (index !== -1) {
                snapshots.splice(index, 1);
                window.app.saveData(false);
                window.app.addHistoryEntry(this.currentProject.id, 'Snapshot gelöscht', { 
                    snapshotName: snapshot.name 
                });
                
                this.renderSnapshots();
                showNotification('Snapshot gelöscht', 'success');
            }
        } catch (error) {
            Utils.handleError(error, 'Deleting Snapshot');
        }
    }

    compareSnapshots() {
        try {
            if (!this.currentProject) {
                showNotification('Kein Projekt ausgewählt', 'warning');
                return;
            }

            const snapshots = this.currentProject.snapshots || [];
            if (snapshots.length < 2) {
                showNotification('Mindestens 2 Snapshots für Vergleich benötigt', 'warning');
                return;
            }

            const modal = Utils.createModal({
                title: 'Snapshots vergleichen',
                size: 'large',
                content: this.createCompareSnapshotsHTML(snapshots),
                buttons: [
                    {
                        text: 'Schließen',
                        className: 'btn-secondary',
                        handler: () => Utils.closeModal(modal)
                    },
                    {
                        text: 'Vergleichen',
                        className: 'btn-primary',
                        handler: () => this.performSnapshotComparison(modal)
                    }
                ]
            });
        } catch (error) {
            Utils.handleError(error, 'Comparing Snapshots');
        }
    }

    createCompareSnapshotsHTML(snapshots) {
        const currentSnapshot = {
            id: 'current',
            name: 'Aktuelle Version',
            timestamp: new Date().toISOString(),
            data: this.currentProject
        };

        const allSnapshots = [currentSnapshot, ...snapshots];

        return `
            <div class="snapshot-comparison">
                <div class="form-group">
                    <label>Snapshot 1:</label>
                    <select id="snapshot1-select">
                        ${allSnapshots.map(s => 
                            `<option value="${s.id}">${s.name} (${Utils.formatDate(s.timestamp)})</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Snapshot 2:</label>
                    <select id="snapshot2-select">
                        ${allSnapshots.map((s, index) => 
                            `<option value="${s.id}" ${index === 1 ? 'selected' : ''}>${s.name} (${Utils.formatDate(s.timestamp)})</option>`
                        ).join('')}
                    </select>
                </div>
                <div id="comparison-result">
                    <p class="text-muted">Wählen Sie zwei Snapshots aus und klicken Sie auf "Vergleichen"</p>
                </div>
            </div>
        `;
    }

    performSnapshotComparison(modal) {
        try {
            const snapshot1Id = modal.querySelector('#snapshot1-select').value;
            const snapshot2Id = modal.querySelector('#snapshot2-select').value;

            if (snapshot1Id === snapshot2Id) {
                showNotification('Bitte wählen Sie zwei verschiedene Snapshots aus', 'warning');
                return;
            }

            const snapshot1 = this.getSnapshotById(snapshot1Id);
            const snapshot2 = this.getSnapshotById(snapshot2Id);

            if (!snapshot1 || !snapshot2) {
                showNotification('Snapshots nicht gefunden', 'error');
                return;
            }

            const comparison = this.compareSnapshotData(snapshot1.data, snapshot2.data);
            const resultContainer = modal.querySelector('#comparison-result');
            
            if (resultContainer) {
                resultContainer.innerHTML = this.createComparisonResultHTML(
                    snapshot1.name, 
                    snapshot2.name, 
                    comparison
                );
            }
        } catch (error) {
            Utils.handleError(error, 'Performing Snapshot Comparison');
        }
    }

    compareSnapshotData(data1, data2) {
        const changes = {
            basic: {},
            kennzahlen: {},
            kalkulation: {}
        };

        // Basic project data
        ['name', 'status', 'description'].forEach(field => {
            if (data1[field] !== data2[field]) {
                changes.basic[field] = { old: data1[field], new: data2[field] };
            }
        });

        // Kennzahlen
        if (data1.kennzahlen && data2.kennzahlen) {
            ['bgf', 'bri', 'wfl', 'we'].forEach(field => {
                const val1 = data1.kennzahlen[field] || 0;
                const val2 = data2.kennzahlen[field] || 0;
                if (val1 !== val2) {
                    changes.kennzahlen[field] = { old: val1, new: val2, diff: val2 - val1 };
                }
            });
        }

        // Kalkulation
        const allKGs = new Set([
            ...Object.keys(data1.kalkulation || {}),
            ...Object.keys(data2.kalkulation || {})
        ]);

        allKGs.forEach(kg => {
            const val1 = data1.kalkulation?.[kg]?.betrag || 0;
            const val2 = data2.kalkulation?.[kg]?.betrag || 0;
            if (val1 !== val2) {
                changes.kalkulation[kg] = { 
                    old: val1, 
                    new: val2, 
                    diff: val2 - val1,
                    name: data2.kalkulation?.[kg]?.name || data1.kalkulation?.[kg]?.name || kg
                };
            }
        });

        return changes;
    }

    createComparisonResultHTML(name1, name2, changes) {
        let html = `<h4>Vergleich: ${name1} vs ${name2}</h4>`;

        // Basic changes
        if (Object.keys(changes.basic).length > 0) {
            html += '<h5>Projektdaten</h5><ul>';
            Object.entries(changes.basic).forEach(([field, change]) => {
                html += `<li><strong>${field}:</strong> "${change.old}" → "${change.new}"</li>`;
            });
            html += '</ul>';
        }

        // Kennzahlen changes
        if (Object.keys(changes.kennzahlen).length > 0) {
            html += '<h5>Kennzahlen</h5><ul>';
            Object.entries(changes.kennzahlen).forEach(([field, change]) => {
                const diffText = change.diff > 0 ? `(+${formatNumber(change.diff)})` : `(${formatNumber(change.diff)})`;
                html += `<li><strong>${field.toUpperCase()}:</strong> ${formatNumber(change.old)} → ${formatNumber(change.new)} ${diffText}</li>`;
            });
            html += '</ul>';
        }

        // Kalkulation changes
        if (Object.keys(changes.kalkulation).length > 0) {
            html += '<h5>Kalkulation</h5><ul>';
            Object.entries(changes.kalkulation).forEach(([kg, change]) => {
                const diffText = change.diff > 0 ? `(+${formatCurrency(change.diff)})` : `(${formatCurrency(change.diff)})`;
                html += `<li><strong>KG ${kg} (${change.name}):</strong> ${formatCurrency(change.old)} → ${formatCurrency(change.new)} ${diffText}</li>`;
            });
            html += '</ul>';
        }

        if (Object.keys(changes.basic).length === 0 && 
            Object.keys(changes.kennzahlen).length === 0 && 
            Object.keys(changes.kalkulation).length === 0) {
            html += '<p>Keine Unterschiede gefunden.</p>';
        }

        return html;
    }

    getSnapshotById(snapshotId) {
        if (snapshotId === 'current') {
            return {
                id: 'current',
                name: 'Aktuelle Version',
                timestamp: new Date().toISOString(),
                data: this.currentProject
            };
        }
        
        const snapshots = this.currentProject?.snapshots || [];
        return snapshots.find(s => s.id === snapshotId);
    }

    refreshAllModules() {
        // Refresh all other modules with current project data
        if (window.kalkulationModule) {
            window.kalkulationModule.loadProject(this.currentProject);
        }
        if (window.baukostenModule) {
            window.baukostenModule.loadProject(this.currentProject);
        }
        if (window.liquiditaetModule) {
            window.liquiditaetModule.loadProject(this.currentProject);
        }
        if (window.ausfuehrungModule) {
            window.ausfuehrungModule.loadProject(this.currentProject);
        }
        if (window.projectsModule) {
            window.projectsModule.renderProjects();
        }
    }
}

// Export for global access
window.HistorieModule = HistorieModule; 