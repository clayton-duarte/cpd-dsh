/** Verify the same bundle layers shared by Web and the private Desktop Host. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { composeEntries, loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { expect, it } from 'vitest'

it('keeps feedback mounted without product analytics or session-log exporters', () => {
  const webManifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    dsh: { bundle: { patch: string[] } }
  }
  const paths = [
    new URL('../../base/cordis.patch.yml', import.meta.url),
    ...webManifest.dsh.bundle.patch.map(path => new URL(path, new URL('../', import.meta.url))),
  ]
  const rows = composeEntries(paths.map(path => loadOverlayPatches('no-product-telemetry', fileURLToPath(path))))
  for (const name of [
    '@deepseek-ai/dsh-client-product-analytics',
    '@deepseek-ai/dsh-host-product-telemetry-otel',
    '@deepseek-ai/dsh-session-telemetry-otel',
    '@deepseek-ai/dsh-session-log-deepseek',
    '@deepseek-ai/dsh-plugin-package-inventory-deepseek',
    '@deepseek-ai/dsh-client-ui-settings-session-log',
  ]) {
    expect(rows.some(row => row.name === name), name).toBe(false)
  }
  expect(rows.map(row => row.name)).toEqual(expect.arrayContaining([
    '@deepseek-ai/dsh-command-feedback',
    '@deepseek-ai/dsh-message-feedback',
    '@deepseek-ai/dsh-client-ui-message-feedback',
  ]))
})
