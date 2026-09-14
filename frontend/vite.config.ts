import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({root:'.',server:{port:5173},build:{outDir:'dist',emptyOutDir:true,rollupOptions:{input:{index:resolve(__dirname,'index.html'),app:resolve(__dirname,'zenit-protocol.html')}}}});
