---
name: bilibili-sync
description: 将 Bilibili 指定月份的视频自动同步到个人网站，创建帖子并加入对应合集。使用时提供目标年月（如 2026-06），自动拉取、去重、批量创建。
alwaysApply: false
---

# Bilibili 视频同步技能

此 Skill 用于将 Bilibili 指定月份的视频自动同步到个人网站的 `posts` 集合，并自动加入对应的合集。

## 核心流程

### 0. 启动开发服务器

```bash
npm run dev &
sleep 4
```

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

// 按 bv_id 去重，提取关键字段
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

**关键**：PostList 封面列从 `images[0]` 读取，必须把 B站封面 URL 写入 `images` 数组。

```bash
node --input-type=module << 'NODEEOF'
const createdIds = [];

for (const v of newVideos) {
    // 通过后端接口获取 B站 视频详情（封面、标题、简介、发布时间）
    let bilibiliInfo = null;
    try {
        const infoRes = await fetch(`http://localhost:5173/api/bilibili?bvid=${v.bvid}`);
        const infoData = await infoRes.json();
        if (infoData.success) bilibiliInfo = infoData.data;
    } catch (e) { /* 忽略，回退到 medialist 数据 */ }

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

**合集 ID 必须动态查询**，不能硬编码（合集删了重建 ID 会变）。

合集分类规则：

| 合集名称 | 关键词/匹配规则 |
|----------|----------------|
| 房东的猫！！！ | 标题含"房东的猫"或"房猫" |
| AI房东的猫 | 标题含"AI房东的猫"或"AI房猫" |
| 夏日入侵企画 | 标题含"夏日入侵企画"或"夏企" |
| 伴娘孟慧圆！！！ | 标题含"孟慧圆" |
| 随风飘扬的音符 | 其他翻唱/音乐类 |
| 游四海 | 旅行/音乐节现场 |
| 关于一只叫狗狗的猫 | 宠物相关 |
| 日常但不平常 | 日常 vlog |
| 一出好戏 | 戏剧/表演 |

```bash
node --input-type=module << 'NODEEOF'
// 动态获取合集列表
const colRes = await fetch('http://localhost:5173/api/collections');
const colData = await colRes.json();

// 根据视频标题匹配合集（默认归入"房东的猫！！！"）
function matchCollection(title) {
    const rules = [
        { name: 'AI房东的猫', pattern: /AI(房东的猫|房猫)/ },
        { name: '夏日入侵企画', pattern: /(夏日入侵企画|夏企)/ },
        { name: '伴娘孟慧圆！！！', pattern: /孟慧圆/ },
    ];
    for (const rule of rules) {
        if (rule.pattern.test(title)) {
            const col = colData.data.find(c => c.name === rule.name);
            if (col) return col;
        }
    }
    // 默认：房东的猫
    return colData.data.find(c => c.name === '房东的猫！！！');
}

const targetCol = matchCollection('视频标题'); // 根据实际视频标题调整
if (!targetCol) {
    console.log('❌ 未找到目标合集');
    return;
}

const updatedPosts = [...(targetCol.posts || []), ...createdIds.map(p => p.id)];
await fetch(`http://localhost:5173/api/collections/${targetCol._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ posts: updatedPosts }),
});
console.log(`✅ 合集 "${targetCol.name}": ${targetCol.posts.length} → ${updatedPosts.length}`);
NODEEOF
```

### 5. 验证

打开 `http://localhost:5173`，确认：
- 动态管理列表中新帖子封面正常显示
- 合集管理中帖数正确
- 合集封面自动回退到最新帖子封面

## 注意事项

1. **必须先启动开发服务器**：`npm run dev`
2. **封面必须存入 images 数组**：PostList 的 `getCover()` 从 `row.images[0]` 读取
3. **合集 ID 动态查询**：不要硬编码，每次通过 `GET /api/collections` 获取最新 ID
4. **时区**：Bilibili `pubtime` 是 Unix 时间戳，筛选时需转换为北京时间（UTC+8）
5. **封面 URL**：直接用 B站 CDN 原始 URL，不下载到 CloudBase
6. **更新合集时不传 thumbnail**：只传 `{ posts: [...] }`，不要传 `thumbnail` 字段。合集设计为：设了 thumbnail 用固定封面，不设则自动用最新帖子封面
