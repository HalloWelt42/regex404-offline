// src/js/monaco-setup.js
import * as monaco from 'monaco-editor';

// Worker setup für Vite
self.MonacoEnvironment = {
    getWorker: function (workerId, label) {
        const getWorkerModule = (moduleUrl, label) => {
            return new Worker(self.MonacoEnvironment.getWorkerUrl(moduleUrl, label), {
                name: label,
                type: 'module'
            });
        };

        switch (label) {
            case 'json':
                return getWorkerModule('/monaco-editor/esm/vs/language/json/json.worker?worker', label);
            case 'css':
            case 'scss':
            case 'less':
                return getWorkerModule('/monaco-editor/esm/vs/language/css/css.worker?worker', label);
            case 'html':
            case 'handlebars':
            case 'razor':
                return getWorkerModule('/monaco-editor/esm/vs/language/html/html.worker?worker', label);
            case 'typescript':
            case 'javascript':
                return getWorkerModule('/monaco-editor/esm/vs/language/typescript/ts.worker?worker', label);
            default:
                return getWorkerModule('/monaco-editor/esm/vs/editor/editor.worker?worker', label);
        }
    }
};

// Monaco Environment Setup
export async function setupMonacoEnvironment() {
    // Warte kurz damit Monaco vollständig geladen ist
    await new Promise(resolve => setTimeout(resolve, 100));

    // Registriere Dark Theme
    monaco.editor.defineTheme('regex-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#252525',
        }
    });

    // Registriere Light Theme
    monaco.editor.defineTheme('regex-light', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#ffffff',
        }
    });

    return monaco;
}

// Create Editor Helper
export function createEditor(container, options = {}) {
    // Stelle sicher dass der Container existiert
    if (!container) {
        console.error('Container for Monaco Editor not found!');
        return null;
    }

    const defaultOptions = {
        value: 'The quick brown fox jumps over the lazy dog.\nPack my box with five dozen liquor jugs.\nHow vexingly quick daft zebras jump!',
        language: 'plaintext',
        theme: 'regex-dark',
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Courier New", monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        automaticLayout: true,
        padding: { top: 10, bottom: 10 },
        folding: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 3,
        renderLineHighlight: 'all',
        scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10
        }
    };

    try {
        const editor = monaco.editor.create(container, {
            ...defaultOptions,
            ...options
        });

        console.log('Monaco Editor created successfully');
        return editor;
    } catch (error) {
        console.error('Error creating Monaco Editor:', error);
        return null;
    }
}

export { monaco };
export default monaco;
