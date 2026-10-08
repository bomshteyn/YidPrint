import { ref } from 'vue';
import { api, type SessionUser } from './api';

export const currentUser = ref<SessionUser | null>(null);
export const authLoaded = ref(false);

export async function loadAuth() {
  try {
    const { user } = await api.me();
    currentUser.value = user;
  } catch {
    currentUser.value = null;
  } finally {
    authLoaded.value = true;
  }
}

export async function logout() {
  await api.logout();
  currentUser.value = null;
}
