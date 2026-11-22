import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, onTestFinished } from 'vitest'
import { managedRelease, readManagedUpdate } from '../src/cpd-managed-update.ts'

const commit = 'a'.repeat(40)
const installed = `cpd-desktop-${commit}`
const target = `cpd-desktop-${'b'.repeat(40)}`
const now = 1_800_000_000
const ready = { schema: 1, installed, target, stagedAt: now - 1 }

it('identifies only clean, commit-tagged builds', () => {
  expect(managedRelease({ dshBuildCommit: commit, dshBuildDirty: false })).toBe(installed)
  for (const manifest of [null, { dshBuildCommit: commit }, { dshBuildCommit: commit, dshBuildDirty: true },
    { dshBuildCommit: '1234567', dshBuildDirty: false }]) expect(managedRelease(manifest)).toBeUndefined()
})

it('ignores invalid, stale, and unbacked notices', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cpd-managed-update-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const notice = join(root, 'update-ready.json')
  const read = () => readManagedUpdate(root, installed, now)
  expect(await read()).toBeUndefined()
  await writeFile(notice, JSON.stringify(ready))
  expect(await read()).toBeUndefined()

  const directory = join(root, 'releases', target, 'CPD.app', 'Contents', 'MacOS')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'CPD'), '', { mode: 0o755 })
  expect(await read()).toBe(target)
  for (const invalid of [
    { schema: 2 }, { installed: target }, { target: installed }, { target: '../other' },
    { stagedAt: now + 1 }, { stagedAt: now - 86400 }, { stagedAt: 'yesterday' }, { stagedAt: now - 0.5 },
  ]) {
    await writeFile(notice, JSON.stringify({ ...ready, ...invalid }))
    expect(await read()).toBeUndefined()
  }
  await writeFile(notice, '{ incomplete')
  expect(await read()).toBeUndefined()
  await writeFile(notice, JSON.stringify({ ...ready, padding: 'x'.repeat(1024) }))
  expect(await read()).toBeUndefined()
  await rm(notice)
  const other = join(root, 'other.json')
  await writeFile(other, JSON.stringify(ready))
  await symlink(other, notice)
  expect(await read()).toBeUndefined()
})
