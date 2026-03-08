import * as THREE from 'three';
import { PlanetDNA } from './galaxyTypes';

// A simple 2D pseudo-random noise function for procedural generation
// Based on value noise to keep performance high
const noise2D = (x: number, y: number, seed: number) => {
  const n = x + y * 57 + seed * 131;
  const t = (n << 13) ^ n;
  return 1.0 - ((t * (t * t * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0;
};

// Smooth noise interpolation
const smoothNoise2D = (x: number, y: number, seed: number) => {
  const corners = (noise2D(x - 1, y - 1, seed) + noise2D(x + 1, y - 1, seed) + noise2D(x - 1, y + 1, seed) + noise2D(x + 1, y + 1, seed)) / 16;
  const sides = (noise2D(x - 1, y, seed) + noise2D(x + 1, y, seed) + noise2D(x, y - 1, seed) + noise2D(x, y + 1, seed)) / 8;
  const center = noise2D(x, y, seed) / 4;
  return corners + sides + center;
};

const interpolate = (a: number, b: number, t: number) => {
  const ft = t * Math.PI;
  const f = (1 - Math.cos(ft)) * 0.5;
  return a * (1 - f) + b * f;
};

const interpolatedNoise2D = (x: number, y: number, seed: number) => {
  const integer_X = Math.floor(x);
  const fractional_X = x - integer_X;
  const integer_Y = Math.floor(y);
  const fractional_Y = y - integer_Y;

  const v1 = smoothNoise2D(integer_X, integer_Y, seed);
  const v2 = smoothNoise2D(integer_X + 1, integer_Y, seed);
  const v3 = smoothNoise2D(integer_X, integer_Y + 1, seed);
  const v4 = smoothNoise2D(integer_X + 1, integer_Y + 1, seed);

  const i1 = interpolate(v1, v2, fractional_X);
  const i2 = interpolate(v3, v4, fractional_X);

  return interpolate(i1, i2, fractional_Y);
};

// Fractal Brownian Motion for rich organic textures
const fbm = (x: number, y: number, octaves: number, seed: number) => {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    total += interpolatedNoise2D(x * frequency, y * frequency, seed) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total / maxValue;
};

// Generates a base color texture map based on DNA terrain style and palette
export const generatePlanetTexture = (dna: PlanetDNA): THREE.CanvasTexture => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const { terrainStyle, palette, seed } = dna;
  const colorBase = new THREE.Color(palette.base);
  const colorSec = new THREE.Color(palette.secondary);
  const colorThird = new THREE.Color(palette.emissive);

  const imgData = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Map x/y to spherical-like projection coordinates or just straight noise
      const nx = x / size;
      const ny = y / size;

      let value = 0;

      if (terrainStyle === 'banded') {
        const distort = fbm(nx * 4, ny * 10, 4, seed) * 0.3;
        value = Math.sin((ny + distort) * Math.PI * 12) * 0.5 + 0.5;
      } else if (terrainStyle === 'cratered') {
        value = Math.abs(fbm(nx * 8, ny * 8, 5, seed));
        value = Math.pow(value, 2.0); // sharp peaks
      } else if (terrainStyle === 'liquid') {
        value = fbm(nx * 3, ny * 3, 3, seed);
        value = Math.sin(value * Math.PI * 4) * 0.5 + 0.5;
      } else { // 'mineral' or 'lush' or 'icy'
        value = fbm(nx * 6, ny * 6, 6, seed);
      }

      // Normalize value 0 to 1 safely
      value = (value + 1) / 2;
      value = Math.max(0, Math.min(1, value));

      const outColor = new THREE.Color();
      if (value < 0.4) {
        outColor.lerpColors(colorBase, colorSec, value / 0.4);
      } else {
        outColor.lerpColors(colorSec, colorThird, (value - 0.4) / 0.6);
      }

      // Add slight variation for realism
      const grain = (Math.random() - 0.5) * 0.05;
      outColor.r += grain;
      outColor.g += grain;
      outColor.b += grain;

      const i = (y * size + x) * 4;
      imgData.data[i] = Math.min(255, Math.max(0, outColor.r * 255));
      imgData.data[i + 1] = Math.min(255, Math.max(0, outColor.g * 255));
      imgData.data[i + 2] = Math.min(255, Math.max(0, outColor.b * 255));
      imgData.data[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  // texture.colorSpace = THREE.SRGBColorSpace; // Optional but good for newer three versions
  texture.needsUpdate = true;
  return texture;
};

// Generates a soft glow texture for particles
let cachedGlowMap: THREE.CanvasTexture | null = null;
export const getGlowSprite = (): THREE.CanvasTexture => {
  if (cachedGlowMap) return cachedGlowMap;

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  cachedGlowMap = new THREE.CanvasTexture(canvas);
  cachedGlowMap.needsUpdate = true;
  return cachedGlowMap;
};
