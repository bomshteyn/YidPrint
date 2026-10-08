<template>
  <div ref="container" class="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-900">
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
      Loading 3D preview…
    </div>
    <div v-if="error" class="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{ url: string; filename: string }>();

const container = ref<HTMLElement>();
const loading = ref(true);
const error = ref('');

let cleanup: (() => void) | null = null;

onMounted(async () => {
  try {
    const THREE = await import('three');
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
    const ext = props.filename.split('.').pop()?.toLowerCase() ?? '';

    let object: InstanceType<typeof THREE.Object3D>;
    if (ext === 'stl') {
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
      const geo = await new STLLoader().loadAsync(props.url);
      geo.computeVertexNormals();
      object = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.6 }));
    } else if (ext === '3mf') {
      const { ThreeMFLoader } = await import('three/examples/jsm/loaders/3MFLoader.js');
      object = await new ThreeMFLoader().loadAsync(props.url);
    } else if (ext === 'obj') {
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
      object = await new OBJLoader().loadAsync(props.url);
      object.traverse((child) => {
        if ((child as InstanceType<typeof THREE.Mesh>).isMesh) {
          (child as InstanceType<typeof THREE.Mesh>).material = new THREE.MeshStandardMaterial({
            color: 0x9ca3af,
            roughness: 0.6,
          });
        }
      });
    } else {
      error.value = 'No preview available for this file type.';
      loading.value = false;
      return;
    }

    const el = container.value!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x18181b);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(3, 5, 4);
    scene.add(dir);
    scene.add(object);

    // Auto-fit camera.
    const box = new THREE.Box3().setFromObject(object);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const camera = new THREE.PerspectiveCamera(45, 4 / 3, sphere.radius / 100, sphere.radius * 100);
    camera.position.copy(sphere.center).add(new THREE.Vector3(1, 0.7, 1).normalize().multiplyScalar(sphere.radius * 2.5));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(sphere.center);
    controls.enableDamping = true;

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();
    loading.value = false;

    cleanup = () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  } catch (e) {
    error.value = 'Could not load 3D preview.';
    loading.value = false;
  }
});

onBeforeUnmount(() => cleanup?.());
</script>
