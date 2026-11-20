---
kind: upgrade-guide
description: "随附 profile 将会话反馈保留在本地，并移除产品埋点和模型请求诊断数据。"
---

# 反馈保留在 Host 的会话日志中

[English](guide.md) | 中文

## 变更

随附组合包不再挂载 OTel 反馈导出器、桌面产品埋点、DeepSeek 会话日志和插件清单请求贡献器。Web 不再显示对应的上传开关。`/feedback` 和消息评分仍将数据记录在 Host 的会话日志中；推理、托管搜索以及桌面更新检查和下载仍使用各自配置的服务。

## 迁移

1. 从 `$DSH_HOME/cordis.patch.yml`、profile patch 和 `--patch` overlay 中移除对 `session-telemetry-otel`、`desktop-product-telemetry`、`product-analytics`、`session-log-deepseek`、`plugin-package-inventory-deepseek` 或 `ui-settings-session-log` 的覆盖。如果要将反馈保留在 Host 上，也请移除显式插入的导出器或贡献器。
2. 确认反馈已记录在 Host 的会话日志中，且通用设置中不再显示**在使用官方模型 API 时上传 Session Log**开关。现有会话文件无需转换。
