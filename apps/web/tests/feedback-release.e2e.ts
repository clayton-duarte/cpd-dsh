// Recorded model replay drives the shipped feedback UI and canonical log.
// A synthetic collector address detects any attempt to send feedback or its log.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  acknowledgeReloadConnectionLoss, assertFixtureInventory, captureExpandedTurnProcessAria, captureStableAria,
  compareOrRefreshGolden, fixtureUserPrompts,
  launchWebScaffold, readPersistedEvents, watchConsole, webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, saveFailureShot } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('../../../snapshots/web/feedback-release', import.meta.url))
// Both routes borrow the same settled turn; this manifest references its owner.
const FIXTURE = fileURLToPath(new URL('../../../snapshots/web/feedback-command/session.v4.jsonl', import.meta.url))
const ACK_EXPECTED = join(SNAPSHOT_DIR, 'ack.expected.md')
const ACK_EXPANDED_EXPECTED = join(SNAPSHOT_DIR, 'ack-expanded.expected.md')
const RELEASE_EXPECTED = join(SNAPSHOT_DIR, 'feedback-release.expected.json')
const MODE = webSnapshotMode()

const PROMPT = 'Reply with the single word LIGHTHOUSE and stop.'

describe.skipIf(MODE === 'record').each(['deepseek-official', 'feedback-mock'])('web e2e: local feedback for %s', (provider) => {
  const official = provider === 'deepseek-official'
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>
  let collector: Server
  let sessionId: SessionId
  let uploads = 0
  const originalCollector = process.env.DSH_TELEMETRY_OTLP_URL

  async function expectLocalFeedback(type: SessionEvent['type'], count: number): Promise<void> {
    const agent = scaffold.ctx.agents.get(sessionId)
    if (agent === undefined) throw new Error('feedback session has no active agent')
    await scaffold.ctx.sessions.flush(agent.session)
    const events = await readPersistedEvents(scaffold, sessionId)
    const feedback = events.filter(event => event.type === type)
    expect(feedback).toHaveLength(count)
    expect(uploads).toBe(0)
    expect(scaffold.ctx.agents.get(sessionId)).toBe(agent)
  }

  async function selectModel(name: string): Promise<void> {
    const trigger = page.getByRole('button', { name: /^Select model, current/ })
    await trigger.click()
    await page.getByRole('menuitem', { name: /^Model\b/ }).click()
    await page.getByRole('menuitemradio', { name, exact: true }).click()
    await expect.poll(() => trigger.getAttribute('aria-label')).toContain(name)
    // The durable projection can update the label before the selection reply closes the menu.
    await expect.poll(() => trigger.getAttribute('aria-expanded'), { timeout: 10_000 }).toBe('false')
  }

  beforeAll(async () => {
    collector = createServer((request, response) => {
      uploads++
      request.resume()
      response.writeHead(200, { 'content-type': 'application/json' }).end('{}')
    })
    collector.listen(0, '127.0.0.1')
    await once(collector, 'listening')
    const address = collector.address()
    if (address === null || typeof address === 'string') throw new Error('collector has no port')
    process.env.DSH_TELEMETRY_OTLP_URL = `http://127.0.0.1:${address.port}/v1/logs`
    scaffold = await launchWebScaffold({
      replayProviders: [
        { id: 'deepseek-official', name: 'DeepSeek', models: [
          { id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash', contextWindow: 128_000 },
        ] },
        { id: 'feedback-mock', name: 'Feedback mock', models: [
          { id: 'feedback-mock', name: 'Feedback mock', contextWindow: 128_000 },
        ] },
      ],
      // The replay fixture belongs to the feedback-command scenario;
      // comparing (or refreshing) the persisted session here would rewrite
      // that shared source with this lane's feedback events.
      compareReplaySession: false,
      replayFixture: FIXTURE,
      paceMs: 5,
    })
    browser = await chromium.launch()
    page = await newEnglishPage(browser)
    tripwire = watchConsole(page)
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
    await connectFreshWorkspace(page, scaffold.workspaceCwd)
  }, 120_000)

  afterAll(async () => {
    try {
      await browser?.close()
      await scaffold?.close()
      expect(uploads).toBe(0)
    } finally {
      if (originalCollector === undefined) delete process.env.DSH_TELEMETRY_OTLP_URL
      else process.env.DSH_TELEMETRY_OTLP_URL = originalCollector
      if (collector?.listening) {
        await new Promise<void>((resolve, reject) => {
          collector.close((error) => {
            if (error) reject(error)
            else resolve()
          })
          collector.closeAllConnections()
        })
      }
    }
  })

  it('drives the recorded prompt to a settled turn', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-feedback-release-drive'))
    expect(fixtureUserPrompts(await readFile(FIXTURE, 'utf8'))).toEqual([PROMPT])
    const input = page.locator('[data-composer-input]').first()
    await input.waitFor({ timeout: 10_000 })
    if (!official) await selectModel('Feedback mock')
    const settled = scaffold.whenTurnSettled()
    await input.fill(PROMPT)
    await input.press('Enter')
    sessionId = await settled
    const agent = scaffold.ctx.agents.get(sessionId)
    expect(agent?.session.requestHeader()?.config.provider).toBe(provider)
    expect(uploads).toBe(0)
    // Both routes render the same composer without changing the actual request header.
    await selectModel('Feedback mock')
    await selectModel('DeepSeek-V4-Flash')
    expect(agent?.session.requestHeader()?.config.provider).toBe(provider)
    expect(uploads).toBe(0)
  }, 60_000)

  it('records feedback locally and acknowledges its session and anonymous user ids', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-feedback-release'))
    await page.getByText('LIGHTHOUSE', { exact: true }).waitFor({ timeout: 15_000 })
    expect(uploads).toBe(0)
    const input = page.locator('[data-composer-input]').first()
    await input.fill('/feedback the diff view is unreadable')
    await input.press('Enter')

    await page.getByText(/Feedback recorded for session/).waitFor({ timeout: 10_000 })
    expect(await page.getByText(/Anonymous user: [0-9a-f-]+\.$/i).count()).toBe(1)
    await expectLocalFeedback('feedback/record', 1)

    const snapshot = await captureStableAria(page, '[class*="centerCol"]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(ACK_EXPECTED, snapshot, MODE)
    const expanded = await captureExpandedTurnProcessAria(
      page,
      '[class*="centerCol"]',
      scaffold.workspaceCwd,
    )
    await compareOrRefreshGolden(ACK_EXPANDED_EXPECTED, expanded, MODE)
    expect(tripwire.pageErrors).toEqual([])
    expect(tripwire.warnings).toEqual([])
  }, 60_000)

  it('keeps feedback local across provider changes and browser reloads', async () => {
    const events = await readPersistedEvents(scaffold, sessionId)
    expect(events.at(-1)?.type).toBe('command/done')
    await selectModel('Feedback mock')
    await selectModel('DeepSeek-V4-Flash')
    const warningStart = tripwire.warnings.length
    await page.reload({ waitUntil: 'load' })
    acknowledgeReloadConnectionLoss(tripwire, warningStart)
    await page.getByText('LIGHTHOUSE', { exact: true }).waitFor({ timeout: 15_000 })
    expect(uploads).toBe(0)
  })

  it('persists text, ratings, notes, and retractions in the canonical session', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-feedback-release-suffix'))
    const input = page.locator('[data-composer-input]').first()
    await input.fill('/feedback the second remark')
    await input.press('Enter')
    await expect.poll(() => page.getByText(/Feedback recorded for session/).count()).toBe(2)
    await expectLocalFeedback('feedback/record', 2)
    const like = page.getByRole('button', { name: 'Good response' })
    await like.hover()
    await like.click()
    const dialog = page.getByRole('dialog', { name: 'Submit feedback' })
    await dialog.getByRole('button', { name: 'Instruction understanding and following', exact: true }).click()
    await dialog.getByRole('textbox', { name: 'Feedback details' }).fill('Clear and complete.')
    expect(uploads).toBe(0)
    await dialog.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect.poll(() => dialog.count()).toBe(0)
    const rated = page.getByRole('button', { name: 'Remove rating' })
    await expect.poll(() => rated.getAttribute('aria-pressed')).toBe('true')
    await expectLocalFeedback('feedback/message-put', 1)
    await page.getByRole('button', { name: 'Bad response' }).click()
    await dialog.getByRole('button', { name: 'Task result', exact: true }).click()
    await dialog.getByRole('textbox', { name: 'Feedback details' }).fill('Read both files before answering.')
    expect(uploads).toBe(0)
    await dialog.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect.poll(() => dialog.count()).toBe(0)
    await expectLocalFeedback('feedback/message-put', 2)
    await rated.click()
    await expect.poll(() => page.getByRole('button', { name: 'Bad response' }).getAttribute('aria-pressed')).toBe('false')
    await expectLocalFeedback('feedback/message-delete', 1)
    const agent = scaffold.ctx.agents.get(sessionId)
    if (agent === undefined) throw new Error('feedback session has no active agent')
    await scaffold.ctx.sessions.flush(agent.session)
    const events = await readPersistedEvents(scaffold, sessionId)
    expect(events.filter(event => event.type === 'feedback/record')).toMatchObject([
      { data: { text: 'the diff view is unreadable' } },
      { data: { text: 'the second remark' } },
    ])
    expect(events.filter(event => event.type === 'feedback/message-put')).toMatchObject([
      { data: { sessionId, item: { rating: 'positive', note: 'Clear and complete.', category: 'instruction-following' } } },
      { data: { sessionId, item: { rating: 'negative', note: 'Read both files before answering.', category: 'task-result' } } },
    ])
    expect(events.filter(event => event.type === 'feedback/message-delete')).toMatchObject([{ data: { sessionId } }])
    expect(events.filter(event => event.type === 'turn/end')).toHaveLength(1)
    expect(agent.session.requestHeader()?.config.provider).toBe(provider)
    expect(uploads).toBe(0)
    const feedback = events.flatMap<Record<string, string | undefined>>((event) => {
      switch (event.type) {
        case 'feedback/record': return [{ type: event.type, text: event.data.text }]
        case 'feedback/message-put': return [{
          type: event.type, rating: event.data.item.rating, note: event.data.item.note, category: event.data.item.category,
        }]
        case 'feedback/message-delete': return [{ type: event.type }]
        default: return []
      }
    })
    await compareOrRefreshGolden(RELEASE_EXPECTED, JSON.stringify({
      feedback,
      uploads,
    }, null, 2), MODE)
  }, 60_000)

  it('records headerless feedback without contacting the collector', async () => {
    await selectModel('Feedback mock')
    await selectModel('DeepSeek-V4-Flash')
    expect(uploads).toBe(0)
    await page.getByRole('button', { name: 'New session', exact: true }).last().click()
    const input = page.locator('[data-composer-input][contenteditable="true"][data-placeholder="Describe what you want to build, / commands, @ files or sessions"]')
    await input.waitFor({ timeout: 15_000 })
    await input.fill('/feedback Feedback before any model request.')
    expect(uploads).toBe(0)
    await input.press('Enter')
    const findHeaderless = () => scaffold.ctx.sessions.list().find(session => session.id !== sessionId
      && session.snapshotEvents().some(event => event.type === 'feedback/record'))
    // A command-only session keeps the hero view; its durable event confirms submission.
    await expect.poll(findHeaderless, { timeout: 10_000 }).toBeDefined()
    const headerless = findHeaderless()
    if (headerless === undefined) throw new Error('headerless feedback session not found')
    expect(headerless.requestHeader()).toBeUndefined()
    await scaffold.ctx.sessions.flush(headerless)
    const events = await readPersistedEvents(scaffold, headerless.id)
    expect(events.find(event => event.type === 'feedback/record')?.data).toEqual({ text: 'Feedback before any model request.' })
    expect(uploads).toBe(0)
    expect(tripwire.pageErrors).toEqual([])
    expect(tripwire.warnings).toEqual([])
  })

  it('keeps the fixture inventory closed', async () => {
    await assertFixtureInventory(SNAPSHOT_DIR, ['ack.expected.md', 'ack-expanded.expected.md', 'feedback-release.expected.json'])
  })
})
