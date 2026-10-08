<template>
  <div ref="container" class="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100 outline-1 -outline-offset-1 outline-black/5">
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
      Loading 3D preview…
    </div>
    <div v-if="error" class="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
      {{ error }}
    </div>
    <p v-if="!error" class="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-xs text-zinc-500 backdrop-blur">
      Drag to rotate
    </p>
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
      object = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.65, metalness: 0.05 }));
    } else if (ext === '3mf') {
      const { ThreeMFLoader } = await import('three/examples/jsm/loaders/3MFLoader.js');
      object = await new ThreeMFLoader().loadAsync(props.url);
    } else if (ext === 'obj') {
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
      object = await new OBJLoader().loadAsync(props.url);
      object.traverse((child) => {
        if ((child as InstanceType<typeof THREE.Mesh>).isMesh) {
          (child as InstanceType<typeof THREE.Mesh>).material = new THREE.MeshStandardMaterial({
            color: 0x71717a,
            roughness: 0.65,
            metalness: 0.05,
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
    scene.background = new THREE.Color(0xf4f4f5);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd4d4d8, 1.4));
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(3, 5, 4);
    scene.add(dir);
    scene.add(object);

    // Subtle ground grid.
    const box = new THREE.Box3().setFromObject(object);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const grid = new THREE.GridHelper(sphere.radius * 6, 24, 0xd4d4d8, 0xe4e4e7);
    grid.position.y = box.min.y - sphere.radius * 0.02;
    scene.add(grid);

    const camera = new THREE.PerspectiveCamera(45, 1, sphere.radius / 100, sphere.radius * 100);
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
  } catch {
    error.value = 'Could not load 3D preview.';
    loading.value = false;
  }
});

onBeforeUnmount(() => cleanup?.());
</script>
