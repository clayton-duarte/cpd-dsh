---
kind: upgrade-guide
description: Desktop 不再启用内置 DeepSeek 模型路由，也不再为新 profile 选择默认模型。
---

# Desktop 模型提供方

[English](guide.md) | 中文

## 变更

Desktop 直接打开工作区，不再显示 DeepSeek 登录或 API 密钥配置界面。默认不启用 `deepseek-official` 或 `deepseek-account`。已有的通用提供方、已保存的模型选择及凭据记录保留在磁盘上。

## 迁移

1. 打开“**更多 → 设置 → 模型**”。如果列表中已有你使用的提供方，请保留其配置。否则，选择“**添加模型提供方**”并配置所需的提供方。
2. 在输入区选择可用模型。如果会话曾使用已停用的路由，请在发送新消息前为该会话选择可用模型。

若要继续使用已有的官方 API 密钥路由，请在 `$DSH_HOME/profiles/desktop/cordis.patch.yml` 中为 `llm-deepseek` 条目设置 `disabled: false`。重启 Desktop，确认“**设置 → 模型**”中出现 **DeepSeek**，然后在输入区选择其模型。此设置不会恢复账号登录。
