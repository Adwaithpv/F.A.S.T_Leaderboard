import * as THREE from 'three';
import { PlanetDNA } from './galaxyTypes';

const textureLoader = new THREE.TextureLoader();
const textureCache: Record<string, THREE.Texture> = {};

const REALISTIC_TEXTURES = [
  '16ac4b7d05ba8f43b62e56e56f5f9a67.jpg',
  '2k_earth_daymap.jpg',
  '2k_jupiter.jpg',
  '2k_mercury.jpg',
  '2k_neptune.jpg',
  '2k_saturn.jpg',
  '2k_uranus.jpg',
  '2k_venus_atmosphere.jpg',
  '2k_venus_surface.jpg',
  '4k_ceres_fictional.jpg',
  '4k_eris_fictional.jpg',
  '4k_haumea_fictional.jpg',
  '4k_makemake_fictional.jpg',
  '8k_earth_clouds.jpg',
  '8k_earth_nightmap.jpg',
  '8k_mars.jpg',
  '8k_moon.jpg',
  'c0bf2c169a377e96ee80b25245188c65-2.jpg',
  'c0bf2c169a377e96ee80b25245188c65.jpg',
  'earthcloudmap.jpg',
  'frozen-planet-texture-panorama-360-degrees-computer-generated-abstract-K4AKWY.jpg',
  'images-2.jpeg',
  'images-3.jpeg',
  'images-4.jpeg',
  'images-5.jpeg',
  'images-6.jpeg',
  'images-7.jpeg',
  'jSGZg.jpg'
];

export const generatePlanetTexture = (dna: PlanetDNA): THREE.Texture => {
  const index = dna.seed % REALISTIC_TEXTURES.length;
  const url = `/textures/${REALISTIC_TEXTURES[index]}`;
  
  if (!textureCache[url]) {
    const texture = textureLoader.load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    textureCache[url] = texture;
  }
  
  return textureCache[url];
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
