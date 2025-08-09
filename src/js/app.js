// src/js/app.js
import { setupMonacoEnvironment, createEditor, monaco } from './monaco-setup.js';
import { RegexEngine } from './regex-engine.js';

class RegexApp {
    constructor() {
        this.testStringEditor = null;
        this.regexEngine = new RegexEngine();
        this.currentMatches = [];
        this.currentDecorations = [];
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Regex App...');

            // Monaco Editor Setup
            await setupMonacoEnvironment();
            console.log('Monaco environment setup complete');

            // Initialize Test String Editor
            await this.initTestStringEditor();
            console.log('Test string editor initialized');

            // Event Listeners
            this.attachEventListeners();

            // Initial UI State
            this.updateUI();

            // Load saved data if exists
            this.loadSavedState();

            console.log('App initialization complete');
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    }

    async initTestStringEditor() {
        const container = document.getElementById('test-string-editor');

        if (!container) {
            console.error('Test string editor container not found!');
            return;
        }

        // Set explicit height
        container.style.height = '300px';
        container.style.position = 'relative';

        // Use createEditor from monaco-setup.js
        this.testStringEditor = createEditor(container, {
            value: 'The quick brown fox jumps over the lazy dog.\nPack my box with five dozen liquor jugs.\nHow vexingly quick daft zebras jump!',
            language: 'plaintext',
            theme: 'regex-dark'
        });

        if (!this.testStringEditor) {
            console.error('Failed to create test string editor');
            // Fallback to textarea
            this.initFallbackEditor();
            return;
        }

        // Listen for content changes
        this.testStringEditor.onDidChangeModelContent(() => {
            this.processRegex();
        });

        // Update cursor position
        this.testStringEditor.onDidChangeCursorPosition((e) => {
            document.getElementById('cursor-position').textContent =
                `Zeile ${e.position.lineNumber}, Spalte ${e.position.column}`;
        });
    }

    initFallbackEditor() {
        console.log('Initializing fallback editor...');
        const container = document.getElementById('test-string-editor');
        container.innerHTML = `
            <textarea 
                id="fallback-textarea" 
                style="width:100%;height:100%;background:#252525;color:#e0e0e0;border:none;padding:10px;font-family:monospace;font-size:14px;resize:none;"
            >The quick brown fox jumps over the lazy dog.
Pack my box with five dozen liquor jugs.
How vexingly quick daft zebras jump!</textarea>
        `;

        const textarea = document.getElementById('fallback-textarea');
        textarea.addEventListener('input', () => this.processRegex());

        // Store reference for getValue compatibility
        this.testStringEditor = {
            getValue: () => textarea.value,
            setValue: (val) => { textarea.value = val; },
            deltaDecorations: () => []
        };
    }

    attachEventListeners() {
        // Regex Input
        const regexInput = document.getElementById('regex-input');
        const regexFlags = document.getElementById('regex-flags');

        if (regexInput) {
            regexInput.addEventListener('input', () => this.processRegex());
        }
        if (regexFlags) {
            regexFlags.addEventListener('input', () => this.updateFlagsAndProcess());
        }

        // Flag Checkboxes
        document.querySelectorAll('.flag-option input').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateFlagsFromCheckboxes());
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Theme Toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                alert('Einstellungen werden in einer zukünftigen Version verfügbar sein.');
            });
        }

        // Clear Test String
        const clearBtn = document.getElementById('clear-test');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (this.testStringEditor && this.testStringEditor.setValue) {
                    this.testStringEditor.setValue('');
                } else if (this.testStringEditor && this.testStringEditor.getValue) {
                    // Fallback textarea
                    document.getElementById('fallback-textarea').value = '';
                }
            });
        }

        // Substitution Toggle
        const substToggle = document.getElementById('enable-substitution');
        if (substToggle) {
            substToggle.addEventListener('change', (e) => {
                const container = document.getElementById('substitution-container');
                if (container) {
                    container.style.display = e.target.checked ? 'block' : 'none';
                }
                if (e.target.checked) {
                    this.processRegex();
                }
            });
        }

        // Substitution Input
        const substInput = document.getElementById('substitution-input');
        if (substInput) {
            substInput.addEventListener('input', () => {
                if (document.getElementById('enable-substitution').checked) {
                    this.processRegex();
                }
            });
        }

        // Regex Flavor
        const flavorSelect = document.getElementById('regex-flavor');
        if (flavorSelect) {
            flavorSelect.addEventListener('change', () => this.processRegex());
        }

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveState();
            }
        });
    }

    updateFlagsFromCheckboxes() {
        const flags = [];
        document.querySelectorAll('.flag-option input:checked').forEach(checkbox => {
            flags.push(checkbox.dataset.flag);
        });
        document.getElementById('regex-flags').value = flags.join('');
        this.processRegex();
    }

    updateFlagsAndProcess() {
        const flagsInput = document.getElementById('regex-flags').value;
        const flags = flagsInput.split('');

        document.querySelectorAll('.flag-option input').forEach(checkbox => {
            checkbox.checked = flags.includes(checkbox.dataset.flag);
        });

        this.processRegex();
    }

    processRegex() {
        const pattern = document.getElementById('regex-input').value;
        const flags = document.getElementById('regex-flags').value;
        const testString = this.testStringEditor ? this.testStringEditor.getValue() : '';
        const flavor = document.getElementById('regex-flavor').value;

        if (!pattern) {
            this.clearResults();
            return;
        }

        const startTime = performance.now();

        try {
            const result = this.regexEngine.execute(pattern, flags, testString, flavor);

            if (document.getElementById('enable-substitution').checked) {
                const substitution = document.getElementById('substitution-input').value;
                result.substitution = this.regexEngine.substitute(pattern, flags, testString, substitution);
            }

            const executionTime = (performance.now() - startTime).toFixed(2);

            this.displayResults(result, executionTime);
            this.highlightMatches(result.matches);
            this.generateExplanation(pattern, flags);

            this.setStatus(`${result.matches.length} Treffer gefunden`, 'success');

        } catch (error) {
            this.setStatus(`Fehler: ${error.message}`, 'error');
            this.clearResults();
        }
    }

    highlightMatches(matches) {
        if (!this.testStringEditor || !this.testStringEditor.deltaDecorations) return;

        const model = this.testStringEditor.getModel();
        if (!model) return;

        const decorations = matches.map(match => {
            const startPos = model.getPositionAt(match.index);
            const endPos = model.getPositionAt(match.index + match[0].length);

            return {
                range: new monaco.Range(
                    startPos.lineNumber,
                    startPos.column,
                    endPos.lineNumber,
                    endPos.column
                ),
                options: {
                    className: 'regex-match-highlight',
                    hoverMessage: { value: `Match: ${match[0]}` }
                }
            };
        });

        this.currentDecorations = this.testStringEditor.deltaDecorations(
            this.currentDecorations,
            decorations
        );
    }

    displayResults(result, executionTime) {
        document.getElementById('match-count').textContent = result.matches.length;
        document.getElementById('exec-time').textContent = executionTime;

        const matchesList = document.getElementById('matches-list');
        matchesList.innerHTML = '';

        if (result.matches.length === 0) {
            matchesList.innerHTML = '<div class="no-matches">Keine Treffer gefunden</div>';
            return;
        }

        result.matches.forEach((match, index) => {
            const matchElement = document.createElement('div');
            matchElement.className = 'match-item';
            matchElement.innerHTML = `
                <div class="match-header">
                    <span class="match-number">Match ${index + 1}</span>
                    <span class="match-position">[${match.index}-${match.index + match[0].length}]</span>
                </div>
                <div class="match-content">
                    <code>${this.escapeHtml(match[0])}</code>
                </div>
                ${match.groups ? this.renderGroups(match.groups) : ''}
            `;
            matchesList.appendChild(matchElement);

            matchElement.addEventListener('click', () => this.showMatchDetails(match, index));
        });

        if (result.substitution !== undefined) {
            const substDiv = document.createElement('div');
            substDiv.className = 'substitution-result';
            substDiv.innerHTML = `
                <h4><i class="fas fa-exchange-alt"></i> Substitution Result:</h4>
                <pre>${this.escapeHtml(result.substitution)}</pre>
            `;
            matchesList.appendChild(substDiv);
        }
    }

    renderGroups(groups) {
        if (!groups || Object.keys(groups).length === 0) return '';

        let html = '<div class="match-groups">';
        for (const [key, value] of Object.entries(groups)) {
            if (value !== undefined) {
                html += `
                    <div class="group-item">
                        <span class="group-name">Group ${key}:</span>
                        <code>${this.escapeHtml(value)}</code>
                    </div>
                `;
            }
        }
        html += '</div>';
        return html;
    }

    generateExplanation(pattern, flags) {
        const explanationDiv = document.getElementById('regex-explanation');

        try {
            const explanation = this.regexEngine.explain(pattern, flags);
            explanationDiv.innerHTML = explanation;
        } catch (error) {
            explanationDiv.innerHTML = `<div class="error">Erklärung konnte nicht generiert werden: ${error.message}</div>`;
        }
    }

    showMatchDetails(match, index) {
        this.switchTab('details');

        const detailsDiv = document.getElementById('match-details');
        let html = `
            <h3>Match ${index + 1} Details</h3>
            <div class="detail-item">
                <strong>Full Match:</strong>
                <code>${this.escapeHtml(match[0])}</code>
            </div>
            <div class="detail-item">
                <strong>Position:</strong>
                <span>${match.index} - ${match.index + match[0].length}</span>
            </div>
        `;

        if (match.length > 1) {
            html += '<h4>Capturing Groups:</h4>';
            for (let i = 1; i < match.length; i++) {
                if (match[i] !== undefined) {
                    html += `
                        <div class="detail-item">
                            <strong>Group ${i}:</strong>
                            <code>${this.escapeHtml(match[i])}</code>
                        </div>
                    `;
                }
            }
        }

        detailsDiv.innerHTML = html;
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}-tab`);
        });
    }

    toggleTheme() {
        const body = document.body;
        const isLight = body.classList.toggle('light-theme');
        const themeIcon = document.querySelector('#theme-toggle i');

        if (isLight) {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            monaco.editor.setTheme('regex-light');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            monaco.editor.setTheme('regex-dark');
        }

        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    }

    clearResults() {
        document.getElementById('match-count').textContent = '0';
        document.getElementById('exec-time').textContent = '0';
        document.getElementById('matches-list').innerHTML = '<div class="no-matches">Keine Treffer</div>';

        if (this.currentDecorations && this.testStringEditor && this.testStringEditor.deltaDecorations) {
            this.testStringEditor.deltaDecorations(this.currentDecorations, []);
            this.currentDecorations = [];
        }
    }

    setStatus(message, type = 'info') {
        const statusMessage = document.getElementById('status-message');
        statusMessage.textContent = message;
        statusMessage.className = `status-${type}`;

        setTimeout(() => {
            statusMessage.textContent = 'Bereit';
            statusMessage.className = '';
        }, 3000);
    }

    saveState() {
        const state = {
            regex: document.getElementById('regex-input').value,
            flags: document.getElementById('regex-flags').value,
            testString: this.testStringEditor ? this.testStringEditor.getValue() : '',
            flavor: document.getElementById('regex-flavor').value,
            substitution: document.getElementById('substitution-input').value,
            substitutionEnabled: document.getElementById('enable-substitution').checked
        };

        localStorage.setItem('regexAppState', JSON.stringify(state));
        this.setStatus('Gespeichert!', 'success');
    }

    loadSavedState() {
        const savedState = localStorage.getItem('regexAppState');
        if (!savedState) return;

        try {
            const state = JSON.parse(savedState);

            document.getElementById('regex-input').value = state.regex || '';
            document.getElementById('regex-flags').value = state.flags || '';

            if (this.testStringEditor) {
                if (this.testStringEditor.setValue) {
                    this.testStringEditor.setValue(state.testString || '');
                } else if (document.getElementById('fallback-textarea')) {
                    document.getElementById('fallback-textarea').value = state.testString || '';
                }
            }

            document.getElementById('regex-flavor').value = state.flavor || 'javascript';
            document.getElementById('substitution-input').value = state.substitution || '';
            document.getElementById('enable-substitution').checked = state.substitutionEnabled || false;

            if (state.substitutionEnabled) {
                const container = document.getElementById('substitution-container');
                if (container) {
                    container.style.display = 'block';
                }
            }

            this.updateFlagsAndProcess();

            if (state.regex) {
                this.processRegex();
            }
        } catch (error) {
            console.error('Failed to load saved state:', error);
        }
    }

    updateUI() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            this.toggleTheme();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new RegexApp();
});

export default RegexApp;