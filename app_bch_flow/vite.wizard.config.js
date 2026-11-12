import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({build:{outDir:'static/app_bch_flow/js',emptyOutDir:false,target:'es2022',minify:'esbuild',lib:{entry:resolve(import.meta.dirname,'frontend/src/wizardconnect.js'),formats:['es'],fileName:()=> 'wizardconnect.js'},rollupOptions:{output:{inlineDynamicImports:true,banner:'/*! WizardConnect core 0.2.5 / dapp 0.2.2 · Copyright (C) 2026 Whiterun LLC · LGPL-3.0-or-later. Source/build recipe: app_bch_flow/docs/WIZARDCONNECT.md. Third-party notices: ../vendor/WIZARD-THIRD-PARTY-NOTICES.txt */'}}}});
