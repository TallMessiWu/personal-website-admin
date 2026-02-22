<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="post-form">

    <el-form-item label="标题" prop="title">
      <el-input v-model="form.title" placeholder="动态标题" />
    </el-form-item>

    <el-form-item label="日期" prop="date">
      <el-date-picker
        v-model="form.date"
        type="datetime"
        format="YYYY-MM-DD HH:mm"
        value-format="YYYY-MM-DD HH:mm"
        placeholder="选择发布日期时间"
        style="width: 100%"
      />
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
      <el-form-item label="原图 (高清)">
        <el-input v-model="item.image" placeholder="原图链接或 fileID" />
        <el-button style="margin-top:5px" @click="triggerUpload(index, 'image', 'image')">
          选择本地图片
        </el-button>
      </el-form-item>

      <el-form-item label="缩略图 (低清)">
        <el-input v-model="item.thumbnail" placeholder="缩略图链接或 fileID，上传原图时自动生成" />
      </el-form-item>

      <el-form-item label="Live视频">
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
        form.images.push({ image: info.pic, thumbnail: '', video: '' });
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
  form.images.push({ image: '', thumbnail: '', video: '' });
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

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
        // 先处理所有待上传的文件
        if (form.images && form.images.length > 0) {
          for (let i = 0; i < form.images.length; i++) {
            const item = form.images[i];
            if (!item) continue;

            // 处理原图及缩略图
            if (item._rawImageFile) {
              const file = item._rawImageFile;
              ElMessage.info(`正在上传第 ${i + 1} 项的原图...`);
              const fileID = await api.uploadFile(file, 'image');
              item.image = fileID;

              if (!item.thumbnail || item.thumbnail.startsWith('[待上传]')) {
                ElMessage.info(`正在本地生成并上传第 ${i + 1} 项的缩略图...`);
                try {
                  const compressedFile = await compressImageLocal(file);
                  const thumbFileID = await api.uploadFile(compressedFile, 'thumbnail');
                  item.thumbnail = thumbFileID;
                } catch (err: any) {
                  ElMessage.warning(`第 ${i + 1} 项的缩略图生成失败: ` + err.message);
                  item.thumbnail = ''; // 失败则置空
                }
              }
              delete item._rawImageFile;
            }

            // 处理视频
            if (item._rawVideoFile) {
              const file = item._rawVideoFile;
              ElMessage.info(`正在上传第 ${i + 1} 项的视频...`);
              const fileID = await api.uploadFile(file, 'video');
              item.video = fileID;
              delete item._rawVideoFile;
            }
          }
        }

        const payload = { ...form };
        if (payload._id) {
          // Edit
          await api.updatePost(payload._id, payload);
          ElMessage.success('更新成功');
        } else {
          // Create
          await api.createPost(payload);
          ElMessage.success('发布成功');
        }
        emit('saved');
      } catch (e: any) {
        ElMessage.error('保存失败: ' + e.message);
      } finally {
        submitting.value = false;
      }
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
</style>
