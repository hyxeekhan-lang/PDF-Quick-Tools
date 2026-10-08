import { whop } from '@whop/cli/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const whopServerEntry = {
  name: 'whop-server-entry',
  async closeBundle() {
    const serverDir = join(process.cwd(), 'dist', 'server')

    try {
      await copyFile(join(serverDir, 'server.js'), join(serverDir, 'index.js'))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  },
}

export default defineConfig(({ isSsrBuild }) => ({
  resolve: { tsconfigPaths: true },
  build: isSsrBuild
    ? {
        rollupOptions: {
          output: {
            entryFileNames: 'index.js',
          },
        },
      }
    : undefined,
  plugins: [
    whopServerEntry,
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    whop({ disableTanstackDevtools: true }),
    devtools(),
    tailwindcss(),
    tanstackStart({
      // Every route here is a static path, so each one is rendered to real HTML
      // at build time. Without this the Vercel rewrite would hand the same SPA
      // shell to every URL, so crawlers would see one empty page for all of
      // them. `crawlLinks` walks the app's own links from the home page, which
      // means a new tool route is picked up here with no list to maintain.
      //
      // The sitemap itself stays with `scripts/generate-sitemap.mjs`, which
      // already derives it from the route directory and assigns per-page
      // priorities that TanStack's generator does not know about.
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: true,
        crawlLinks: true,
        concurrency: 8,
        retryCount: 2,
        failOnError: true,
      },
    }),
    viteReact(),
    whopServerEntry,
  ],
}))
