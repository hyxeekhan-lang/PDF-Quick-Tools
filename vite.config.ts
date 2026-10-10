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
  // The stylesheet name must be identical in the client and server builds.
  //
  // Vercel's build produced dist/client/assets/styles-<clientHash>.css and
  // dist/server/assets/styles-<serverHash>.css, and the prerendered HTML
  // embedded the *server* hash. Vercel serves dist/client, so that file did
  // not exist there: the SPA rewrite returned index.html instead, the browser
  // refused it as "MIME type 'text/html' is not a supported stylesheet", and
  // the site rendered with no CSS at all. That accounts for the CLS of 1.0 and
  // the hydration error — both are the same 404.
  //
  // A stable name makes the two builds agree by construction instead of by
  // luck. Applied to the stylesheet only — the images and other assets in this
  // directory are content-addressed for a reason, and stripping their hashes
  // would leave them cached forever under the /assets/* immutable header.
  build: {
    rollupOptions: {
      output: {
        ...(isSsrBuild ? { entryFileNames: 'index.js' } : {}),
        assetFileNames: (assetInfo) =>
          /styles/.test(assetInfo.names?.[0] ?? '')
            ? 'assets/[name][extname]'
            : 'assets/[name]-[hash][extname]',
      },
    },
  },
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
