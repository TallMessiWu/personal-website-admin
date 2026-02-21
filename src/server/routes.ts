import type { Express, Request, Response } from 'express';
import multer from 'multer';
import { cloudbase, db } from './cloudbase';

// 使用内存存储接收上传的文件
const upload = multer({ storage: multer.memoryStorage() });

export function setupRoutes(app: Express) {
  // 获取列表 (支持按 date 降序)
  app.get('/posts', async (_req: Request, res: Response) => {
    try {
      // 简单排序：先 pinned 为 true，再按 date 降序。CloudBase db 支持排序
      // 但是 boolean 类型的 pinned 可能有点难排，我们通常用 get() 取出全部再在本地排，或者让它只取前面100条
      const result = await db.collection('posts').limit(100).get();
      let data = result.data || [];
      // 本地按 pinned 和 date 排序
      data.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
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

  // 更新
  app.put('/posts/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const data = req.body;
      // 移除 _id 防止更新报错
      delete data._id;

      const result = await db.collection('posts').doc(id).update(data);
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 删除
  app.delete('/posts/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const result = await db.collection('posts').doc(id).remove();
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
