[![中文](https://img.shields.io/badge/语言-中文-red)](./README.md) ![English](https://img.shields.io/badge/Lang-English-blue) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Personal Website Admin Dashboard

This project is a personal website admin dashboard and data management system built with Vue 3 + TypeScript + Vite, integrating the Element Plus UI library, and utilizing Tencent CloudBase SDK for data and file storage.

⚠️ **Note**: This is not a traditional backend server application (like a Flask/Spring project supplying APIs). It is a pure frontend Admin Dashboard / CMS used for personal website data entry, management, and visualization.

## 🔗 Project Links

### Frontend Project
- [![Gitee](https://img.shields.io/badge/Gitee-tallmessiwu%2Fpersonal--website-C71D23?logo=gitee)](https://gitee.com/tallmessiwu/personal-website)
- [![GitHub](https://img.shields.io/badge/GitHub-TallMessiWu%2Fpersonal--website-181717?logo=github)](https://github.com/TallMessiWu/personal-website)

### Admin Project
- [![Gitee](https://img.shields.io/badge/Gitee-tallmessiwu%2Fpersonal--website--admin-C71D23?logo=gitee)](https://gitee.com/tallmessiwu/personal-website-admin)
- [![GitHub](https://img.shields.io/badge/GitHub-TallMessiWu%2Fpersonal--website--admin-181717?logo=github)](https://github.com/TallMessiWu/personal-website-admin)

## 🛠️ Tech Stack
- **Core Framework**: [Vue 3](https://vuejs.org/) (Composition API / `<script setup>`)
- **Type System**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **UI Component Library**: [Element Plus](https://element-plus.org/)
- **Backend Services**: [@cloudbase/node-sdk](https://docs.cloudbase.net/api-reference/server/node/sdk/introduce)

## 📂 Project Structure

```text
.
├── src/
│   ├── components/       # UI Components (List, Form, etc.)
│   ├── server/           # Backend Logic (Express routes, CloudBase interaction)
│   ├── App.vue           # Root Component
│   ├── api.ts            # Frontend API client encapsulation
│   ├── main.ts           # Application entry point
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Utility functions
├── public/               # Static assets
├── index.html            # Entry HTML
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

### 2. Environment Requirements
The high-bitrate video processing feature depends on system-level `ffmpeg`. Please ensure it is installed and added to your system's PATH:
- **Windows**: `choco install ffmpeg`
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg`

## 📦 Installation & Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   Start the local development server (defaults to `http://localhost:5173`):
   ```bash
   npm run dev
   ```

3. **Production Build**
   Build the project for production:
   ```bash
   npm run build
   ```

4. **Preview Build**
   ```bash
   npm run preview
   ```

## 📄 License

This project is open-sourced under the [MIT License](./LICENSE). Copyright (c) 2026 Junlin Wu (吴俊霖).
