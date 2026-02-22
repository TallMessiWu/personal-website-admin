export interface ImageItem {
  image: string;
  thumbnail?: string;
  video?: string;
  _rawImageFile?: File;
  _rawVideoFile?: File;
  /** 展示用临时 URL（后端解析 fileID 后填充，不存入数据库） */
  _imageUrl?: string;
  _thumbnailUrl?: string;
}

export interface Post {
  _id?: string;
  id?: number;
  title: string;
  content?: string;
  date: string;
  pinned?: boolean;
  images?: ImageItem[];
  video?: string;
}

export interface Collection {
  _id?: string;
  name: string;
  thumbnail: string;
  posts: string[];
  pinned?: boolean;
  _rawThumbnailFile?: File;
  /** 展示用临时 URL（后端解析 fileID 或回退自 posts 后填充，不存入数据库） */
  _displayThumbnail?: string;
  _thumbnailUrl?: string;
  /** 合集内最新 post 的日期 (持久化字段) */
  latestPostDate?: string;
  /** 是否设置了自有封面 */
  _hasOwnThumbnail?: boolean;
}
