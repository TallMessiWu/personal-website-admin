![中文](https://img.shields.io/badge/语言-中文-red) [![English](https://img.shields.io/badge/Lang-English-blue)](./README.en.md) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# 个人网站后台控制台 (Personal Website Admin)

本项目是基于 Vue 3 + TypeScript + Vite 构建的个人网站数据管理看板与后台控制系统，集成了 Element Plus 组件库，并借助腾讯云 CloudBase SDK 提供数据及文件存储支持。

⚠️ **项目说明**：本项目并非传统的提供 API 接口的后端服务端项目（如 Flask/Spring 等），而是一个纯前端架构的数据管理与数据追踪控制台（Admin Dashboard），主要用于个人网站的数据录入与可视化管理。

## 🔗 项目源码

### 前端项目
- [![Gitee](https://img.shields.io/badge/Gitee-tallmessiwu%2Fpersonal--website-C71D23?logo=gitee)](https://gitee.com/tallmessiwu/personal-website)
- [![GitHub](https://img.shields.io/badge/GitHub-TallMessiWu%2Fpersonal--website-181717?logo=github)](https://github.com/TallMessiWu/personal-website)

### 后台管理项目 (Admin)
- [![Gitee](https://img.shields.io/badge/Gitee-tallmessiwu%2Fpersonal--website--admin-C71D23?logo=gitee)](https://gitee.com/tallmessiwu/personal-website-admin)
- [![GitHub](https://img.shields.io/badge/GitHub-TallMessiWu%2Fpersonal--website--admin-181717?logo=github)](https://github.com/TallMessiWu/personal-website-admin)

## ✨ 功能特性
- **动态内容管理**: 直观地管理图片、视频和文本内容。
- **合集系统**: 支持将内容分门别类，支持自定义合集标题、**描述**和封面。
- **智能视频处理**: 集成 FFmpeg 自动检测并压缩高码率视频，优化加载速度。
- **BiliBili 集成**: 快捷解析并导入 B 站视频元数据（标题、封面、发布日期）。
- **多语言预览**: 支持内容的国际化多语言管理。
- **置顶逻辑**: 关键合集或内容一键置顶展示。

## 🛠️ 技术栈
- **核心框架**: [Vue 3](https://vuejs.org/) (Composition API / `<script setup>`)
- **类型系统**: [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **UI 组件库**: [Element Plus](https://element-plus.org/)
- **后端服务**: [@cloudbase/node-sdk](https://docs.cloudbase.net/api-reference/server/node/sdk/introduce)

## 📂 项目结构

```text
.
├── src/
│   ├── components/       # UI 组件 (List, Form 等)
│   ├── server/           # 后端逻辑 (Express 路由, CloudBase 交互)
│   ├── App.vue           # 根组件
│   ├── api.ts            # 前端 API 请求封装
│   ├── main.ts           # 应用入口
│   ├── types.ts          # TypeScript 类型定义
│   └── utils.ts          # 工具函数
├── public/               # 静态资源 (图片、图标等)
├── index.html            # 入口 HTML
├── package.json          # 依赖配置与脚本
├── tsconfig.json         # TypeScript 配置文件
└── vite.config.ts        # Vite 配置文件
```

## ⚙️ 环境要求
本项目的高码率视频处理功能依赖系统级的 `ffmpeg`。请确保已安装并将其路径添加到系统环境变量中：
- **Windows**: `choco install ffmpeg`
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg`

## 📦 安装与运行

1. **安装依赖**
   ```bash
   npm install
   ```

2. **开发环境运行**
   启动本地开发服务器，默认将在 `http://localhost:5173` 运行：
   ```bash
   npm run dev
   ```

3. **生产环境构建**
   构建用于生产环境的产物：
   ```bash
   npm run build
   ```

4. **预览构建结果**
   ```bash
   npm run preview
   ```

## 📄 开源协议

本项目基于 [MIT License](./LICENSE) 开源。版权所有 (c) 2026 Junlin Wu (吴俊霖)。
