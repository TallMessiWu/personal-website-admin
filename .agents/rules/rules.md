# 项目开发规范 (rules.md)

## 1. 核心指导原则
- **语言强制**：所有代码注释、文档说明、提交信息（Commit Messages）必须使用中文。
- **沟通风格**：专业、简洁、事实导向。禁止客套话，发现代码或逻辑问题时直接指出并提供修复方案。
- **云开发前置指令**：You MUST read the cloudbase-guidelines skill FIRST when working with CloudBase projects.

## 2. 技术栈与 SDK 规范
- **前端**：Vue 3 (Composition API) + Vite + TypeScript + Element Plus。
- **后端/云服务**：腾讯云开发 (CloudBase) - 文档型数据库、云存储、云函数。
- **运行环境**：纯本地运行，免除复杂的鉴权与登录逻辑。建议通过 `.env.local` 注入 API 密钥初始化。

## 3. 核心业务与数据规范
- **数据集合**：目标集合为 `posts`。
- **数据结构约束**：严格遵循 `Post` 与 `ImageItem` 类型定义。
  - 核心属性：`id` (递增), `title` (必填), `content`, `date` (YYYY-MM-DD HH:mm), `pinned`。
- **媒体文件处理流程（云端压缩架构）**：
  - **原图/视频直传**：前端将本地原图直传至 COS 的 `posts/images/`，将 Live 图视频直传至 `posts/videos/`，获取对应 `fileID`。
  - **云端压缩触发**：前端拿到原图 `fileID` 后，调用指定的图片压缩云函数（如 `compressImage`）。
  - **云端处理逻辑**：云函数下载原图，使用 `sharp` 等库将其压缩至 `<500KB`，上传至 `posts/thumbnails/`，并向前端返回缩略图 `fileID`。
  - **数据写入**：前端拿到所有 `fileID` 后，正确组装至 `ImageItem`，最终将完整文档写入 `posts` 集合。

## 4. 代码质量规范
- 禁用 `any` 类型，必须基于提供的业务接口定义 TypeScript 类型。
- 涉及跨端（前端与云端）的异步操作，必须包含完整的 `try-catch` 错误捕获，并在前端 UI 给予明确的加载状态（Loading）与异常提示。
- 云函数必须包含基础的入参校验与日志输出（`console.log`/`console.error`）。