// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  // TODO: replace with https://rjleyva.com once own the domain
  site: "https://bcc.rjleyva-045.workers.dev",
  server: {
    port: 3000,
    host: true,
  },
});
