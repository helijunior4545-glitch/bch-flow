import { defineConfig } from "vite";
export default defineConfig({root:"frontend",build:{outDir:"../static/app_bch_flow/dist",emptyOutDir:true,manifest:true,rollupOptions:{input:"src/main.js"}}});
