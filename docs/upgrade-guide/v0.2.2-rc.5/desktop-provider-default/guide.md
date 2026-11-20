---
kind: upgrade-guide
description: Desktop no longer enables the built-in DeepSeek model routes or selects a default model for a fresh profile.
---

# Desktop model providers

English | [中文](guide.zh.md)

## Change

Desktop opens directly to the workspace without the DeepSeek sign-in or API-key setup screen. It no longer enables `deepseek-official` or `deepseek-account` by default. Existing generic providers, saved selections, and credential records stay on disk.

## Migration

1. Open **More → Settings → Models**. If your provider is already listed, keep its existing configuration. Otherwise, choose **Add model provider** and configure the provider you want to use.
2. Choose an available model in the composer. If a session previously used one of the disabled routes, select an available model for that session before sending a new message.

To keep using an existing official API-key route, explicitly enable the `llm-deepseek` row with `disabled: false` in `$DSH_HOME/profiles/desktop/cordis.patch.yml`. Restart Desktop, confirm **DeepSeek** appears in **Settings → Models**, and select its model in the composer. This does not restore account sign-in.
