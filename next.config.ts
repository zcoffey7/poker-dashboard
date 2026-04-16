import type { NextConfig } from "next";

// When building for GitHub Pages (a project site at
// https://<user>.github.io/<repo>), we need a basePath equal to "/<repo>" so
// that all assets resolve correctly. The GitHub Actions workflow sets this
// via the GITHUB_PAGES env var. Locally (`npm run dev`) it stays empty, so
// the app runs at `/` as usual.
const isGithubPages = process.env.GITHUB_PAGES === "true";
const repoName = process.env.NEXT_PUBLIC_BASE_PATH ?? "/poker-dashboard";
const basePath = isGithubPages ? repoName : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
