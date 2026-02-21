<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="post-form">
    <el-form-item label="ID" prop="id">
      <el-input-number v-model="form.id" :min="1" />
      <span class="hint">唯一标识符，建议递增</span>
    </el-form-item>

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
      <el-input v-model="form.video" placeholder="如 B站 BV 号或完整链接" />
    </el-form-item>

    <el-divider>图文混排 / Live Photo 配置</el-divider>

    <div v-for="(item, index) in form.images" :key="index" class="image-item-card">
      <div class="card-header">
        <span>图片项 {{ index + 1 }}</span>
        <el-button type="danger" size="small" icon="Delete" circle @click="removeImage(index)" />
      </div>
      <el-form-item label="原图 (高清)">
        <el-input v-model="item.image" placeholder="原图链接或 fileID" />
        <el-button style="margin-top:5px" :loading="uploadingIndex === `${index}-image`" @click="triggerUpload(index, 'image', 'image')">
          上传本地图片并压缩
        </el-button>
      </el-form-item>

      <el-form-item label="缩略图 (低清)">
        <el-input v-model="item.thumbnail" placeholder="缩略图链接或 fileID，上传原图时自动生成" />
      </el-form-item>

      <el-form-item label="Live视频">
        <el-input v-model="item.video" placeholder="Live Photo 短视频链接或 fileID" />
        <el-button style="margin-top:5px" :loading="uploadingIndex === `${index}-video`" @click="triggerUpload(index, 'video', 'video')">
          上传本地视频
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
import { ref, reactive, onMounted } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { Post, ImageItem } from '../types';
import { api } from '../api';

const props = defineProps<{ initialData?: Post | null }>();
const emit = defineEmits(['saved', 'cancel']);

const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive<Post>({
  id: Date.now(),
  title: '',
  content: '',
  date: '',
  pinned: false,
  video: '',
  images: [],
});

const rules = reactive<FormRules>({
  id: [{ required: true, message: 'ID不能为空', trigger: 'blur' }],
  title: [{ required: true, message: '标题不能为空', trigger: 'blur' }],
  date: [{ required: true, message: '日期不能为空', trigger: 'change' }],
});

onMounted(() => {
  if (props.initialData) {
    Object.assign(form, JSON.parse(JSON.stringify(props.initialData)));
    if (!form.images) form.images = [];
  } else {
    // 默认当前时间 yyyy-MM-dd HH:mm
    const d = new Date();
    form.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
});

const addImageItem = () => {
  if (!form.images) form.images = [];
  form.images.push({ image: '', thumbnail: '', video: '' });
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

const handleFileSelected = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!target.files?.length || !currentUploadTarget) return;

  const file = target.files[0] as File;
  const { index, field, fileType } = currentUploadTarget;
  uploadingIndex.value = `${index}-${field}`;

  try {
    // 1. 直传到云存储
    const fileID = await api.uploadFile(file, fileType);
    if (!form.images) form.images = [];
    const imgs = form.images as ImageItem[];
    const item = imgs[index];
    if (!item) return;

    // 如果是图片，并且传到 image 字段，则顺便触发压缩
    if (fileType === 'image' && field === 'image') {
      item.image = fileID;
      ElMessage.success('原图上传成功，正在生成缩略图...');
      try {
        const compressRes = await api.compressImage(fileID);
        if (compressRes.thumbnailFileID) {
          item.thumbnail = compressRes.thumbnailFileID;
          ElMessage.success('缩略图生成成功！');
        }
      } catch (err: any) {
        ElMessage.warning('原图已上传，但缩略图生成失败: ' + err.message);
      }
    } else if (field === 'video') {
      item.video = fileID;
      ElMessage.success('视频上传成功！');
    }
  } catch (err: any) {
    ElMessage.error('上传失败: ' + err.message);
  } finally {
    uploadingIndex.value = '';
    target.value = ''; // clear input
    currentUploadTarget = null;
  }
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
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
</style>
