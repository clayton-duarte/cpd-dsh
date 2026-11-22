---
kind: upgrade-guide
description: CPD Desktop 不再读取应用内更新设置，也不再提供更新控件。
---

# 在应用外更新 CPD Desktop

[English](guide.md) | 中文

## 变更

CPD Desktop 忽略原有更新首选项，不再通过应用检查、下载或安装发布版本。设置中不再显示更新通道，原生菜单中不再提供更新命令。

## 迁移

1. 按照组织的部署政策，从 [fork 的 GitHub Releases](https://github.com/clayton-duarte/cpd-dsh/releases) 单独获取 CPD 发布版本。
2. 安装获批版本后，打开“关于”确认已安装的版本。此变更不需要迁移用户数据或设置。
