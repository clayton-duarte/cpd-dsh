---
kind: upgrade-guide
description: CPD Desktop no longer reads in-app update settings or offers update controls.
---

# Update CPD Desktop outside the app

English | [中文](guide.zh.md)

## Change

CPD Desktop ignores previous update preferences and does not check for, download, or install releases through the app. The update channel setting and native update command are absent.

## Migration

1. Obtain a CPD release separately from the [fork's GitHub releases](https://github.com/clayton-duarte/cpd-dsh/releases) according to your organization's deployment policy.
2. After installing an approved release, open About to confirm the installed version. No user data or settings migration is needed for this change.
