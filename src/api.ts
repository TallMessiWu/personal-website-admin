import type { Post } from './types';

const API_BASE = '/api';

export const api = {
  async getPosts(): Promise<Post[]> {
    const res = await fetch(`${API_BASE}/posts`);
    const data = await res.json();
    if (data.success) return data.data;
    throw new Error(data.error);
  },

  async createPost(post: Omit<Post, '_id'>): Promise<string> {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    });
    const data = await res.json();
    if (data.success) return data.id;
    throw new Error(data.error);
  },

  async updatePost(id: string, post: Partial<Post>): Promise<any> {
    const res = await fetch(`${API_BASE}/posts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    });
    const data = await res.json();
    if (data.success) return data.result;
    throw new Error(data.error);
  },

  async deletePost(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/posts/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) return data.result;
    throw new Error(data.error);
  },

  async getBilibiliInfo(bvid: string): Promise<{ title: string; desc: string; pic: string; pubdate: number }> {
    const res = await fetch(`${API_BASE}/bilibili?bvid=${encodeURIComponent(bvid)}`);
    const data = await res.json();
    if (data.success) return data.data;
    throw new Error(data.error);
  },

  // fileType: 'image' | 'video' | 'thumbnail'
  async uploadFile(file: File, type: 'image' | 'video' | 'thumbnail'): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.success) return data.fileID;
    throw new Error(data.error);
  }
};
