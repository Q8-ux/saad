import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = isGitHubPages
  ? {
      output: 'export',
      basePath: '/saad',
      assetPrefix: '/saad/',
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      output: 'standalone',
    };

export default nextConfig;
