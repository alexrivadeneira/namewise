import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60000, // generous timeout since we're hitting real APIs
  retries: 0,
  workers: 1, // run sequentially — tests depend on each other's DB state
  use: {
    baseURL: "http://localhost:3001",
    headless: false,
    video: "retain-on-failure",
    permissions: ["microphone"],
    launchOptions: {
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev:test",
    port: 3001,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
