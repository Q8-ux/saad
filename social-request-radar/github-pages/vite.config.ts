import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),base:'./',plugins:[react()],resolve:{alias:{'@':fileURLToPath(new URL('..',import.meta.url))}},build:{outDir:'../pages-dist',emptyOutDir:true,rollupOptions:{output:{entryFileNames:'assets/radar.js',chunkFileNames:'assets/[name].js',assetFileNames:'assets/[name][extname]'}}}});
