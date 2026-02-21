<template>
  <div class="post-list">
    <div class="header">
      <h2>动态管理</h2>
      <el-button type="primary" @click="$emit('create')">发新动态</el-button>
    </div>
    <el-table :data="posts" border stripe>
      <el-table-column prop="_id" label="ID (_id)" width="220" align="center" show-overflow-tooltip />
      <el-table-column prop="date" label="时间" width="160" />
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <el-tag v-if="row.pinned" type="danger" size="small" style="margin-right: 5px;">置顶</el-tag>
          {{ row.title }}
        </template>
      </el-table-column>
      <el-table-column label="多媒体" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.images?.length" size="small">{{ row.images.length }} 图</el-tag>
          <el-tag v-else-if="row.video" type="warning" size="small">视频</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center">
        <template #default="{ row }">
          <el-button size="small" @click="$emit('edit', row)">编辑</el-button>
          <el-popconfirm title="确定删除吗？" @confirm="handleDelete(row._id)">
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import type { Post } from '../types';
import { api } from '../api';
import { ElMessage } from 'element-plus';

const props = defineProps<{ posts: Post[] }>();
const emit = defineEmits(['create', 'edit', 'refresh']);

async function handleDelete(id?: string) {
  if (!id) return;
  try {
    await api.deletePost(id);
    ElMessage.success('删除成功');
    emit('refresh');
  } catch (e: any) {
    ElMessage.error('删除失败: ' + e.message);
  }
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
</style>
