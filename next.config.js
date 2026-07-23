/** @type {import('next').NextConfig} */

// basePath is empty for local dev, and set to "/<repo>" by the Pages workflow so
// assets resolve under the project-pages subpath.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export", // fully static — no server needed (GitHub Pages friendly)
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};

module.exports = nextConfig;
