import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Billboard, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, DepthOfField, ChromaticAberration, Noise } from '@react-three/postprocessing';
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

// Shared orbital position function used by both planets and camera
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

const StarfieldDust = ({ qualityMode }: { qualityMode: QualityMode }) => {
  const count = qualityMode === 'cinematic' ? 2600 : 1200;
  const matRef = useRef<THREE.PointsMaterial>(null);

  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 120 + Math.random() * 350;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      data[i * 3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
      data[i * 3 + 1] = radius * Math.cos(phi) * 0.55;
      data[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return data;
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (matRef.current) {
      matRef.current.opacity = 0.25 + Math.sin(t * 0.35) * 0.05;
    }
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} itemSize={3} count={count} />
      </bufferGeometry>
      <pointsMaterial 
        ref={matRef} 
        color="#8db0ff" 
        size={2.2} 
        sizeAttenuation 
        map={getGlowSprite()}
        transparent 
        opacity={0.26} 
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const NebulaShell = ({ qualityMode }: { qualityMode: QualityMode }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[280, 48, 48]} />
      <shaderMaterial
        ref={shaderRef}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uStrength: { value: qualityMode === 'cinematic' ? 1 : 0.65 },
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

          float hash(vec3 p) {
            p = fract(p * 0.3183099 + vec3(0.1, 0.3, 0.7));
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
          }

          void main() {
            vec3 p = normalize(vPos) * 2.2;
            float n = hash(floor(p * 40.0 + uTime * 0.07));
            float n2 = hash(floor(p.zyx * 22.0 - uTime * 0.04));
            float fog = smoothstep(0.18, 0.95, n * 0.6 + n2 * 0.4) * 0.22 * uStrength;
            vec3 color = mix(vec3(0.03, 0.05, 0.12), vec3(0.16, 0.19, 0.36), fog);
            gl_FragColor = vec4(color, fog);
          }
        `}
      />
    </mesh>
  );
};

// The leader becomes a radiant stellar body with corona, flare shells, and warm light cast
const CentralStar = ({
  leader,
  dna,
  leaderTransitionValue = 0,
}: {
  leader: GalaxyTeam;
  dna: PlanetDNA;
  leaderTransitionValue?: number;
}) => {
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
      {/* Core stellar body with plasma shader */}
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

      {/* Inner glow shell */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[starRadius * 1.25, 32, 32]} />
        <meshBasicMaterial color={dna.palette.emissive} transparent opacity={0.22} depthWrite={false} />
      </mesh>

      {/* Corona shell — larger, fainter, simulating solar atmosphere */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[starRadius * 2.2, 32, 32]} />
        <meshBasicMaterial color="#ffcc88" transparent opacity={0.08 + leaderTransitionValue * 0.04} depthWrite={false} />
      </mesh>

      {/* Flare shell — asymmetric glow simulating solar flares */}
      <mesh ref={flareRef}>
        <sphereGeometry args={[starRadius * 3.0, 24, 24]} />
        <meshBasicMaterial color="#ffa555" transparent opacity={0.035 + leaderTransitionValue * 0.025} depthWrite={false} />
      </mesh>

      {/* Gravitational shimmer particles around the leader */}
      <GravitationalShimmer radius={starRadius * 2.5} intensity={0.6 + leaderTransitionValue * 0.4} />

      {/* Leader Label */}
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

// Shimmer particles that orbit close to the star, giving gravitational field feel
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
        map={getGlowSprite()} // Gives the rings a softer, dusty look
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

  // Rule 2: planet radius scales with normalizedInfluence (wider range for dramatic effect)
  const scaleTarget = 0.7 + team.normalizedInfluence * 2.8;
  const { planetScale } = useSpring({
    planetScale: scaleTarget * (isSelected ? 1.18 : hovered ? 1.08 : 1) * (1 + pulseValue * 0.22 + (isPreviousLeader ? transitionValue * 0.08 : 0)),
    config: { mass: 1.4, tension: 180, friction: 24 },
  });

  const baseColor = useMemo(() => hexToColor(dna.palette.base), [dna.palette.base]);
  const emissiveColor = useMemo(() => hexToColor(dna.palette.emissive), [dna.palette.emissive]);

  // Moon count scales with currentPoints influence
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

  // Rule 3: planets orbit around center using smooth lerp (no teleporting)
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

  // Near-leader rivals get stronger specular highlights from the leader star
  const rivalLightingBoost = Math.max(0, 1 - team.scoreGapToLeader / Math.max(leader.currentPoints * 0.35, 1));

  // Ring visibility: rings appear based on DNA probability + influence growth
  const showRing = dna.ringProbability > 0.38 && (team.normalizedInfluence > 0.3 || dna.ringProbability > 0.7);

  // Atmospheric depth deepens with influence
  const atmosphereOpacity = 0.10 + team.normalizedInfluence * 0.20 + (hovered ? 0.08 : 0) + pulseValue * 0.12;
  const atmosphereScale = 1.10 + team.normalizedInfluence * 0.18;

  // Cloud opacity intensifies with influence
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
      {/* Core planet surface */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1, qualityMode === 'cinematic' ? 52 : 34, qualityMode === 'cinematic' ? 52 : 34]} />
        <meshStandardMaterial
          color={baseColor}
          map={surfaceTexture}
          roughnessMap={surfaceTexture} // Reuse as roughness map
          roughness={Math.max(0.12, dna.roughnessBase - team.normalizedInfluence * 0.18)}
          metalness={0.12 + rivalLightingBoost * 0.18}
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

      {/* Cloud layer */}
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

      {/* Atmosphere shell — depth scales with influence */}
      <mesh scale={atmosphereScale}>
        <sphereGeometry args={[1, 28, 28]} />
        <meshBasicMaterial
          color={dna.palette.atmosphere}
          transparent
          opacity={atmosphereOpacity}
          depthWrite={false}
        />
      </mesh>

      {/* Rings — prominence grows with influence */}
      {showRing ? (
        <Ring radius={1 + team.normalizedInfluence * 0.3} color={dna.palette.secondary} tilt={dna.axialTilt * 0.3} />
      ) : null}

      {/* Moons */}
      {moons.map((moon, idx) => (
        <Moon key={`${team.id}-moon-${idx}`} moon={moon} />
      ))}

      {/* Score-change energy ripple: visible when pulseValue > 0 */}
      {pulseValue > 0.05 ? <ScoreRipple intensity={pulseValue} color={dna.palette.emissive} /> : null}

      {/* Planet Label */}
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

// Rule 5: Visible energy ripple when a team gains points
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

// Rule 4: Camera acknowledges leader changes by auto-recentering
const CameraRig = ({
  selectedTeamId,
  teams,
  onResetViewKey,
  leaderTransitionValue = 0,
  focusTarget,
}: {
  selectedTeamId: string | null;
  teams: GalaxyTeam[];
  onResetViewKey?: number;
  leaderTransitionValue?: number;
  focusTarget: THREE.Vector3;
}) => {
  const controlsRef = useRef<any>(null);
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  const desiredCameraPosRef = useRef(new THREE.Vector3(0, 18, 52));
  const { camera } = useThree();
  const leaderAckRef = useRef(false);

  useEffect(() => {
    if (!selectedTeamId) {
      targetRef.current.set(0, 0, 0);
      desiredCameraPosRef.current.set(0, 18, 52);
    }
  }, [selectedTeamId, teams]);

  useEffect(() => {
    if (onResetViewKey === undefined) return;
    targetRef.current.set(0, 0, 0);
    desiredCameraPosRef.current.set(0, 18, 52);
  }, [onResetViewKey]);

  // When a leader transition starts, briefly acknowledge the new center
  useEffect(() => {
    if (leaderTransitionValue > 0.8 && !selectedTeamId) {
      leaderAckRef.current = true;
    }
  }, [leaderTransitionValue, selectedTeamId]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (selectedTeamId) {
      const selected = teams.find((team) => team.id === selectedTeamId);
      if (selected) {
        const dynamicFocus = getOrbitalPosition(selected, t);
        targetRef.current.lerp(dynamicFocus, 0.12);
        
        // Base pullback plus extra distance based on how large the planet is (normalizedInfluence)
        // Leader (rank 1) gets a much larger pullback because the central star is huge
        const sizePullback = selected.normalizedInfluence * 12;
        const rankPullback = selected.rank === 1 ? 22 : 4;
        const totalPullback = rankPullback + sizePullback;

        _tmpVec.copy(dynamicFocus).add(focusOffset);
        // Adjust the Y and Z offsets proportionally to the pullback
        _tmpVec.y += totalPullback * 0.4;
        _tmpVec.z += totalPullback;
        
        desiredCameraPosRef.current.lerp(_tmpVec, 0.11);
      }
    } else if (leaderAckRef.current) {
      // Graceful recentering on new leader during transition
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
        enablePan={false}
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

const CometStreak = ({ qualityMode }: { qualityMode: QualityMode }) => {
  const cometRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const speed = qualityMode === 'cinematic' ? 0.17 : 0.12;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;
    const cycle = (t % 1.0) * 2 - 1;
    const x = cycle * 100;
    const y = 18 + Math.sin(t * 8) * 6;
    const z = -45 + Math.cos(t * 4) * 15;
    if (cometRef.current) {
      cometRef.current.position.set(x, y, z);
    }
    if (trailRef.current) {
      trailRef.current.position.set(x - 3, y, z);
    }
  });

  return (
    <group>
      <mesh ref={cometRef}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshBasicMaterial color="#d9ebff" transparent opacity={0.8} />
      </mesh>
      <mesh ref={trailRef}>
        <sphereGeometry args={[1.5, 12, 12]} />
        <meshBasicMaterial color="#8ab6ff" transparent opacity={0.3} depthWrite={false} map={getGlowSprite()} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
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
}: GalaxyCanvasProps) => {
  const leader = teams[0];
  const focusTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  if (!leader) return null;

  return (
    <>
      <color attach="background" args={['#03050a']} />
      <fog attach="fog" args={['#070a15', 90, 320]} />

      <CameraRig
        teams={teams}
        selectedTeamId={selectedTeamId}
        onResetViewKey={onResetViewKey}
        leaderTransitionValue={leaderTransitionValue}
        focusTarget={focusTarget}
      />

      <ambientLight intensity={0.24} color="#94a7c8" />
      {/* The central star casts warm light onto nearby planets */}
      <pointLight position={[0, 0, 0]} intensity={42 + leader.normalizedInfluence * 15} color="#ffd6a6" decay={1.6} />
      <directionalLight position={[14, 12, 10]} intensity={1.4} color="#d6e2ff" />

      <NebulaShell qualityMode={qualityMode} />
      <Stars radius={320} depth={180} count={qualityMode === 'cinematic' ? 1400 : 750} factor={4} saturation={0} fade speed={0.4} />
      <StarfieldDust qualityMode={qualityMode} />
      <CometStreak qualityMode={qualityMode} />

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

      <EffectComposer enableNormalPass={false} multisampling={qualityMode === 'cinematic' ? 4 : 0}>
        <DepthOfField 
          focusDistance={0.015} 
          focalLength={0.06} 
          bokehScale={qualityMode === 'cinematic' ? 3.5 : 2} 
          target={focusTarget}
        />
        <Bloom
          intensity={qualityMode === 'cinematic' ? 1.5 : 0.8}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.75}
          mipmapBlur
        />
        {/* @ts-ignore - The react-three/postprocessing types are outdated for ChromaticAberration in this version */}
        <ChromaticAberration offset={new THREE.Vector2(0.0006, 0.0006)} />
        <Noise opacity={0.018} />
        <Vignette eskil={false} offset={0.18} darkness={0.7} />
      </EffectComposer>
    </>
  );
};

export function GalaxyCanvas(props: GalaxyCanvasProps) {
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <GalaxyScene {...props} />
    </Canvas>
  );
}
