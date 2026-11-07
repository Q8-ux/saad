import{defineConfig}from'vite';import react from'@vitejs/plugin-react';import path from'node:path';
export default defineConfig({root:path.resolve('github'),base:'./',publicDir:path.resolve('public'),plugins:[react()],build:{outDir:path.resolve('github-dist'),emptyOutDir:true}});
