import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        // 简单的代码分割
        manualChunks: {
          // React 核心 + UI 库
          "vendor-react": [
            "react",
            "react-dom",
            "react-router-dom",
            "lucide-react",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-context-menu",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-label",
            "@radix-ui/react-select",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-separator",
            "radix-ui",
          ],
          // 其他工具库
          vendor: [
            "zustand",
            "axios",
            "i18next",
            "react-i18next",
            "@dnd-kit/core",
            "@dnd-kit/sortable",
            "@dnd-kit/utilities",
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
          ],
        },
      },
    },
    minify: "esbuild",
    chunkSizeWarningLimit: 500,
  },
});
