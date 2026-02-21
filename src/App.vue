<template>
  <div class="app-container">
    <el-container>
      <el-header height="60px" class="header">
        <h1>个人网站后台管理 (纯本地版)</h1>
      </el-header>
      <el-main>
        <div v-if="view === 'list'" v-loading="loading">
          <PostList :posts="posts" @create="handleCreate" @edit="handleEdit" @refresh="fetchData" />
        </div>
        <div v-else-if="view === 'form'">
          <PostForm :initial-data="editingPost" @saved="onFormSaved" @cancel="view = 'list'" />
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import PostList from './components/PostList.vue';
import PostForm from './components/PostForm.vue';
import type { Post } from './types';
import { api } from './api';
import { ElMessage } from 'element-plus';

const view = ref<'list' | 'form'>('list');
const posts = ref<Post[]>([]);
const editingPost = ref<Post | null>(null);
const loading = ref(false);

const fetchData = async () => {
  loading.value = true;
  try {
    posts.value = await api.getPosts();
  } catch (e: any) {
    ElMessage.error('获取列表失败: ' + e.message);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

const handleCreate = () => {
  editingPost.value = null; // null means create new
  // generate an auto-increment or nice ID locally
  const tempPost = {
    id: posts.value.length ? Math.max(...posts.value.map(p => p.id)) + 1 : 1,
    title: '', date: ''
  } as Post;
  editingPost.value = tempPost;
  view.value = 'form';
};

const handleEdit = (post: Post) => {
  editingPost.value = post;
  view.value = 'form';
};

const onFormSaved = () => {
  view.value = 'list';
  fetchData();
};
</script>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: #f5f7fa;
}
.app-container {
  max-width: 1000px;
  margin: 0 auto;
  background-color: white;
  min-height: 100vh;
  box-shadow: 0 0 10px rgba(0,0,0,0.05);
}
.header {
  background-color: #409eff;
  color: white;
  display: flex;
  align-items: center;
}
.header h1 {
  margin: 0;
  font-size: 20px;
}
.el-main {
  padding: 20px;
}
</style>
