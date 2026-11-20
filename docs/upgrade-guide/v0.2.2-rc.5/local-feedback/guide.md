---
kind: upgrade-guide
description: "The shipped profiles keep Session feedback local and remove product analytics and model-request diagnostics."
---

# Feedback stays in the Host's Session log

English | [中文](guide.zh.md)

## Change

The shipped bundles no longer mount the OTel feedback exporter, Desktop product analytics, or the DeepSeek Session-log and plugin inventory request contributors. The corresponding Web upload switch is absent. `/feedback` and message ratings still record data in the Host's Session log; inference, hosted search, and Desktop update checks and downloads still use their configured services.

## Migration

1. Remove overrides for `session-telemetry-otel`, `desktop-product-telemetry`, `product-analytics`, `session-log-deepseek`, `plugin-package-inventory-deepseek`, or `ui-settings-session-log` from `$DSH_HOME/cordis.patch.yml`, profile patches, and `--patch` overlays. Remove any explicit inserts for those exporters or contributors if you want feedback to stay on the Host.
2. Check that feedback is recorded in the Host's Session log and that General settings has no **Upload Session Log when using the official model API** switch. Existing Session files need no conversion.
