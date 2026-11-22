/** Read the local notice from the dotfiles installer. This module never installs or downloads. */
import { constants } from 'node:fs'
import { access, open } from 'node:fs/promises'
import { join } from 'node:path'

const COMMIT = /^[0-9a-f]{40}$/
const RELEASE = /^cpd-desktop-[0-9a-f]{40}$/
const MAX_NOTICE_BYTES = 1024

/** @param manifest - Packaged application manifest, not the current on-disk app's xattr. */
export function managedRelease(manifest: unknown): string | undefined {
  if (typeof manifest !== 'object' || manifest === null || !('dshBuildCommit' in manifest)
    || !('dshBuildDirty' in manifest) || manifest.dshBuildDirty !== false) return undefined
  const commit = manifest.dshBuildCommit
  return typeof commit === 'string' && COMMIT.test(commit) ? `cpd-desktop-${commit}` : undefined
}

/**
 * @param root - Local dotfiles CPD install cache.
 * @param installed - Release identifier of this running build.
 * @param now - Unix time in seconds.
 * @returns Staged release identifier, or undefined for missing, stale, or invalid notices.
 */
export async function readManagedUpdate(root: string, installed: string, now: number): Promise<string | undefined> {
  try {
    const file = await open(join(root, 'update-ready.json'), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    let notice: unknown
    try {
      const stat = await file.stat()
      if (!stat.isFile() || stat.size === 0 || stat.size > MAX_NOTICE_BYTES) return undefined
      const buffer = Buffer.alloc(MAX_NOTICE_BYTES + 1)
      const { bytesRead } = await file.read(buffer)
      if (bytesRead > MAX_NOTICE_BYTES) return undefined
      notice = JSON.parse(buffer.toString('utf8', 0, bytesRead)) as unknown
    } finally { await file.close() }
    if (typeof notice !== 'object' || notice === null || !('schema' in notice) || notice.schema !== 1
      || !('installed' in notice) || notice.installed !== installed
      || !('target' in notice) || typeof notice.target !== 'string' || !RELEASE.test(notice.target) || notice.target === installed
      || !('stagedAt' in notice) || typeof notice.stagedAt !== 'number' || !Number.isSafeInteger(notice.stagedAt)
      || notice.stagedAt > now || notice.stagedAt <= now - 86400) return undefined
    await access(join(root, 'releases', notice.target, 'CPD.app', 'Contents', 'MacOS', 'CPD'), constants.X_OK)
    return notice.target
  } catch {
    // A temporary or invalid local notice must not show an upstream retry action.
    return undefined
  }
}
