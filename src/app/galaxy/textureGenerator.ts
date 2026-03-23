import * as THREE from 'three';
import { PlanetDNA } from './galaxyTypes';

const textureLoader = new THREE.TextureLoader();
const textureCache: Record<string, THREE.Texture> = {};

export const generatePlanetTexture = (dna: PlanetDNA): THREE.Texture => {
  const classToTextureMap: Record<string, string> = {
    rocky: '/textures/2k_mercury.jpg',
    desert: '/textures/8k_mars.jpg',
    oceanic: '/textures/2k_earth_daymap.jpg',
    ice: '/textures/4k_eris_fictional.jpg',
    lush: '/textures/4k_haumea_fictional.jpg',
    gas_giant: '/textures/2k_jupiter.jpg',
    ringed_giant: '/textures/2k_saturn.jpg',
    aurora_exotic: '/textures/2k_uranus.jpg',
    obsidian: '/textures/4k_ceres_fictional.jpg',
    storm_electric: '/textures/2k_neptune.jpg',
  };

  const url = classToTextureMap[dna.planetClass] || '/textures/8k_moon.jpg';
  
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
