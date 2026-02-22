<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="collection-form">

    <el-form-item label="名称" prop="name">
      <el-input v-model="form.name" placeholder="合集名称" />
    </el-form-item>

    <el-form-item label="置顶">
      <el-switch v-model="form.pinned" />
    </el-form-item>

    <el-form-item label="最新动态">
      <el-tag v-if="form.latestPostDate" type="info">{{ form.latestPostDate }}</el-tag>
      <span v-else style="color: #999">（空，添加 Post 后自动计算）</span>
    </el-form-item>

    <el-form-item label="封面图">
      <el-input v-model="form.thumbnail" placeholder="封面图链接或 fileID" style="margin-bottom: 8px" />
      <el-button @click="triggerThumbnailUpload">选择本地图片</el-button>
      <div v-if="thumbnailPreview" style="margin-top: 8px;">
        <el-image
          :src="thumbnailPreview"
          style="width: 120px; height: 120px"
          fit="cover"
          :preview-src-list="[thumbnailPreview]"
          preview-teleported
        />
      </div>
    </el-form-item>

    <el-divider>关联 Posts</el-divider>

    <!-- 已选 posts 排序区域 -->
    <div v-if="selectedPosts.length > 0" class="selected-posts-section">
      <div class="section-header">
        <span class="section-title">已选 Posts ({{ selectedPosts.length }})</span>
        <el-button size="small" @click="sortByDate">按日期排序</el-button>
      </div>
      <el-table :data="selectedPosts" border size="small" row-key="_id" class="selected-table">
        <el-table-column label="排序" width="80" align="center">
          <template #default="{ $index }">
            <div class="sort-buttons">
              <el-button
                :icon="ArrowUp"
                size="small"
                circle
                :disabled="$index === 0"
                @click="moveUp($index)"
              />
              <el-button
                :icon="ArrowDown"
                size="small"
                circle
                :disabled="$index === selectedPosts.length - 1"
                @click="moveDown($index)"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="日期" width="160" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-button size="small" type="danger" :icon="Delete" circle @click="removePost(row._id)" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Posts 选择区域 -->
    <div class="posts-select-section">
      <div class="section-header">
        <span class="section-title">可选 Posts</span>
        <el-input
          v-model="searchQuery"
          placeholder="搜索标题..."
          size="small"
          clearable
          style="width: 200px"
        />
      </div>
      <el-table
        ref="availableTableRef"
        :data="filteredAvailablePosts"
        border
        size="small"
        max-height="300"
        row-key="_id"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" :reserve-selection="true" />
        <el-table-column prop="date" label="日期" width="160" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag v-if="row.pinned" type="danger" size="small" style="margin-right: 5px;">置顶</el-tag>
            {{ row.title }}
          </template>
        </el-table-column>
      </el-table>
      <el-button type="primary" plain size="small" style="margin-top: 8px" @click="addSelectedPosts" :disabled="pendingSelection.length === 0">
        添加选中的 {{ pendingSelection.length }} 项
      </el-button>
    </div>

    <el-form-item style="margin-top: 20px;">
      <el-button type="primary" :loading="submitting" @click="submitForm">保存提交</el-button>
      <el-button @click="$emit('cancel')">取消返回</el-button>
    </el-form-item>

    <!-- 隐藏的文件选择器 -->
    <input type="file" ref="fileInput" accept="image/*" style="display: none" @change="handleThumbnailSelected" />
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, markRaw } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { ArrowUp, ArrowDown, Delete } from '@element-plus/icons-vue';
import type { Collection, Post } from '../types';
import { api } from '../api';
import { compressImageLocal } from '../utils';

const props = defineProps<{ initialData?: Collection | null; allPosts: Post[] }>();
const emit = defineEmits(['saved', 'cancel']);

const formRef = ref<FormInstance>();
const submitting = ref(false);
const fileInput = ref<HTMLInputElement>();
const searchQuery = ref('');
const availableTableRef = ref();
const pendingSelection = ref<Post[]>([]);

const form = reactive<Collection & { _rawThumbnailFile?: File }>({
  name: '',
  thumbnail: '',
  posts: [],
  pinned: false,
  latestPostDate: '',
});

// 已选 posts 的完整对象列表（用于展示和排序）
const selectedPosts = ref<Post[]>([]);

const rules = reactive<FormRules>({
  name: [{ required: true, message: '名称不能为空', trigger: 'blur' }],
});

// 缩略图预览
const thumbnailPreview = computed(() => {
  if (form._rawThumbnailFile) {
    return URL.createObjectURL(form._rawThumbnailFile);
  }
  // 优先展示后端解析出的 _thumbnailUrl，或者是合集自有的 URL/fileID
  if (form.thumbnail && !form.thumbnail.startsWith('[待上传]')) {
    return (form as any)._thumbnailUrl || form.thumbnail;
  }
  return '';
});

// 可选列表 = 所有 posts 中排除已选的
const filteredAvailablePosts = computed(() => {
  const selectedIds = new Set(form.posts);
  let list = props.allPosts.filter((p) => p._id && !selectedIds.has(p._id));
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter((p) => p.title.toLowerCase().includes(q));
  }
  return list;
});

onMounted(() => {
  if (props.initialData) {
    Object.assign(form, JSON.parse(JSON.stringify(props.initialData)));
    if (!form.posts) form.posts = [];
  }
  // 根据 form.posts 中的 id 恢复已选 posts 的完整对象
  rebuildSelectedPosts();
});

const rebuildSelectedPosts = () => {
  const postMap = new Map(props.allPosts.map((p) => [p._id, p]));
  selectedPosts.value = form.posts
    .map((id) => postMap.get(id))
    .filter(Boolean) as Post[];
  // 初始化计算最新日期
  syncFormPosts();
};

// 同步 selectedPosts 回 form.posts 并更新最新动态日期
const syncFormPosts = () => {
  form.posts = selectedPosts.value.map((p) => p._id!).filter(Boolean);

  // 自动计算最新动态日期
  let latest = '';
  for (const p of selectedPosts.value) {
    if (p.date && p.date > latest) latest = p.date;
  }
  form.latestPostDate = latest;
};

// ===== 排序操作 =====
const moveUp = (index: number) => {
  if (index <= 0) return;
  const arr = selectedPosts.value;
  const temp = arr.splice(index, 1)[0];
  if (temp) arr.splice(index - 1, 0, temp);
  selectedPosts.value = [...arr];
  syncFormPosts();
};

const moveDown = (index: number) => {
  const arr = selectedPosts.value;
  if (index >= arr.length - 1) return;
  const temp = arr.splice(index, 1)[0];
  if (temp) arr.splice(index + 1, 0, temp);
  selectedPosts.value = [...arr];
  syncFormPosts();
};

const sortByDate = () => {
  selectedPosts.value.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  selectedPosts.value = [...selectedPosts.value];
  syncFormPosts();
  ElMessage.success('已按日期降序排列');
};

const removePost = (id?: string) => {
  if (!id) return;
  selectedPosts.value = selectedPosts.value.filter((p) => p._id !== id);
  syncFormPosts();
};

// ===== Posts 勾选 =====
const handleSelectionChange = (selection: Post[]) => {
  pendingSelection.value = selection;
};

const addSelectedPosts = () => {
  for (const post of pendingSelection.value) {
    if (post._id && !form.posts.includes(post._id)) {
      form.posts.push(post._id);
      selectedPosts.value.push(post);
    }
  }
  syncFormPosts();
  pendingSelection.value = [];
  // 清空勾选状态
  availableTableRef.value?.clearSelection();
};

// ===== Thumbnail 上传 =====
const triggerThumbnailUpload = () => {
  fileInput.value?.click();
};

const handleThumbnailSelected = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!target.files?.length) return;
  const file = target.files[0] as File;
  form._rawThumbnailFile = markRaw(file);
  form.thumbnail = `[待上传] ${file.name}`;
  ElMessage.success('已选择封面图，提交时将自动压缩上传');
  target.value = '';
};

// ===== 提交 =====
const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
        // 处理 thumbnail 上传
        if (form._rawThumbnailFile) {
          const file = form._rawThumbnailFile;
          // 如果原图小于 1MB，直接上传，不再压缩
          if (file.size < 1024 * 1024) {
            ElMessage.info('图片较小，正在直接上传封面图...');
            const fileID = await api.uploadFile(file, 'collection');
            form.thumbnail = fileID;
          } else {
            ElMessage.info('正在压缩并上传封面图...');
            const compressed = await compressImageLocal(file, 600, 600, 0.7);
            const fileID = await api.uploadFile(compressed, 'collection');
            form.thumbnail = fileID;
          }
          delete form._rawThumbnailFile;
        }

        const payload: any = {
          name: form.name,
          thumbnail: form.thumbnail,
          posts: form.posts,
          pinned: !!form.pinned,
          latestPostDate: form.latestPostDate,
        };

        if (form._id) {
          await api.updateCollection(form._id, payload);
          ElMessage.success('更新成功');
        } else {
          await api.createCollection(payload);
          ElMessage.success('创建成功');
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
.selected-posts-section {
  margin-bottom: 20px;
}
.posts-select-section {
  margin-bottom: 20px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.section-title {
  font-weight: bold;
  font-size: 14px;
  color: #606266;
}
.sort-buttons {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
}
.selected-table {
  margin-bottom: 10px;
}
</style>
