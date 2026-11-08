import { defineConfig } from 'vite';
export default defineConfig({
    base: './',
    build: {
        target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 650,
        rollupOptions: { output: { manualChunks(id) {
                    if (id.includes('node_modules/three'))
                        return 'three';
                    if (id.includes('node_modules/@codemirror') || id.includes('node_modules/@lezer') || id.includes('node_modules/style-mod') || id.includes('node_modules/w3c-keyname'))
                        return 'editor';
                } } }
    },
    server: { host: '127.0.0.1' }
});
