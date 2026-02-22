<template>
  <div class="collection-list">
    <div class="header">
      <h2>合集管理</h2>
      <el-button type="primary" @click="$emit('create')">新建合集</el-button>
    </div>
    <el-table :data="collections" border stripe>
      <el-table-column prop="_id" label="ID (_id)" width="220" align="center" show-overflow-tooltip />
      <el-table-column label="最新动态时间" width="170" align="center">
        <template #default="{ row }">
          <span v-if="row.latestPostDate">{{ row.latestPostDate }}</span>
          <span v-else style="color: #999">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" min-width="200" show-overflow-tooltip />
      <el-table-column label="封面" width="100" align="center">
        <template #default="{ row }">
          <el-image
            v-if="row._displayThumbnail"
            :src="row._displayThumbnail"
            style="width: 50px; height: 50px"
            fit="cover"
            :preview-src-list="[row._displayThumbnail]"
            preview-teleported
          />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="封面状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row._hasOwnThumbnail" type="success" size="small">已设置</el-tag>
          <el-tag v-else type="info" size="small">未设置</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Posts 数" width="100" align="center">
        <template #default="{ row }">
          <el-tag size="small">{{ row.posts?.length || 0 }}</el-tag>
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
import type { Collection } from '../types';
import { api } from '../api';
import { ElMessage } from 'element-plus';

const props = defineProps<{ collections: Collection[] }>();
const emit = defineEmits(['create', 'edit', 'refresh']);

async function handleDelete(id?: string) {
  if (!id) return;
  try {
    await api.deleteCollection(id);
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
