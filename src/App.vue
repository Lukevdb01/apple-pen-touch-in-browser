<script setup lang="ts">
import { ref, onMounted } from 'vue';
import TouchListener from './core/touch-listener';

const canvasRef = ref<HTMLCanvasElement|null>(null);
const forceRef = ref<HTMLElement|null>(null);
const touchRef = ref<HTMLElement|null>(null);

onMounted(() => {
  new TouchListener(canvasRef, forceRef, touchRef);
});
</script>

<template>
    <div ref="forceRef"></div>
    <div ref="touchRef"></div>
    <canvas ref="canvasRef"></canvas>
</template>
