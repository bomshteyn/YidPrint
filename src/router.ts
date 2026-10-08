import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./views/HomeView.vue') },
    { path: '/models', component: () => import('./views/ModelsView.vue') },
    { path: '/models/:slug', component: () => import('./views/ModelDetailView.vue') },
    { path: '/models/:slug/edit', component: () => import('./views/ModelEditView.vue') },
    { path: '/upload', component: () => import('./views/UploadView.vue') },
    { path: '/me', component: () => import('./views/MyModelsView.vue') },
    { path: '/u/:username', component: () => import('./views/UserProfileView.vue') },
    { path: '/login', component: () => import('./views/LoginView.vue') },
    { path: '/register', component: () => import('./views/RegisterView.vue') },
    { path: '/admin', component: () => import('./views/AdminQueueView.vue') },
    { path: '/admin/models/:id', component: () => import('./views/AdminModelView.vue') },
    { path: '/admin/reports', component: () => import('./views/AdminReportsView.vue') },
    { path: '/guidelines', component: () => import('./views/GuidelinesView.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('./views/NotFoundView.vue') },
  ],
});
