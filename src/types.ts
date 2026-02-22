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
  _rawThumbnailFile?: File;
}
