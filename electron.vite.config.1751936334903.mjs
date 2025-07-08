// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve("src/renderer/index.html"),
          settings: resolve("src/renderer/settings.html")
        }
      }
    },
    plugins: [react(), tailwindcss()]
  }
});
export {
  electron_vite_config_default as default
};
