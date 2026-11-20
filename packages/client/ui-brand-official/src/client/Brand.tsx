import { BrandWordmark, FishLogo } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { HeroBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import cpdMark from './assets/cpd-mark.svg'

/**
 * Render the original CPD φ outline in the foreground color of its host.
 * @param props - Requested mark size and optional presentation class.
 * @returns A decorative mark that follows the current text color.
 */
export function CpdBrandMark(props: SidebarBrandMarkOwnerProps | HeroBrandMarkOwnerProps) {
  return <span className={'className' in props ? props.className : undefined} aria-hidden="true" style={{
    display: 'inline-block', width: props.size, height: props.size, backgroundColor: 'currentColor',
    mask: `url("${cpdMark}") center / contain no-repeat`,
  }} />
}

/**
 * Render the official mark with the presentation requested by its host surface.
 * @param props - Host-supplied mark presentation.
 * @returns the official whale mark.
 */
export function OfficialBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return <FishLogo size={size} />
}

/**
 * Render the official name artwork without its independently slotted mark.
 * @returns the official name wordmark.
 */
export function OfficialBrandName() {
  return <BrandWordmark includeMark={false} />
}
