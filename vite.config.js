import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 프론트엔드의 /api/claude 요청을 로컬 Express 프록시(8787)로 전달
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
