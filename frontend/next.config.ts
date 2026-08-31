import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

// Resolve the correct Turbopack root for BOTH environments:
//  - Local monorepo: deps are installed from the repo root and `next` is
//    hoisted to ../node_modules, so the root must be the monorepo root.
//  - Vercel (Root Directory = frontend/): an isolated `npm install` puts
//    `next` in ./node_modules, so the root must be this directory.
// Picking the wrong one makes Turbopack refuse to compile (files outside the
// project root) or emit the multi-lockfile inference warning. Detect which
// layout we're in by where `next/package.json` actually resolves.
const frontendDir = __dirname;
const monorepoRoot = path.join(__dirname, "..");
const nextIsLocalToFrontend = fs.existsSync(
  path.join(frontendDir, "node_modules", "next", "package.json"),
);
const turbopackRoot = nextIsLocalToFrontend ? frontendDir : monorepoRoot;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: turbopackRoot,
  },
};

export default nextConfig;
