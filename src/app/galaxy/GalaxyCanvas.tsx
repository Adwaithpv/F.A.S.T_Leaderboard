import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Billboard, Text, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, DepthOfField, ChromaticAberration, Noise, SSAO } from '@react-three/postprocessing';
import { a, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import { GalaxyTeam, PlanetDNA } from './galaxyTypes';
import { generatePlanetTexture, getGlowSprite } from './textureGenerator';

type QualityMode = 'cinematic' | 'performance';

type GalaxyCanvasProps = {
  teams: GalaxyTeam[];
  dnaByTeam: Record<string, PlanetDNA>;
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  qualityMode: QualityMode;
  onResetViewKey?: number;
  previousLeaderId?: string | null;
  leaderTransitionValue?: number;
  pulseByTeamId?: Record<string, number>;
  isFreeView?: boolean;
};

type PlanetNodeProps = {
  team: GalaxyTeam;
  leader: GalaxyTeam;
  dna: PlanetDNA;
  isSelected: boolean;
  isPreviousLeader: boolean;
  transitionValue: number;
  pulseValue: number;
  qualityMode: QualityMode;
  onSelectTeam: (teamId: string) => void;
};

const hexToColor = (value: string) => new THREE.Color(value);
const focusOffset = new THREE.Vector3(8, 4.5, 8);
const _tmpVec = new THREE.Vector3();

const getOrbitalPosition = (team: GalaxyTeam, elapsedTime: number) => {
  if (team.rank === 1 || team.orbitRadius <= 0.0001) {
    return new THREE.Vector3(0, 0, 0);
  }
  const eccentricity = team.orbitEccentricity;
  const theta = team.orbitPhase + elapsedTime * team.orbitSpeed;
  const radiusOffset = team.orbitRadius * (1 + Math.cos(theta * 2.0) * eccentricity * 0.3);
  const x = Math.cos(theta) * radiusOffset;
  const z = Math.sin(theta) * team.orbitRadius;
  const y = Math.sin(theta * 0.7 + team.orbitPhase) * 2.8 * team.orbitInclination;
  return new THREE.Vector3(x, y, z);
};

// --- ENHANCED: Colorful Space Dust ---
const StarfieldDust = ({ qualityMode }: { qualityMode: QualityMode }) => {
  const count = qualityMode === 'cinematic' ? 4000 : 1500;
  const matRef = useRef<THREE.PointsMaterial>(null);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const colorChoices = [
      new THREE.Color('#8db0ff'), // Blue
      new THREE.Color('#ff8ded'), // Pink
      new THREE.Color('#ffffff'), // White
      new THREE.Color('#a38dff')  // Purple
    ];

    for (let i = 0; i < count; i += 1) {
      const radius = 60 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.cos(phi) * 0.6;
      pos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const c = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      col[i * 3 + 0] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (matRef.current) {
      matRef.current.opacity = 0.3 + Math.sin(t * 0.5) * 0.1;
    }
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} itemSize={3} count={count} />
        <bufferAttribute attach="attributes-color" array={colors} itemSize={3} count={count} />
      </bufferGeometry>
      <pointsMaterial 
        ref={matRef} 
        size={2.5} 
        sizeAttenuation 
        map={getGlowSprite()}
        transparent 
        opacity={0.3} 
        depthWrite={false}
        vertexColors
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// --- ENHANCED: Rich, gaseous colorful nebula background ---
const NebulaShell = ({ qualityMode }: { qualityMode: QualityMode }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[450, 64, 64]} />
      <shaderMaterial
        ref={shaderRef}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uStrength: { value: qualityMode === 'cinematic' ? 1.2 : 0.8 },
        }}
        vertexShader={`
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vPos;
          uniform float uTime;
          uniform float uStrength;

          // Simplex noise function
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
          vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

          float snoise(vec3 v) { 
            const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
            const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy) );
            vec3 x0 = v - i + dot(i, C.xxx) ;
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i); 
            vec4 p = permute( permute( permute( 
                      i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
            vec4 j = p - 49.0 * floor(p * (1.0 / 49.0));
            vec4 x_ = floor(j * (1.0 / 7.0));
            vec4 y_ = floor(j - 7.0 * x_ );
            vec4 x = x_ * (1.0 / 7.0);
            vec4 y = y_ * (1.0 / 7.0);
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4( x.xy, y.xy );
            vec4 b1 = vec4( x.zw, y.zw );
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
          }

          void main() {
            vec3 p = normalize(vPos) * 3.0;
            
            // Layered noise for clouds
            float n1 = snoise(p + uTime);
            float n2 = snoise(p * 2.0 - uTime * 1.5);
            float n3 = snoise(p * 4.0 + uTime * 2.0);
            
            float cloud = n1 * 0.5 + n2 * 0.25 + n3 * 0.125;
            cloud = smoothstep(0.0, 1.0, cloud + 0.3); // increase density

            // Rich nebula colors
            vec3 colorDeep = vec3(0.02, 0.01, 0.08); // Dark space
            vec3 colorBlue = vec3(0.1, 0.2, 0.5);   // Cyan/Blue
            vec3 colorPink = vec3(0.4, 0.05, 0.3);  // Deep Pink
            vec3 colorHighlight = vec3(0.8, 0.4, 0.8); // Bright pink/purple

            vec3 finalColor = mix(colorDeep, colorBlue, smoothstep(0.1, 0.6, cloud));
            finalColor = mix(finalColor, colorPink, smoothstep(0.4, 0.8, cloud));
            finalColor = mix(finalColor, colorHighlight, smoothstep(0.7, 1.0, cloud));

            gl_FragColor = vec4(finalColor * uStrength, cloud * 0.6);
          }
        `}
      />
    </mesh>
  );
};

// --- NEW: Asteroid Belt ---
const AsteroidBelt = ({ count = 400 }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 25 + Math.random() * 15; 
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 4;
      
      const scale = 0.1 + Math.random() * 0.4;
      const speed = 0.02 + Math.random() * 0.03;
      
      temp.push({ x, y, z, scale, speed, angle, radius });
    }
    return temp;
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    particles.forEach((particle, i) => {
      const currentAngle = particle.angle + t * particle.speed;
      dummy.position.set(
        Math.cos(currentAngle) * particle.radius,
        particle.y + Math.sin(t * 2 + i) * 0.5,
        Math.sin(currentAngle) * particle.radius
      );
      dummy.rotation.set(t * particle.speed, t * particle.speed * 1.5, 0);
      dummy.scale.setScalar(particle.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#4a4f5c" roughness={0.9} metalness={0.1} />
    </instancedMesh>
  );
};

// --- ENHANCED: Multiple Live Comets ---
const LiveComets = ({ count = 4 }: { count?: number }) => {
  const comets = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      speed: 0.1 + Math.random() * 0.15,
      offsetY: (Math.random() - 0.5) * 40,
      offsetZ: (Math.random() - 0.5) * 40,
      angle: Math.random() * Math.PI,
      color: Math.random() > 0.5 ? '#d9ebff' : '#ffd9eb'
    }));
  }, [count]);

  return (
    <group>
      {comets.map((c, i) => (
        <Comet key={i} {...c} />
      ))}
    </group>
  );
};

const Comet = ({ speed, offsetY, offsetZ, angle, color }: any) => {
  const cometRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;
    const cycle = (t % 1.0) * 2 - 1; 
    
    const x = cycle * 150 * Math.cos(angle);
    const z = offsetZ + cycle * 150 * Math.sin(angle);
    const y = offsetY + Math.sin(t * 10) * 2;

    if (cometRef.current) cometRef.current.position.set(x, y, z);
    if (trailRef.current) {
      trailRef.current.position.set(x - Math.cos(angle)*4, y, z - Math.sin(angle)*4);
      trailRef.current.lookAt(x, y, z);
    }
  });

  return (
    <group>
      <mesh ref={cometRef}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      <mesh ref={trailRef}>
        <coneGeometry args={[1.5, 8, 12]} /> 
        <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} map={getGlowSprite()} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

const CentralStar = ({ leader, dna, leaderTransitionValue = 0 }: { leader: GalaxyTeam; dna: PlanetDNA; leaderTransitionValue?: number; }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const flareRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const starRadius = 2.8 + leader.normalizedInfluence * 1.5;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = t;
      materialRef.current.uniforms.uPower.value = 1.2 + leader.normalizedInfluence * 0.9 + leaderTransitionValue * 0.65;
    }
    if (glowRef.current) {
      const pulse = 1 + Math.sin(t * 1.6) * (0.02 + leaderTransitionValue * 0.03);
      glowRef.current.scale.setScalar((2.4 + leader.normalizedInfluence * 1.2) * pulse);
    }
    if (coronaRef.current) {
      const coronaPulse = 1 + Math.sin(t * 0.9) * 0.04 + Math.sin(t * 2.3) * 0.02;
      coronaRef.current.scale.setScalar(coronaPulse);
      coronaRef.current.rotation.z = t * 0.05;
    }
    if (flareRef.current) {
      const flarePulse = 1 + Math.sin(t * 1.1 + 0.5) * 0.06;
      flareRef.current.scale.setScalar(flarePulse);
      flareRef.current.rotation.y = t * 0.03;
      flareRef.current.rotation.x = Math.sin(t * 0.4) * 0.15;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[starRadius, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          transparent
          uniforms={{
            uTime: { value: 0 },
            uColorA: { value: hexToColor('#ffb36a') },
            uColorB: { value: hexToColor(dna.palette.emissive) },
            uPower: { value: 1.2 },
          }}
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vWorld;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vec4 worldPos = modelMatrix * vec4(position, 1.0);
              vWorld = worldPos.xyz;
              gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
          `}
          fragmentShader={`
            varying vec3 vNormal;
            varying vec3 vWorld;
            uniform float uTime;
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform float uPower;

            float noise(vec3 p) {
              return sin(p.x * 1.3) * sin(p.y * 1.7) * sin(p.z * 1.1);
            }

            void main() {
              float plasma = 0.5 + 0.5 * noise(vWorld * 0.9 + vec3(uTime * 0.8, -uTime * 0.6, uTime * 0.4));
              float plasma2 = 0.5 + 0.5 * noise(vWorld * 1.6 + vec3(-uTime * 0.4, uTime * 0.9, uTime * 0.3));
              float combined = plasma * 0.65 + plasma2 * 0.35;
              float rim = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
              vec3 color = mix(uColorA, uColorB, combined);
              color += vec3(1.0, 0.5, 0.2) * rim * 0.4 * uPower;
              color += vec3(1.0, 0.85, 0.6) * pow(rim, 4.0) * 0.3;
              gl_FragColor = vec4(color * (1.05 + combined * 0.45), 1.0);
            }
          `}
        />
      </mesh>

      <mesh ref={glowRef}>
        <sphereGeometry args={[starRadius * 1.25, 32, 32]} />
        <meshBasicMaterial color={dna.palette.emissive} transparent opacity={0.22} depthWrite={false} />
      </mesh>

      <mesh ref={coronaRef}>
        <sphereGeometry args={[starRadius * 2.2, 32, 32]} />
        <meshBasicMaterial color="#ffcc88" transparent opacity={0.08 + leaderTransitionValue * 0.04} depthWrite={false} />
      </mesh>

      <mesh ref={flareRef}>
        <sphereGeometry args={[starRadius * 3.0, 24, 24]} />
        <meshBasicMaterial color="#ffa555" transparent opacity={0.035 + leaderTransitionValue * 0.025} depthWrite={false} />
      </mesh>

      <GravitationalShimmer radius={starRadius * 2.5} intensity={0.6 + leaderTransitionValue * 0.4} />

      <Billboard position={[0, starRadius * 2.0, 0]}>
        <Text
          fontSize={1.4}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.06}
          outlineColor="#000000"
        >
          {leader.name.toUpperCase()}
        </Text>
      </Billboard>
    </group>
  );
};

const GravitationalShimmer = ({ radius, intensity }: { radius: number; intensity: number }) => {
  const count = 120;
  const matRef = useRef<THREE.PointsMaterial>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.8 + Math.random() * 0.6);
      data[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      data[i * 3 + 1] = r * Math.cos(phi) * 0.4;
      data[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return data;
  }, [radius]);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.12;
      pointsRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.08) * 0.1;
    }
    if (matRef.current) {
      matRef.current.opacity = 0.18 * intensity + Math.sin(clock.getElapsedTime() * 2.5) * 0.04;
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} itemSize={3} count={count} />
      </bufferGeometry>
      <pointsMaterial 
        ref={matRef} 
        color="#ffd699" 
        size={0.8} 
        sizeAttenuation 
        map={getGlowSprite()}
        transparent 
        opacity={0.2} 
        depthWrite={false} 
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const Ring = ({ radius, color, tilt }: { radius: number; color: string; tilt?: number }) => {
  return (
    <mesh rotation={[Math.PI / 2.2 + (tilt ?? 0), 0, 0]}>
      <ringGeometry args={[radius * 1.32, radius * 1.88, 96]} />
      <meshStandardMaterial 
        color={color} 
        transparent 
        opacity={0.45} 
        roughness={0.7} 
        metalness={0.1} 
        side={THREE.DoubleSide} 
        map={getGlowSprite()} 
      />
    </mesh>
  );
};

const PlanetNode = ({
  team,
  leader,
  dna,
  isSelected,
  isPreviousLeader,
  transitionValue,
  pulseValue,
  qualityMode,
  onSelectTeam,
}: PlanetNodeProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = React.useState(false);

  const scaleTarget = 0.7 + team.normalizedInfluence * 2.8;
  const { planetScale } = useSpring({
    planetScale: scaleTarget * (isSelected ? 1.18 : hovered ? 1.08 : 1) * (1 + pulseValue * 0.22 + (isPreviousLeader ? transitionValue * 0.08 : 0)),
    config: { mass: 1.4, tension: 180, friction: 24 },
  });

  const baseColor = useMemo(() => hexToColor(dna.palette.base), [dna.palette.base]);
  const emissiveColor = useMemo(() => hexToColor(dna.palette.emissive), [dna.palette.emissive]);

  const moonCount = Math.round(
    dna.moonRange[0] + (dna.moonRange[1] - dna.moonRange[0]) * Math.min(1, team.normalizedInfluence + 0.15),
  );

  const moons = useMemo(
    () =>
      Array.from({ length: moonCount }).map((_, idx) => ({
        radius: 0.14 + idx * 0.05,
        orbitRadius: 2 + idx * 0.55,
        speed: 0.25 - idx * 0.02 + team.normalizedInfluence * 0.08,
        phase: idx * 1.8 + (dna.seed % 10),
      })),
    [moonCount, team.normalizedInfluence, dna.seed],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const orbitalPosition = getOrbitalPosition(team, t);
    groupRef.current.position.lerp(orbitalPosition, 0.07);
    groupRef.current.rotation.y += 0.0012 + dna.rotationSpeedBase * 0.003;
    groupRef.current.rotation.z = dna.axialTilt;

    if (cloudRef.current) {
      cloudRef.current.rotation.y += 0.0016 + dna.cloudStrength * 0.002;
    }
  });

  const handleSelect = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelectTeam(team.id);
  };

  const rivalLightingBoost = Math.max(0, 1 - team.scoreGapToLeader / Math.max(leader.currentPoints * 0.35, 1));
  const showRing = dna.ringProbability > 0.38 && (team.normalizedInfluence > 0.3 || dna.ringProbability > 0.7);
  const atmosphereOpacity = 0.10 + team.normalizedInfluence * 0.20 + (hovered ? 0.08 : 0) + pulseValue * 0.12;
  const atmosphereScale = 1.10 + team.normalizedInfluence * 0.18;
  const cloudOpacity = 0.10 + dna.cloudStrength * 0.22 + team.normalizedInfluence * 0.08;
  const surfaceTexture = useMemo(() => generatePlanetTexture(dna), [dna]);

  return (
    <a.group
      ref={groupRef}
      scale={planetScale.to((s) => [s, s, s])}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={handleSelect}
    >
      <mesh castShadow receiveShadow>
        {/* ⭐ Increased polygons for perfectly round cinematic spheres */}
        <sphereGeometry args={[1, qualityMode === 'cinematic' ? 128 : 34, qualityMode === 'cinematic' ? 128 : 34]} />
        <meshStandardMaterial
          color={baseColor}
          map={surfaceTexture}
          roughnessMap={surfaceTexture}
          bumpMap={surfaceTexture} // ⭐ ADDED bump mapping for physical texture depth
          bumpScale={0.06}
          roughness={Math.max(0.12, dna.roughnessBase - team.normalizedInfluence * 0.18)}
          metalness={0.25 + rivalLightingBoost * 0.18} // ⭐ Enhanced metalness for better HDRI reflections
          emissive={emissiveColor}
          emissiveIntensity={
            0.05 +
            team.normalizedInfluence * 0.35 +
            (hovered ? 0.18 : 0) +
            pulseValue * 0.3 +
            (isPreviousLeader ? transitionValue * 0.24 : 0)
          }
        />
      </mesh>

      <mesh ref={cloudRef} scale={1.03 + dna.cloudStrength * 0.12}>
        <sphereGeometry args={[1, 28, 28]} />
        <meshStandardMaterial
          color={dna.palette.cloud}
          transparent
          opacity={cloudOpacity}
          roughness={0.92}
          metalness={0}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={atmosphereScale}>
        <sphereGeometry args={[1, 28, 28]} />
        <meshBasicMaterial
          color={dna.palette.atmosphere}
          transparent
          opacity={atmosphereOpacity}
          depthWrite={false}
        />
      </mesh>

      {showRing ? (
        <Ring radius={1 + team.normalizedInfluence * 0.3} color={dna.palette.secondary} tilt={dna.axialTilt * 0.3} />
      ) : null}

      {moons.map((moon, idx) => (
        <Moon key={`${team.id}-moon-${idx}`} moon={moon} />
      ))}

      {pulseValue > 0.05 ? <ScoreRipple intensity={pulseValue} color={dna.palette.emissive} /> : null}

      <Billboard position={[0, 1.5 + team.normalizedInfluence * 0.5, 0]}>
        <Text
          fontSize={hovered ? 0.8 : 0.6}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#000000"
          fillOpacity={hovered || isSelected ? 1 : 0.7}
          outlineOpacity={hovered || isSelected ? 1 : 0.7}
        >
          {team.name.toUpperCase()}
        </Text>
      </Billboard>
    </a.group>
  );
};

const ScoreRipple = ({ intensity, color }: { intensity: number; color: string }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const startTimeRef = useRef<number | null>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    if (startTimeRef.current === null) startTimeRef.current = clock.getElapsedTime();
    const elapsed = clock.getElapsedTime() - startTimeRef.current;
    const expandProgress = Math.min(1, elapsed * 0.8);
    const scale = 1.5 + expandProgress * 3.0 * intensity;
    ringRef.current.scale.setScalar(scale);
    (ringRef.current.material as THREE.Material).opacity = Math.max(0, 0.25 * intensity * (1 - expandProgress));
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1.1, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

const Moon = ({
  moon,
}: {
  moon: {
    radius: number;
    orbitRadius: number;
    speed: number;
    phase: number;
  };
}) => {
  const moonRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!moonRef.current) return;
    const t = clock.getElapsedTime();
    const theta = moon.phase + t * moon.speed;
    moonRef.current.position.set(Math.cos(theta) * moon.orbitRadius, Math.sin(theta * 0.7) * 0.26, Math.sin(theta) * moon.orbitRadius);
  });
  return (
    <mesh ref={moonRef}>
      <sphereGeometry args={[moon.radius, 16, 16]} />
      <meshStandardMaterial color="#a4a8b5" roughness={0.9} metalness={0.02} />
    </mesh>
  );
};

const CameraRig = ({
  selectedTeamId,
  teams,
  onResetViewKey,
  leaderTransitionValue = 0,
  focusTarget,
  isFreeView,
}: {
  selectedTeamId: string | null;
  teams: GalaxyTeam[];
  onResetViewKey?: number;
  leaderTransitionValue?: number;
  focusTarget: THREE.Vector3;
  isFreeView?: boolean;
}) => {
  const controlsRef = useRef<any>(null);
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  const desiredCameraPosRef = useRef(new THREE.Vector3(0, 18, 52));
  const { camera } = useThree();
  const leaderAckRef = useRef(false);

  useEffect(() => {
    if (!selectedTeamId && !isFreeView) {
      targetRef.current.set(0, 0, 0);
      desiredCameraPosRef.current.set(0, 18, 52);
    }
  }, [selectedTeamId, teams, isFreeView]);

  useEffect(() => {
    if (onResetViewKey === undefined) return;
    targetRef.current.set(0, 0, 0);
    desiredCameraPosRef.current.set(0, 18, 52);
  }, [onResetViewKey]);

  useEffect(() => {
    if (leaderTransitionValue > 0.8 && !selectedTeamId) {
      leaderAckRef.current = true;
    }
  }, [leaderTransitionValue, selectedTeamId]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (isFreeView) {
      if (controlsRef.current) {
        desiredCameraPosRef.current.copy(camera.position);
        targetRef.current.copy(controlsRef.current.target);
        controlsRef.current.update();
        focusTarget.copy(controlsRef.current.target);
      }
      return; 
    }

    if (selectedTeamId) {
      const selected = teams.find((team) => team.id === selectedTeamId);
      if (selected) {
        const dynamicFocus = getOrbitalPosition(selected, t);
        targetRef.current.lerp(dynamicFocus, 0.12);
        
        const sizePullback = selected.normalizedInfluence * 12;
        const rankPullback = selected.rank === 1 ? 22 : 4;
        const totalPullback = rankPullback + sizePullback;

        _tmpVec.copy(dynamicFocus).add(focusOffset);
        _tmpVec.y += totalPullback * 0.4;
        _tmpVec.z += totalPullback;
        
        desiredCameraPosRef.current.lerp(_tmpVec, 0.11);
      }
    } else if (leaderAckRef.current) {
      targetRef.current.lerp(new THREE.Vector3(0, 0, 0), 0.06);
      desiredCameraPosRef.current.lerp(new THREE.Vector3(0, 14, 38), 0.04);
      if (targetRef.current.lengthSq() < 0.5) {
        leaderAckRef.current = false;
      }
    } else {
      const driftX = Math.sin(t * 0.08) * 5;
      const driftY = 16 + Math.sin(t * 0.11) * 1.4;
      const driftZ = 46 + Math.cos(t * 0.07) * 6;
      desiredCameraPosRef.current.lerp(new THREE.Vector3(driftX, driftY, driftZ), 0.03);
      targetRef.current.lerp(new THREE.Vector3(0, Math.sin(t * 0.12) * 0.7, 0), 0.04);
    }

    camera.position.lerp(desiredCameraPosRef.current, 0.055);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetRef.current, 0.08);
      controlsRef.current.update();
      focusTarget.copy(controlsRef.current.target);
    } else {
      camera.lookAt(targetRef.current);
      focusTarget.copy(targetRef.current);
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={44} near={0.1} far={900} position={[0, 18, 52]} />
      <OrbitControls
        ref={controlsRef}
        enablePan={isFreeView} 
        minDistance={8}
        maxDistance={120}
        maxPolarAngle={Math.PI * 0.86}
        minPolarAngle={Math.PI * 0.16}
        dampingFactor={0.08}
        enableDamping
      />
    </>
  );
};


const GalaxyScene = ({
  teams,
  dnaByTeam,
  selectedTeamId,
  onSelectTeam,
  qualityMode,
  onResetViewKey,
  previousLeaderId,
  leaderTransitionValue = 0,
  pulseByTeamId = {},
  isFreeView,
}: GalaxyCanvasProps) => {
  const leader = teams[0];
  const focusTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  if (!leader) return null;

  return (
    <>
      <color attach="background" args={['#010204']} />
      <fog attach="fog" args={['#010204', 90, 380]} />

      <CameraRig
        teams={teams}
        selectedTeamId={selectedTeamId}
        onResetViewKey={onResetViewKey}
        leaderTransitionValue={leaderTransitionValue}
        focusTarget={focusTarget}
        isFreeView={isFreeView}
      />

      {/* ⭐ ADDED: Environment mapping for cinematic planet reflections */}
      {qualityMode === 'cinematic' && <Environment preset="night" environmentIntensity={0.25} />}

      <ambientLight intensity={0.4} color="#6c8cbf" />
      {/* ⭐ ADDED: castShadow and higher resolution shadow maps */}
      <pointLight 
        position={[0, 0, 0]} 
        intensity={60 + leader.normalizedInfluence * 15} 
        color="#ffd6a6" 
        decay={1.8} 
        castShadow 
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[20, 30, 20]} intensity={1.8} color="#e6efff" castShadow />
      <directionalLight position={[-20, -10, -20]} intensity={0.5} color="#c232ff" />

      <NebulaShell qualityMode={qualityMode} />
      <Stars radius={300} depth={150} count={qualityMode === 'cinematic' ? 5000 : 2000} factor={6} saturation={0.8} fade speed={0.6} />
      <StarfieldDust qualityMode={qualityMode} />
      
      <LiveComets count={qualityMode === 'cinematic' ? 5 : 2} />
      {qualityMode === 'cinematic' && <AsteroidBelt count={350} />}

      <CentralStar leader={leader} dna={dnaByTeam[leader.id]} leaderTransitionValue={leaderTransitionValue} />

      {teams.slice(1).map((team) => (
        <PlanetNode
          key={team.id}
          team={team}
          leader={leader}
          dna={dnaByTeam[team.id]}
          isSelected={selectedTeamId === team.id}
          isPreviousLeader={team.id === previousLeaderId}
          transitionValue={leaderTransitionValue}
          pulseValue={pulseByTeamId[team.id] ?? 0}
          qualityMode={qualityMode}
          onSelectTeam={onSelectTeam}
        />
      ))}

      {/* ⭐ ADDED: SSAO and increased multisampling for maximum fidelity */}
      <EffectComposer enableNormalPass={false} multisampling={qualityMode === 'cinematic' ? 8 : 0}>
        {qualityMode === 'cinematic' && (
          <SSAO radius={0.4} intensity={50} luminanceInfluence={0.4} color="black" />
        )}
        <DepthOfField 
          focusDistance={0.015} 
          focalLength={0.06} 
          bokehScale={qualityMode === 'cinematic' ? 3.5 : 2} 
          target={focusTarget}
        />
        <Bloom
          intensity={qualityMode === 'cinematic' ? 2.0 : 1.2}
          luminanceThreshold={0.12}
          luminanceSmoothing={0.8}
          mipmapBlur
        />
        {/* @ts-ignore */}
        <ChromaticAberration offset={new THREE.Vector2(0.001, 0.001)} />
        <Noise opacity={0.025} />
        <Vignette eskil={false} offset={0.1} darkness={0.85} />
      </EffectComposer>
    </>
  );
};

export function GalaxyCanvas(props: GalaxyCanvasProps) {
  return (
    <Canvas 
      shadows="soft" // ⭐ ADDED: Soft shadows
      dpr={Math.max(window.devicePixelRatio, 2)} // ⭐ ADDED: Forced native resolution
      gl={{ 
        antialias: true, 
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping, // ⭐ ADDED: Hollywood color grading
        toneMappingExposure: 1.2,
        useLegacyLights: false
      }}
    >
      <GalaxyScene {...props} />
    </Canvas>
  );
}