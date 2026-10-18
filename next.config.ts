import type { NextConfig } from "next";

// NEXT_PUBLIC_SPA=1 bouwt een statische single-page versie (out/) die zonder
// server draait, bijvoorbeeld als claude.ai-artifact. Zie scripts/build-artifact.mjs.
const spa = process.env.NEXT_PUBLIC_SPA === "1";

const nextConfig: NextConfig = spa
  ? { output: "export", images: { unoptimized: true }, distDir: ".next-spa" }
  : {};

export default nextConfig;
