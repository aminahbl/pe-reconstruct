import { defineConfig } from 'astro/config'

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'pe-reconstruct'
const owner = process.env.GITHUB_REPOSITORY?.split('/')[0] ?? 'aminahbl'
const site = process.env.SITE_URL ?? `https://${owner}.github.io/${repository}`
const isGithubActions = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  output: 'static',
  site,
  base: isGithubActions ? `/${repository}/` : '/',
  vite: {
    server: {
      fs: {
        allow: ['..']
      }
    }
  }
})
