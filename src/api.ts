import type { Post, Collection } from './types';
import axios from 'axios';

const API_BASE = '/api';

export const api = {
  async getPosts(): Promise<Post[]> {
    const res = await axios.get(`${API_BASE}/posts`);
    if (res.data.success) return res.data.data;
    throw new Error(res.data.error);
  },

  async createPost(post: Omit<Post, '_id'>): Promise<string> {
    const res = await axios.post(`${API_BASE}/posts`, post);
    if (res.data.success) return res.data.id;
    throw new Error(res.data.error);
  },

  async updatePost(id: string, post: Partial<Post>): Promise<any> {
    const res = await axios.put(`${API_BASE}/posts/${id}`, post);
    if (res.data.success) return res.data.result;
    throw new Error(res.data.error);
  },

  async deletePost(id: string): Promise<any> {
    const res = await axios.delete(`${API_BASE}/posts/${id}`);
    if (res.data.success) return res.data.result;
    throw new Error(res.data.error);
  },

  async getBilibiliInfo(bvid: string): Promise<{ title: string; desc: string; pic: string; pubdate: number }> {
    const res = await axios.get(`${API_BASE}/bilibili`, { params: { bvid } });
    if (res.data.success) return res.data.data;
    throw new Error(res.data.error);
  },

  // fileType: 'image' | 'video' | 'thumbnail' | 'collection'
  async uploadFile(
    file: File,
    type: 'image' | 'video' | 'thumbnail' | 'collection',
    clientId?: string,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    const formData = new FormData();
    // 关键：先添加文本字段，再添加文件字段，有助于 multer 更早解析出 body
    if (clientId) formData.append('clientId', clientId);
    formData.append('type', type);
    formData.append('file', file);

    const res = await axios.post(`${API_BASE}/upload`, formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });

    if (res.data.success) return res.data.fileID;
    throw new Error(res.data.error);
  },

  async getVideoProgress(id: string): Promise<number> {
    const res = await axios.get(`${API_BASE}/upload-progress/${id}`);
    if (res.data.success) return res.data.progress;
    return 0;
  },

  // ==================== Collections ====================

  async getCollections(): Promise<Collection[]> {
    const res = await axios.get(`${API_BASE}/collections`);
    if (res.data.success) return res.data.data;
    throw new Error(res.data.error);
  },

  async createCollection(collection: Omit<Collection, '_id'>): Promise<string> {
    const res = await axios.post(`${API_BASE}/collections`, collection);
    if (res.data.success) return res.data.id;
    throw new Error(res.data.error);
  },

  async updateCollection(id: string, collection: Partial<Collection>): Promise<any> {
    const res = await axios.put(`${API_BASE}/collections/${id}`, collection);
    if (res.data.success) return res.data.result;
    throw new Error(res.data.error);
  },

  async deleteCollection(id: string): Promise<any> {
    const res = await axios.delete(`${API_BASE}/collections/${id}`);
    if (res.data.success) return res.data.result;
    throw new Error(res.data.error);
  },
};
