/** The shipped Web profile sends model input without attaching log or package inventory metadata. */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { expect, it, onTestFinished } from 'vitest'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { startMockLlmServer } from '@deepseek-ai/dsh-llm-mock-server'
import { launchWebScaffold, webSnapshotMode } from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, openSettings } from './support.ts'

it.skipIf(webSnapshotMode() === 'record')('omits session-log and package inventory attachments without disabling inference', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-no-upload-browser-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const server = await startMockLlmServer({ sequence: ['success'], successText: 'LOCAL_FIXTURE_DONE' })
  onTestFinished(() => server.close())
  const key = credentialRef('DSH_NO_UPLOAD_FIXTURE_KEY')
  const overlay = join(root, 'loopback.yml')
  await writeFile(overlay, JSON.stringify([
    { id: 'llm-deepseek', config: { baseURL: server.baseURL, apiKeyEnv: key } },
    { id: 'agent-default-model', config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } },
  ]))
  const scaffold = await launchWebScaffold({ deepSeekMissingCredential: true, extraOverlayPath: overlay })
  onTestFinished(() => scaffold.close())
  await scaffold.ctx.credentials.set(key, 'synthetic-local-fixture')
  const browser = await chromium.launch()
  onTestFinished(() => browser.close())
  const page = await newEnglishPage(browser)
  await page.goto(scaffold.authenticatedUrl)
  await connectFreshWorkspace(page, scaffold.workspaceCwd)
  const input = page.locator('[data-composer-input]').first()
  const settled = scaffold.whenTurnSettled()
  await input.fill('Answer with the local fixture response.')
  await input.press('Enter')
  await settled
  await expect.poll(() => page.getByText('LOCAL_FIXTURE_DONE', { exact: true }).count()).toBe(1)
  expect(server.requests).toHaveLength(1)
  expect(server.requests[0]!.outcome).toBe('completed')
  expect(server.requests[0]!.body).not.toHaveProperty('dsh_session_log')
  expect(server.requests[0]!.body).not.toHaveProperty('dsh_plugin_packages')

  await openSettings(page, 'en')
  expect(await page.getByRole('switch', { name: 'Upload Session Log when using the official model API' }).count()).toBe(0)
})
