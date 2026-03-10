/**
 * 本地图片压缩工具函数（使用 Canvas）
 * 将图片缩放到指定最大尺寸，并以指定质量输出
 */
export const compressImageLocal = (
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Canvas toBlob failed'));
            const newFile = new File([blob], `thumb_${file.name}`, {
              type: file.type || 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(newFile);
          },
          file.type || 'image/jpeg',
          quality
        );
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

/**
 * 从本地视频文件提取第一帧或指定时间的帧（默认 0.1s），返回一个 File
 */
export const extractVideoFrame = (
  file: File,
  timeOffset = 0.1
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;

    // We create a Blob URL for the local file
    const url = URL.createObjectURL(file);
    video.src = url;

    const onDataLoaded = () => {
      // Data loaded, jump to timeOffset
      video.currentTime = timeOffset;
    };

    const onSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas context not available to extract video frame');
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            // cleanup
            URL.revokeObjectURL(url);
            if (!blob) return reject(new Error('Canvas toBlob failed (video frame)'));

            // File extension based on content
            const newFile = new File([blob], `frame_${file.name.replace(/\.[^/.]+$/, "")}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(newFile);
          },
          'image/jpeg',
          0.9 // extraction quality
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    const onError = (e: Event | string) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Video load error: ${e}`));
    };

    video.addEventListener('loadeddata', onDataLoaded);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
  });
};
