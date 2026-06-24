---
name: bilibili-sync
description: 将 Bilibili 指定月份的视频自动同步到个人网站，创建帖子并加入对应合集。使用时提供目标年月（如 2026-06），自动拉取、去重、批量创建。
alwaysApply: false
---

# Bilibili 视频同步技能

此 Skill 用于将 Bilibili 指定月份的视频自动同步到个人网站的 `posts` 集合，并自动加入对应的合集。

## 核心流程

### 1. 获取 Bilibili 视频列表

使用 `x/v2/medialist/resource/list` API（无需 wbi 签名，不会被风控）：

```bash
node --input-type=module << 'NODEEOF'
async function fetchAllVideos() {
    const allVideos = [];
    for (let page = 1; page <= 10; page++) {
        const url = `https://api.bilibili.com/x/v2/medialist/resource/list?type=1&biz_id=10648168&ps=20&pn=${page}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://space.bilibili.com/10648168',
                'Accept': 'application/json, text/plain, */*',
            }
        });
        const data = await res.json();
        if (data.code !== 0 || !data.data?.media_list?.length) break;
        allVideos.push(...data.data.media_list);
    }
    return allVideos;
}

const videos = await fetchAllVideos();
// 筛选目标月份（北京时间 UTC+8）
const targetMonth = 'YYYY-MM'; // 替换为目标年月
const [year, month] = targetMonth.split('-').map(Number);
const MONTH_START = Math.floor(new Date(Date.UTC(year, month - 1, 1, -8, 0, 0)).getTime() / 1000);
const MONTH_END = Math.floor(new Date(Date.UTC(year, month, 1, -8, 0, 0)).getTime() / 1000);

const monthVideos = videos.filter(v => v.pubtime >= MONTH_START && v.pubtime < MONTH_END);

// 去重并提取关键字段
const seen = new Set();
const unique = [];
for (const v of monthVideos) {
    if (seen.has(v.bv_id)) continue;
    seen.add(v.bv_id);
    const date = new Date(v.pubtime * 1000);
    const pad = n => String(n).padStart(2, '0');
    unique.push({
        bvid: v.bv_id || '',
        title: v.title || '',
        date: `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`,
        cover: v.cover || '',
        description: (v.intro || '').trim(),
        duration: v.duration || 0,
    });
}
console.log(`目标月份视频: ${unique.length} 个`);
NODEEOF
```

### 2. 检查现有帖子并去重

先从 GET /api/posts 的结果中提取已有 BV 号（注意 limit=100 限制，超出部分不会返回，但不影响去重）：

```bash
node --input-type=module << 'NODEEOF'
const res = await fetch('http://localhost:5173/api/posts');
const data = await res.json();
const existingBvids = new Set();
for (const post of data.data) {
    if (post.video) {
        const match = post.video.match(/BV[\w]+/);
        if (match) existingBvids.add(match[0]);
    }
}
const newVideos = unique.filter(v => !existingBvids.has(v.bvid));
console.log(`新视频: ${newVideos.length}, 已存在: ${unique.length - newVideos.length}`);
NODEEOF
```

### 3. 批量创建帖子（含封面）

**关键**：帖子必须包含 `images` 数组存放封面图，否则 PostList 封面列显示为空。

创建时先用 medialist API 返回的 `cover` 字段作为封面 URL，然后调用后端 `/api/bilibili?bvid=` 获取最新封面并更新：

```bash
node --input-type=module << 'NODEEOF'
const createdIds = [];

for (const v of newVideos) {
    // 1. 通过后端接口获取 B站 视频信息（封面、标题、简介）
    let bilibiliInfo = null;
    try {
        const infoRes = await fetch(`http://localhost:5173/api/bilibili?bvid=${v.bvid}`);
        const infoData = await infoRes.json();
        if (infoData.success) bilibiliInfo = infoData.data;
    } catch (e) {
        console.log(`⚠️ 获取B站信息失败: ${v.title.slice(0, 20)}`);
    }

    const coverUrl = bilibiliInfo?.pic || v.cover;
    const finalTitle = bilibiliInfo?.title || v.title;
    const finalDesc = bilibiliInfo?.desc || v.description;
    const finalDate = bilibiliInfo
        ? (() => {
            const d = new Date(bilibiliInfo.pubdate * 1000);
            const pad = n => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
          })()
        : v.date;

    // 2. 创建帖子（包含封面 images 数组）
    const postData = {
        title: finalTitle,
        date: finalDate,
        content: finalDesc,
        video: `https://www.bilibili.com/video/${v.bvid}/`,
        pinned: false,
        images: [{ image: coverUrl, thumbnail: coverUrl, video: '', isLivePhoto: false }],
    };

    const res = await fetch('http://localhost:5173/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
    });
    const result = await res.json();

    if (result.success) {
        createdIds.push({ id: result.id, bvid: v.bvid, title: finalTitle, date: finalDate });
        console.log(`✅ [${finalDate}] ${finalTitle}`);
    } else {
        console.log(`❌ 创建失败: ${finalTitle} - ${result.error}`);
    }
}

console.log(`\n成功创建 ${createdIds.length}/${newVideos.length} 条`);
NODEEOF
```

### 4. 添加到对应合集

根据视频内容分类到对应合集。当前合集映射：

| 合集名称 | 合集 ID | 适用条件 |
|----------|---------|----------|
| 房东的猫！！！ | `7746c6e8699a7105015d209559928124` | 房东的猫相关视频 |
| AI房东的猫 | `eb4974de6a0a8bf600a748890dc06b0f` | AI 生成的房东的猫视频 |
| 随风飘扬的音符 | `1f94e7e669b000e7000c3bf56a18b97c` | 一般翻唱/音乐 |
| 夏日入侵企画 | `1b12d66e6a0a8bf700ac36b960bcbac4` | 夏日入侵企画相关 |
| 伴娘孟慧圆！！！ | `5dfc97d16a0a8bf700acbbb61daff6e4` | 孟慧圆相关 |
| 游四海 | `3e45192f6a0a8bf700ab0f4f199827b4` | 旅行/音乐节现场 |
| 关于一只叫狗狗的猫 | `0667d90f6a0a8bf700ae95e43e7dd784` | 宠物相关 |
| 日常但不平常 | `69c95b666a0a8bf700a609d1399612d3` | 日常 vlog |
| 一出好戏 | `071a88236a0a8bf700ab7c692a88ce05` | 戏剧/表演 |

```bash
node --input-type=module << 'NODEEOF'
// 更新合集
const colRes = await fetch('http://localhost:5173/api/collections');
const colData = await colRes.json();
const targetCol = colData.data.find(c => c.name === '合集名称');

const updatedPosts = [...(targetCol.posts || []), ...createdIds.map(p => p.id)];
await fetch(`http://localhost:5173/api/collections/${targetCol._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ posts: updatedPosts }),
});
console.log(`✅ 合集 "${targetCol.name}" 更新: ${targetCol.posts.length} → ${updatedPosts.length}`);
NODEEOF
```

### 5. 验证（可选）

打开 `http://localhost:5173` 确认帖子列表封面列正常显示。

## 注意事项

1. **必须先启动开发服务器**：`npm run dev`，确保 `http://localhost:5173` 可用。
2. **封面必须存入 images 数组**：PostList 的 `getCover()` 从 `row.images[0]` 取封面 URL，不设 `images` 则封面列显示 `-`。
3. **GET /api/posts 有 limit(100)**：去重时只比对前 100 条，超出部分不会扫描但通常不影响（老帖子的 BV 号不太可能和新视频重复）。
4. **时区**：Bilibili 的 `pubtime` 是 Unix 时间戳，筛选时需转换为北京时间（UTC+8）。
5. **视频分类**：默认所有房东的猫视频加入"房东的猫！！！"合集，其他类型视频需根据内容手动判断。
6. **Cover URL 格式**：封面直接使用 Bilibili CDN 原始 URL（如 `http://i0.hdslb.com/bfs/archive/xxx.jpg`），不下载到 CloudBase。前端 `getCover` 会通过 fallback 链 `_imageUrl → image` 直接渲染。
