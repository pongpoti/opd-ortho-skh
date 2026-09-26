import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Chromium + puppeteer must stay external so Next does not bundle the
  // binary-heavy packages into the serverless trace incorrectly.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Ensure poster CSS/fonts are available to the print-image route at runtime.
  outputFileTracingIncludes: {
    "/api/duty-schedule/print-image": [
      "./src/modules/duty-schedule/print-poster/**/*",
    ],
  },
};

export default nextConfig;
