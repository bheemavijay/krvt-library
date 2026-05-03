import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.krvt.library",
  appName: "KRVT Library",

  webDir: ".next",   // 👈 IMPORTANT CHANGE

  server: {
    url: "https://krvt-library-production.up.railway.app",
    cleartext: true
  }
};

export default config;