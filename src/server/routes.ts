import type { Express, Request, Response } from 'express';
import multer from 'multer';
import { cloudbase, db } from './cloudbase';

// 使用内存存储接收上传的文件
const upload = multer({ storage: multer.memoryStorage() });

export function setupRoutes(app: Express) {
  // 获取列表 (支持按 date 降序)
  app.get('/posts', async (_req: Request, res: Response) => {
    try {
      const result = await db.collection('posts').limit(100).get();
      let data = result.data || [];
      // 本地按 pinned 和 date 排序
      data.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      // 收集所有 images 中的 fileID 并批量解析
      const fileIDSet = new Set<string>();
      for (const post of data as any[]) {
        if (post.images && Array.isArray(post.images)) {
          for (const img of post.images) {
            if (img.thumbnail && img.thumbnail.startsWith('cloud://')) fileIDSet.add(img.thumbnail);
            if (img.image && img.image.startsWith('cloud://')) fileIDSet.add(img.image);
          }
        }
      }
      if (fileIDSet.size > 0) {
        const urlResult = await cloudbase.getTempFileURL({ fileList: [...fileIDSet] });
        const urlMap = new Map(
          urlResult.fileList.map((f: any) => [f.fileID, f.tempFileURL])
        );
        for (const post of data as any[]) {
          if (post.images && Array.isArray(post.images)) {
            for (const img of post.images) {
              if (img.thumbnail && urlMap.has(img.thumbnail)) img.thumbnail = urlMap.get(img.thumbnail);
              if (img.image && urlMap.has(img.image)) img.image = urlMap.get(img.image);
            }
          }
        }
      }

      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 新增
  app.post('/posts', async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const result = await db.collection('posts').add(data);
      res.json({ success: true, id: result.id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 辅助：从 images 数组中提取所有 cloud:// fileID
  const collectFileIDs = (images: any[]): string[] => {
    const ids: string[] = [];
    if (!Array.isArray(images)) return ids;
    for (const img of images) {
      if (img.image && img.image.startsWith('cloud://')) ids.push(img.image);
      if (img.thumbnail && img.thumbnail.startsWith('cloud://')) ids.push(img.thumbnail);
      if (img.video && img.video.startsWith('cloud://')) ids.push(img.video);
    }
    return ids;
  };

  // 更新（清理不再引用的图片）
  app.put('/posts/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const data = req.body;
      delete data._id;

      // 获取旧文档
      const oldDoc = await db.collection('posts').doc(id).get();
      const oldImages = oldDoc.data?.[0]?.images || [];

      const result = await db.collection('posts').doc(id).update(data);

      // 对比新旧 fileID，删除不再被引用的
      const oldIDs = new Set(collectFileIDs(oldImages));
      const newIDs = new Set(collectFileIDs(data.images || []));
      const toDelete = [...oldIDs].filter(fid => !newIDs.has(fid));
      if (toDelete.length > 0) {
        cloudbase.deleteFile({ fileList: toDelete }).catch(() => {});
      }

      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 删除（清理所有关联图片）
  app.delete('/posts/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);

      // 先获取文档，用于清理文件
      const oldDoc = await db.collection('posts').doc(id).get();
      const oldImages = oldDoc.data?.[0]?.images || [];

      const result = await db.collection('posts').doc(id).remove();

      // 清理云存储中的所有关联文件
      const toDelete = collectFileIDs(oldImages);
      if (toDelete.length > 0) {
        cloudbase.deleteFile({ fileList: toDelete }).catch(() => {});
      }

      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== Collections ====================

  // 获取 collections 列表
  app.get('/collections', async (_req: Request, res: Response) => {
    try {
      const result = await db.collection('collections').limit(100).get();
      const data = result.data || [];

      // 标记是否设置了自有封面
      for (const item of data as any[]) {
        item._hasOwnThumbnail = !!item.thumbnail;
      }

      // 1. 如果 collection 没有 thumbnail 但有关联的 posts，收集这些 post ID
      const needFallbackPostIds = new Set<string>();
      for (const item of data as any[]) {
        if (!item.thumbnail && item.posts && Array.isArray(item.posts)) {
          item.posts.forEach((pid: string) => needFallbackPostIds.add(pid));
        }
      }

      // 拉取关联的 posts 数据进行封面回退
      if (needFallbackPostIds.size > 0) {
        const _ = db.command;
        // 分批或直接拉取对应 posts
        const postsRes = await db.collection('posts')
          .where({ _id: _.in([...needFallbackPostIds]) })
          .limit(1000)
          .get();

        const postMap = new Map<string, any>();
        for (const p of postsRes.data || []) {
          postMap.set(p._id, p);
        }

        // 为空封面的 collection 寻找回退图片
        for (const item of data as any[]) {
          if (!item.thumbnail && item.posts && Array.isArray(item.posts)) {
            for (const pid of item.posts) {
              const p = postMap.get(pid);
              if (p?.images?.length) {
                const first = p.images[0];
                const cover = first.thumbnail || first.image;
                if (cover) {
                  item.thumbnail = cover;
                  break; // 找到后即跳出当前 posts 遍历
                }
              }
            }
          }
        }
      }

      // 2. 解析 thumbnail fileID 为临时 URL
      const fileIDs = data
        .map((item: any) => item.thumbnail)
        .filter((t: string) => t && t.startsWith('cloud://'));
      if (fileIDs.length > 0) {
        const urlResult = await cloudbase.getTempFileURL({ fileList: fileIDs });
        const urlMap = new Map(
          urlResult.fileList.map((f: any) => [f.fileID, f.tempFileURL])
        );
        for (const item of data as any[]) {
          if (item.thumbnail && urlMap.has(item.thumbnail)) {
            item.thumbnail = urlMap.get(item.thumbnail);
          }
        }
      }

      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 新增 collection
  app.post('/collections', async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const result = await db.collection('collections').add(data);
      res.json({ success: true, id: result.id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 更新 collection（清理旧封面图）
  app.put('/collections/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const data = req.body;
      delete data._id;

      // 获取旧文档，用于判断是否需要清理旧封面
      const oldDoc = await db.collection('collections').doc(id).get();
      const oldThumbnail = oldDoc.data?.[0]?.thumbnail || '';

      const result = await db.collection('collections').doc(id).update(data);

      // 如果旧封面是 fileID 且已变更，则从云存储删除
      if (oldThumbnail && oldThumbnail.startsWith('cloud://') && oldThumbnail !== data.thumbnail) {
        cloudbase.deleteFile({ fileList: [oldThumbnail] }).catch(() => {});
      }

      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 删除 collection（清理封面图）
  app.delete('/collections/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);

      // 先获取文档，用于清理封面图
      const oldDoc = await db.collection('collections').doc(id).get();
      const oldThumbnail = oldDoc.data?.[0]?.thumbnail || '';

      const result = await db.collection('collections').doc(id).remove();

      // 清理云存储中的封面图
      if (oldThumbnail && oldThumbnail.startsWith('cloud://')) {
        cloudbase.deleteFile({ fileList: [oldThumbnail] }).catch(() => {});
      }

      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 解析B站视频信息
  app.get('/bilibili', async (req: Request, res: Response): Promise<any> => {
    try {
      const bvid = String(req.query.bvid || '');
      if (!bvid) {
        return res.status(400).json({ success: false, error: 'Missing bvid parameter' });
      }

      const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const data: any = await response.json();

      if (data.code === 0) {
        res.json({
          success: true,
          data: {
            title: data.data.title,
            desc: data.data.desc,
            pic: data.data.pic,
            pubdate: data.data.pubdate
          }
        });
      } else {
        res.status(400).json({ success: false, error: data.message });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 上传文件至云存储 (返回 fileID)
  app.post('/upload', upload.single('file'), async (req: Request, res: Response): Promise<any> => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const file = req.file;
      let cloudDir = 'posts/images';
      if (req.body.type === 'video') cloudDir = 'posts/videos';
      else if (req.body.type === 'thumbnail') cloudDir = 'posts/thumbnails';
      else if (req.body.type === 'collection') cloudDir = 'collections';
      const ext = file.originalname.split('.').pop();
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const cloudPath = `${cloudDir}/${filename}`;

      // 使用 buffer 作为 fileContent
      const uploadResult = await cloudbase.uploadFile({
        cloudPath,
        fileContent: file.buffer,
      });

      res.json({ success: true, fileID: uploadResult.fileID });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}
