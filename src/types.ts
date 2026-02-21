export interface ImageItem {
  image: string;
  thumbnail?: string;
  video?: string;
  _rawImageFile?: File;
  _rawVideoFile?: File;
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
