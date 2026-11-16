import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "static/app_bch_flow/js",
    emptyOutDir: false,
    target: "es2022",
    lib: {
      entry: resolve(
        import.meta.dirname,
        "frontend/src/financial-workspace.js",
      ),
      name: "BCHFlowWorkspace",
      formats: ["iife"],
      fileName: () => "financial-workspace.js",
    },
    rollupOptions: {
      output: {
        banner:
          "/*! BCH Flow workspace · Motion (MIT) · source: frontend/src/financial-workspace.js; notices: ../vendor/WORKSPACE-NOTICES.txt */",
      },
    },
  },
});
