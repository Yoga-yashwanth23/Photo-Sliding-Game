import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    build: {
        sourcemap: false,
        // Manual chunking keeps vendor code cacheable separately from game code,
        // which matters once puzzle packs / achievements / admin panels are added.
        // Vite 8's Rolldown-based bundler requires manualChunks as a function
        // rather than the old static id-array map.
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (!id.includes('node_modules'))
                        return undefined;
                    if (/react-router-dom|react-router|\/react\/|\/react-dom\//.test(id))
                        return 'vendor';
                    if (id.includes('framer-motion'))
                        return 'motion';
                    if (id.includes('zustand'))
                        return 'state';
                    return 'vendor';
                },
            },
        },
    },
});
