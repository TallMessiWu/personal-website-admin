<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="post-form">

    <el-form-item label="标题" prop="title">
      <el-input v-model="form.title" placeholder="动态标题" />
    </el-form-item>

    <el-form-item label="日期" prop="date">
      <div style="display: flex; gap: 10px; width: 100%;">
        <el-date-picker
          v-model="form.date"
          type="datetime"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm"
          placeholder="选择发布日期时间"
          style="flex: 1;"
        />
        <el-button @click="fillCurrentTime">当前时间</el-button>
      </div>
    </el-form-item>

    <el-form-item label="正文" prop="content">
      <el-input v-model="form.content" type="textarea" :rows="4" placeholder="动态正文，支持换行" />
    </el-form-item>

    <el-form-item label="置顶" prop="pinned">
      <el-switch v-model="form.pinned" />
    </el-form-item>

    <el-form-item label="外部视频" prop="video">
      <el-input v-model="form.video" placeholder="如 B站 BV 号或完整链接" @blur="handleVideoInput" />
    </el-form-item>

    <el-divider>图文混排 / Live Photo 配置</el-divider>

    <div v-for="(item, index) in form.images" :key="index" class="image-item-card">
      <div class="card-header">
        <span>图片项 {{ index + 1 }}</span>
        <div class="card-actions">
          <el-button :icon="ArrowUp" size="small" circle :disabled="index === 0" @click="moveImageUp(index)" />
          <el-button :icon="ArrowDown" size="small" circle :disabled="index === (form.images?.length ?? 1) - 1" @click="moveImageDown(index)" />
          <el-button type="danger" size="small" icon="Delete" circle @click="removeImage(index)" />
        </div>
      </div>
      <el-form-item label="Live Photo">
        <el-checkbox v-model="item.isLivePhoto">包含实况视频 (Live Photo)，提交时将自动提取</el-checkbox>
      </el-form-item>
      <el-form-item label="原图 (高清)">
        <el-input v-model="item.image" placeholder="原图链接或 fileID" />
        <el-button style="margin-top:5px" @click="triggerUpload(index, 'image', 'image')">
          选择本地图片
        </el-button>
        <div v-if="getPreviewUrl(item) && !item.image?.startsWith('http') && !item.image?.startsWith('cloud://')" style="margin-top: 8px;">
          <el-image
            :src="getPreviewUrl(item)"
            style="width: 120px; height: 120px"
            fit="cover"
            :preview-src-list="[getPreviewUrl(item)]"
            preview-teleported
          />
        </div>
        <div v-else-if="item._imageUrl" style="margin-top: 8px;">
          <el-image
            :src="item._imageUrl"
            style="width: 120px; height: 120px"
            fit="cover"
            :preview-src-list="[item._imageUrl]"
            preview-teleported
          />
        </div>
      </el-form-item>

      <el-form-item label="缩略图 (低清)">
        <el-input v-model="item.thumbnail" placeholder="缩略图链接或 fileID，上传原图时自动生成" />
      </el-form-item>

      <el-form-item label="Live视频" v-if="!item.isLivePhoto">
        <el-input v-model="item.video" placeholder="Live Photo 短视频链接或 fileID" />
        <el-button style="margin-top:5px" @click="triggerUpload(index, 'video', 'video')">
          选择本地视频
        </el-button>
      </el-form-item>
    </div>

    <el-button type="primary" plain @click="addImageItem" style="margin-bottom: 20px;">
      <el-icon><Plus /></el-icon> 新增图片项
    </el-button>

    <el-form-item>
      <el-button type="primary" :loading="submitting" @click="submitForm">保存提交</el-button>
      <el-button @click="$emit('cancel')">取消返回</el-button>
    </el-form-item>

    <!-- 隐藏的文件选择器 -->
    <input type="file" ref="fileInput" style="display: none" @change="handleFileSelected" />

    <!-- 上传进度对话框 -->
    <el-dialog
      v-model="showProgress"
      title="正在提交..."
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      width="400px"
      append-to-body
    >
      <div class="progress-container">
        <div class="step-text">{{ currentStepText }}</div>
        <el-progress :percentage="overallProgress" :stroke-width="15" status="success" />

        <div v-if="currentFileProgress > 0" class="sub-progress">
          <div class="sub-text">{{ currentFileName }} (传输中)</div>
          <el-progress :percentage="currentFileProgress" :stroke-width="10" />
        </div>

        <div v-if="isCompressing" class="sub-progress">
          <div class="sub-text">视频码率过高，正在云端压缩中...</div>
          <el-progress :percentage="compressProgress" :stroke-width="10" color="#67c23a" />
        </div>
      </div>
    </el-dialog>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, markRaw } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, ArrowUp, ArrowDown } from '@element-plus/icons-vue';
import type { Post, ImageItem } from '../types';
import { api } from '../api';
import { compressImageLocal } from '../utils';

const props = defineProps<{ initialData?: Post | null }>();
const emit = defineEmits(['saved', 'cancel']);

const formRef = ref<FormInstance>();
const submitting = ref(false);

// 进度条相关
const showProgress = ref(false);
const overallProgress = ref(0);
const currentStepText = ref('');
const currentFileName = ref('');
const currentFileProgress = ref(0);
const isCompressing = ref(false);
const compressProgress = ref(0);

const form = reactive<Post>({
  title: '',
  content: '',
  date: '',
  pinned: false,
  video: '',
  images: [],
});

const rules = reactive<FormRules>({
  title: [{ required: true, message: '标题不能为空', trigger: 'blur' }],
  date: [{ required: true, message: '日期不能为空', trigger: 'change' }],
});

onMounted(() => {
  if (props.initialData) {
    Object.assign(form, JSON.parse(JSON.stringify(props.initialData)));
    if (!form.images) form.images = [];
  } else {
    // 新建态保持 date 为空，如果想有默认值，也可以在这里填充
    form.date = '';
  }
});

const fillCurrentTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  form.date = `${year}-${month}-${date} ${hours}:${minutes}`;
};

const handleVideoInput = async () => {
  const videoVal = form.video || '';
  if (!videoVal) return;

  const match = videoVal.match(/(BV[1-9A-HJ-NP-Za-km-z]{10})/i);
  if (!match || !match[1]) return;
  const bvid = match[1];

  try {
    const info = await api.getBilibiliInfo(bvid);

    // 将 B 站时间戳转为 YYYY-MM-DD HH:mm
    const pubdateObj = new Date(info.pubdate * 1000);
    const pubdateStr = `${pubdateObj.getFullYear()}-${String(pubdateObj.getMonth() + 1).padStart(2, '0')}-${String(pubdateObj.getDate()).padStart(2, '0')} ${String(pubdateObj.getHours()).padStart(2, '0')}:${String(pubdateObj.getMinutes()).padStart(2, '0')}`;

    const hasConflict =
      (form.title && form.title !== info.title) ||
      (form.content && form.content !== info.desc) ||
      (form.date && form.date !== pubdateStr) ||
      (form.images && form.images.length > 0 && form.images[0]?.image && form.images[0]?.image !== info.pic);

    const applyInfo = () => {
      form.title = info.title;
      form.content = info.desc;
      form.date = pubdateStr;
      if (!form.images) form.images = [];
      if (form.images.length === 0) {
        form.images.push({ image: info.pic, thumbnail: '', video: '', isLivePhoto: false });
      } else if (form.images[0]) {
        form.images[0].image = info.pic;
      }
    };

    if (hasConflict) {
      ElMessageBox.confirm(
        '检测到B站视频信息（标题、简介、封面），是否覆盖现有内容？',
        '自动填充提示',
        {
          confirmButtonText: '覆盖',
          cancelButtonText: '取消',
          type: 'info',
        }
      ).then(() => {
        applyInfo();
        ElMessage.success('已覆盖 B站 视频信息');
      }).catch(() => {});
    } else {
      applyInfo();
      ElMessage.success('已自动填充 B站 视频信息');
    }
  } catch (err: any) {
    ElMessage.warning('获取 B站 视频信息失败，跳过自动填充');
  }
};

const addImageItem = () => {
  if (!form.images) form.images = [];
  form.images.push({ image: '', thumbnail: '', video: '', isLivePhoto: false });
};

const moveImageUp = (index: number) => {
  if (!form.images || index <= 0) return;
  const temp = form.images.splice(index, 1)[0];
  if (temp) form.images.splice(index - 1, 0, temp);
};

const moveImageDown = (index: number) => {
  if (!form.images || index >= form.images.length - 1) return;
  const temp = form.images.splice(index, 1)[0];
  if (temp) form.images.splice(index + 1, 0, temp);
};

const removeImage = (index: number) => {
  form.images?.splice(index, 1);
};

// 上传相关状态
const fileInput = ref<HTMLInputElement>();
const uploadingIndex = ref(''); // e.g. "0-image" or "0-video"
let currentUploadTarget: { index: number, field: 'image' | 'video', fileType: 'image' | 'video' } | null = null;

const triggerUpload = (index: number, field: 'image' | 'video', fileType: 'image' | 'video') => {
  currentUploadTarget = { index, field, fileType };
  if (fileInput.value) {
    fileInput.value.accept = fileType === 'image' ? 'image/*' : 'video/*';
    fileInput.value.click();
  }
};

// compressImageLocal 已提取到 utils.ts

const handleFileSelected = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!target.files?.length || !currentUploadTarget) return;

  const file = target.files[0] as File;
  const { index, field, fileType } = currentUploadTarget;

  if (!form.images) form.images = [];
  const imgs = form.images as ImageItem[];
  const item = imgs[index];
  if (!item) {
    target.value = '';
    currentUploadTarget = null;
    return;
  }

  if (fileType === 'image' && field === 'image') {
    item._rawImageFile = markRaw(file);
    item.image = `[待上传] ${file.name}`;
    ElMessage.success('已选择原图，提交时将自动上传并压缩');
  } else if (field === 'video') {
    item._rawVideoFile = markRaw(file);
    item.video = `[待上传] ${file.name}`;
    ElMessage.success('已选择视频，提交时将自动上传');
  }

  uploadingIndex.value = '';
  target.value = ''; // clear input
  currentUploadTarget = null;
};

const getPreviewUrl = (item: ImageItem) => {
  if (item._rawImageFile) {
    return URL.createObjectURL(item._rawImageFile);
  }
  // 如果 item.image 是 [待上传] 状态，但没有 _rawImageFile，可能还在处理中或出错
  if (item.image?.startsWith('[待上传]')) {
    return '';
  }
  return item._imageUrl || item.image;
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      showProgress.value = true;
      overallProgress.value = 0;
      currentStepText.value = '准备上传...';

      try {
        // 1. 统计需要上传的任务总数
        let totalTasks = 0;
        if (form.images) {
          form.images.forEach(item => {
            // 原图上传任务
            if (item._rawImageFile) totalTasks += 1;
            // 视频任务：对于 Live Photo，只要有原图就意味着会提取出一个视频；或者本身有手动选择的视频
            if ((item.isLivePhoto && item._rawImageFile) || item._rawVideoFile) totalTasks += 1;
          });
        }

        let completedTasks = 0;
        const updateOverall = () => {
          overallProgress.value = Math.round((completedTasks / (totalTasks || 1)) * 100);
        };

        // 2. 处理文件上传
        if (form.images && form.images.length > 0) {
          for (let i = 0; i < form.images.length; i++) {
            const item = form.images[i];
            if (!item) continue;

            const clientId = `upload_${Date.now()}_${i}`;

            // --- 提取 Live Photo ---
            if (item.isLivePhoto && item._rawImageFile) {
              currentStepText.value = `解析第 ${i + 1} 项实况素材...`;
              const buffer = await item._rawImageFile.arrayBuffer();
              const view = new Uint8Array(buffer);
              const ftypPattern = [0x66, 0x74, 0x79, 0x70];
              let signatureIdx = -1;
              for (let j = 0; j < view.length - 3; j++) {
                if (view[j] === ftypPattern[0] && view[j + 1] === ftypPattern[1] &&
                    view[j + 2] === ftypPattern[2] && view[j + 3] === ftypPattern[3]) {
                  signatureIdx = j; break;
                }
              }
              if (signatureIdx !== -1) {
                const videoStartIdx = signatureIdx - 4;
                const imageBlob = new Blob([buffer.slice(0, videoStartIdx)], { type: item._rawImageFile.type || 'image/jpeg' });
                const videoBlob = new Blob([buffer.slice(videoStartIdx)], { type: 'video/mp4' });
                item._rawImageFile = new File([imageBlob], item._rawImageFile.name, { type: item._rawImageFile.type || 'image/jpeg' });
                item._rawVideoFile = new File([videoBlob], item._rawImageFile.name.replace(/\.[^/.]+$/, "") + "_live.mp4", { type: 'video/mp4' });
              }
            }

            // --- 上传图片 ---
            if (item._rawImageFile) {
              currentFileName.value = item._rawImageFile.name;
              currentStepText.value = `上传第 ${i + 1} 项图片...`;
              const fileID = await api.uploadFile(item._rawImageFile, 'image', undefined, (p) => {
                currentFileProgress.value = p;
              });
              item.image = fileID;

              if (!item.thumbnail || item.thumbnail.startsWith('[待上传]')) {
                if (item._rawImageFile.size < 1024 * 1024) {
                  item.thumbnail = fileID;
                } else {
                  currentStepText.value = `生成第 ${i + 1} 项缩略图...`;
                  const compressedFile = await compressImageLocal(item._rawImageFile);
                  const thumbID = await api.uploadFile(compressedFile, 'thumbnail');
                  item.thumbnail = thumbID;
                }
              }
              completedTasks++;
              updateOverall();
              currentFileProgress.value = 0;
              delete item._rawImageFile;
            }

            // --- 上传视频 (含压缩逻辑) ---
            if (item._rawVideoFile) {
              currentFileName.value = item._rawVideoFile.name;
              currentStepText.value = `上传第 ${i + 1} 项视频...`;
              isCompressing.value = false;
              compressProgress.value = 0;

              // 发起上传并监控进度
              const uploadPromise = api.uploadFile(item._rawVideoFile, 'video', clientId, (p) => {
                currentFileProgress.value = p;
                if (p === 100) {
                  // 进入压缩轮询阶段
                  currentStepText.value = '视频处理中...';
                }
              });

              // 开启定时轮询压缩进度
              const pollInterval = setInterval(async () => {
                const p = await api.getVideoProgress(clientId);
                if (p > 0) {
                  isCompressing.value = true;
                  compressProgress.value = p;
                }
              }, 800);

              const fileID = await uploadPromise;
              clearInterval(pollInterval);

              item.video = fileID;
              completedTasks++;
              updateOverall();
              currentFileProgress.value = 0;
              isCompressing.value = false;
              delete item._rawVideoFile;
            }
          }
        }

        currentStepText.value = '同步数据库...';
        const payload = { ...form };
        if (payload._id) {
          await api.updatePost(payload._id, payload);
          ElMessage.success('更新成功');
        } else {
          await api.createPost(payload);
          ElMessage.success('发布成功');
        }
        emit('saved');
      } catch (e: any) {
        ElMessage.error('保存失败: ' + e.message);
      } finally {
        submitting.value = false;
        showProgress.value = false;
        // 重置状态
        overallProgress.value = 0;
        currentFileProgress.value = 0;
        isCompressing.value = false;
      }
    } else {
      ElMessage.warning('请补充必填项（如标题和日期等）');
    }
  });
};
</script>

<style scoped>
.hint {
  font-size: 12px;
  color: #999;
  margin-left: 10px;
}
.image-item-card {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
  background-color: #fcfcfd;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  font-weight: bold;
  color: #606266;
}
.card-actions {
  display: flex;
  gap: 4px;
}
.progress-container {
  padding: 10px 0;
}
.step-text {
  margin-bottom: 15px;
  font-weight: bold;
  color: #409eff;
  text-align: center;
}
.sub-progress {
  margin-top: 20px;
  border-top: 1px dashed #eee;
  padding-top: 15px;
}
.sub-text {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}
</style>
