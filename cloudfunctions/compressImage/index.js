const cloudbase = require('@cloudbase/node-sdk');
const sharp = require('sharp');
const path = require('path');

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { fileID } = event;
  if (!fileID) {
    return { success: false, error: 'Missing fileID' };
  }

  try {
    // 1. 下载原图
    const downloadRes = await app.downloadFile({ fileID });
    const buffer = downloadRes.fileContent;

    // 2. 使用 sharp 压缩图片 (限制宽高，控制质量)
    // 根据需求，缩略图不需要很大，限制宽高为 800px 左右，质量 80 即可极大地减小体积 (<500KB)
    const compressedBuffer = await sharp(buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 80, force: false })
      .png({ quality: 80, force: false })
      .webp({ quality: 80, force: false })
      .toBuffer();

    // 3. 上传为新的 fileID
    // 解析原 fileID 得出后缀和名称，假设 fileID 格式类似 cloud://xxxx/posts/images/123.jpg
    const ext = path.extname(fileID) || '.jpg';
    const filename = `${Date.now()}_thumb${ext}`;
    const cloudPath = `posts/thumbnails/${filename}`;

    const uploadRes = await app.uploadFile({
      cloudPath: cloudPath,
      fileContent: compressedBuffer
    });

    return {
      success: true,
      originalFileID: fileID,
      thumbnailFileID: uploadRes.fileID,
      thumbnailWidth: 800
    };
  } catch (err) {
    console.error('Error compressing image:', err);
    return { success: false, error: err.message || JSON.stringify(err) };
  }
};
