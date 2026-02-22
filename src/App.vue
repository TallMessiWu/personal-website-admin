<template>
  <div class="app-container">
    <el-container>
      <el-header height="60px" class="header">
        <h1>个人网站后台管理 (纯本地版)</h1>
      </el-header>
      <el-tabs v-model="activeTab" class="nav-tabs" @tab-change="onTabChange">
        <el-tab-pane label="动态管理" name="posts" />
        <el-tab-pane label="合集管理" name="collections" />
      </el-tabs>
      <el-main>
        <!-- Posts 模块 -->
        <template v-if="activeTab === 'posts'">
          <div v-if="postView === 'list'" v-loading="postsLoading">
            <PostList :posts="posts" @create="handlePostCreate" @edit="handlePostEdit" @refresh="fetchPosts" />
          </div>
          <div v-else-if="postView === 'form'">
            <PostForm :initial-data="editingPost" @saved="onPostFormSaved" @cancel="postView = 'list'" />
          </div>
        </template>

        <!-- Collections 模块 -->
        <template v-if="activeTab === 'collections'">
          <div v-if="collectionView === 'list'" v-loading="collectionsLoading">
            <CollectionList :collections="collections" @create="handleCollectionCreate" @edit="handleCollectionEdit" @refresh="fetchCollections" />
          </div>
          <div v-else-if="collectionView === 'form'">
            <CollectionForm :initial-data="editingCollection" :all-posts="posts" @saved="onCollectionFormSaved" @cancel="collectionView = 'list'" />
          </div>
        </template>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import PostList from './components/PostList.vue';
import PostForm from './components/PostForm.vue';
import CollectionList from './components/CollectionList.vue';
import CollectionForm from './components/CollectionForm.vue';
import type { Post, Collection } from './types';
import { api } from './api';
import { ElMessage } from 'element-plus';

const activeTab = ref<'posts' | 'collections'>('posts');

// ===== Posts =====
const postView = ref<'list' | 'form'>('list');
const posts = ref<Post[]>([]);
const editingPost = ref<Post | null>(null);
const postsLoading = ref(false);

const fetchPosts = async () => {
  postsLoading.value = true;
  try {
    posts.value = await api.getPosts();
  } catch (e: any) {
    ElMessage.error('获取动态列表失败: ' + e.message);
  } finally {
    postsLoading.value = false;
  }
};

const handlePostCreate = () => {
  editingPost.value = null;
  postView.value = 'form';
};

const handlePostEdit = (post: Post) => {
  editingPost.value = post;
  postView.value = 'form';
};

const onPostFormSaved = () => {
  postView.value = 'list';
  fetchPosts();
};

// ===== Collections =====
const collectionView = ref<'list' | 'form'>('list');
const collections = ref<Collection[]>([]);
const editingCollection = ref<Collection | null>(null);
const collectionsLoading = ref(false);

const fetchCollections = async () => {
  collectionsLoading.value = true;
  try {
    collections.value = await api.getCollections();
  } catch (e: any) {
    ElMessage.error('获取合集列表失败: ' + e.message);
  } finally {
    collectionsLoading.value = false;
  }
};

const handleCollectionCreate = () => {
  editingCollection.value = null;
  collectionView.value = 'form';
};

const handleCollectionEdit = (collection: Collection) => {
  editingCollection.value = collection;
  collectionView.value = 'form';
};

const onCollectionFormSaved = () => {
  collectionView.value = 'list';
  fetchCollections();
};

// Tab 切换时加载数据
const onTabChange = (tab: string | number) => {
  if (tab === 'posts' && posts.value.length === 0) {
    fetchPosts();
  } else if (tab === 'collections') {
    fetchCollections();
    // 同时确保 posts 数据加载（CollectionForm 需要）
    if (posts.value.length === 0) {
      fetchPosts();
    }
  }
};

onMounted(() => {
  fetchPosts();
});
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
.nav-tabs {
  padding: 0 20px;
}
.nav-tabs .el-tabs__header {
  margin-bottom: 0;
}
.el-main {
  padding: 20px;
}
</style>
