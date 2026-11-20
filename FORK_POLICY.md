# CPD fork policy

Keep CPD close to DeepSeek Harness. Prefer bundle configuration and existing plugin extension points. Keep upstream implementations when disabling them in CPD is enough. Keep the `dsh` command, package identities, on-disk data, attribution, and product localization unless a change explicitly calls for breaking compatibility.

## Intentional differences

| Keep out of CPD | Preserve | Verify on upstream updates |
|---|---|---|
| Default telemetry exporters and Desktop product analytics | Local crash reports, configured update checks, and opt-in upstream capabilities. This is not a network-egress guarantee. | Run the base, SDK-minimal, and Web no-product-telemetry specs listed in [CPD CI](.github/workflows/cpd-ci.yml). |
| Desktop Welcome, platform sign-in prompts, and first-run API-key setup | Direct credential-free workspace startup and generic provider setup under Settings → Models. | Run [native startup tests](apps/desktop/tests/main-startup.spec.ts) and the keyless [built Host provider test](apps/desktop/tests/welcome-flow.e2e.ts). |
| Vendor Sign in and Feedback in Desktop’s More menu | Settings and its shortcut. This does not disable every feedback feature or vendor endpoint. | Run the [Settings launcher tests](packages/client/ui-settings-general/tests/settings-root.client.spec.tsx). |
| Built-in `deepseek-official` and `deepseek-account` routes and automatic model selection on fresh Desktop profiles | The provider catalog, manual provider configuration, existing generic providers and selections, and explicit profile overrides. | Compare a fresh packaged Host and an old-to-new packaged Host upgrade with one disposable profile and a synthetic provider. Do not use live credentials. |
| DeepSeek product identity in the CPD Desktop preview | CPD φ artwork, native menu roles and shortcuts, the build version, and MIT and third-party notices. | Run the [brand slot tests](packages/client/ui-brand-official/tests/browser-plugin.client.spec.tsx), [packaging tests](apps/desktop/tests/macos-signature.spec.ts), and the [DMG verification script](apps/desktop/scripts/verify-cpd-macos-preview.sh). |
| Upstream release and publication workflows running by default in the fork | The archived upstream workflow definitions and the fork’s CI. Packaging and preview publication run after merges to `main`. | Review the active [.github/workflows](.github/workflows) directory and confirm that `CPD checks` is the required PR check on `main`. |
| Non-English authored PR prose, including template placeholders and AI Usage labels | Verbatim localized product or test evidence as needed for review. The broader prose cleanup is separate; product locale dictionaries, localization data, and legal or vendored text are not cleanup targets. | Run the focused template check below. |

## Updating from upstream

1. Integrate the upstream release on a dedicated branch. Review changes to the composition rows, shell startup, branding slots, and active workflows against the table above.
2. Run the required `CPD checks` plus the affected checks in the table. For changes to Desktop startup or model composition, also check an unsigned macOS preview with a disposable profile.
3. Record any deliberately added or changed fork difference in this file with its owner and a regression check. Prefer a new configuration override or test to a permanent removal of upstream implementation.

Run the focused template check with:

```sh
node --test --test-name-pattern="pull request template aligned" .github/issue-management/policy.test.mjs
```
