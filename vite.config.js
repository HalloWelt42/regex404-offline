// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: './',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            },
            output: {
                manualChunks: {
                    'monaco': ['monaco-editor']
                }
            }
        }
    },
    optimizeDeps: {
        include: ['monaco-editor'],
        exclude: []
    },
    server: {
        port: 5173,
        open: true,
        fs: {
            strict: false
        }
    },
    worker: {
        format: 'es'
    }
});