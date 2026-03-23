import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Html, OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { a, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import { GalaxyTeam, PlanetDNA } from './galaxyTypes';
import { generatePlanetTexture } from './textureGenerator';

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
  dna: PlanetDNA;
  isSelected: boolean;
  isPreviousLeader: boolean;
  transitionValue: number;
  pulseValue: number;
  qualityMode: QualityMode;
  onSelectTeam: (teamId: string) => void;
};

const hexToColor = (value: string) => new THREE.Color(value);
const topViewTarget = new THREE.Vector3(0, 0, 0);
const tmpVec = new THREE.Vector3();

const setOrbitalPosition = (team: GalaxyTeam, elapsedTime: number, target: THREE.Vector3) => {
  if (team.rank === 1 || team.orbitRadius <= 0.0001) {
    return target.set(0, 0, 0);
  }

  const theta = team.orbitPhase + team.spiralOffset + elapsedTime * team.orbitSpeed;
  const breathing = Math.sin(theta * 1.8 + team.orbitPhase) * team.orbitEccentricity * 5.2;
  const radius = Math.max(8, team.orbitRadius + breathing);
  const x = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;
  const y = team.orbitHeight + Math.sin(theta * 2.0) * team.orbitInclination * 2.2;
  return target.set(x, y, z);
};

const OrbitRibbon = ({ team }: { team: GalaxyTeam }) => {
  const points = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const turns = 180;
    for (let i = 0; i <= turns; i += 1) {
      const theta = (i / turns) * Math.PI * 2;
      const breathing = Math.sin(theta * 1.8 + team.orbitPhase) * team.orbitEccentricity * 5.2;
      const radius = Math.max(8, team.orbitRadius + breathing);
      positions.push(
        new THREE.Vector3(
          Math.cos(theta + team.spiralOffset) * radius,
          team.orbitHeight,
          Math.sin(theta + team.spiralOffset) * radius,
        ),
      );
    }
    return positions;
  }, [team]);

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={team.isDwarfPlanet ? '#46506a' : '#65749b'} transparent opacity={team.isDwarfPlanet ? 0.18 : 0.26} />
    </line>
  );
};

const DeepSpaceBackdrop = ({ qualityMode }: { qualityMode: QualityMode }) => {
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load('/textures/8k_stars_milky_way.jpg');
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <mesh>
      <sphereGeometry args={[520, qualityMode === 'cinematic' ? 40 : 24, qualityMode === 'cinematic' ? 40 : 24]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
};

const Constellations = () => {
  const sets = useMemo(
    () => [
      // Orion (Hunter)
      [[-60, 40, -160], [-55, 25, -155], [-45, 42, -150]], // Shoulders
      [[-50, 28, -150], [-55, 25, -155], [-60, 22, -160]], // Belt
      [[-50, 28, -150], [-40, 5, -145]], // Right leg
      [[-60, 22, -160], [-65, 2, -165]], // Left leg
      // Ursa Major (Big Dipper)
      [[80, 50, -150], [70, 45, -145], [60, 40, -140], [55, 30, -135], [40, 28, -130], [35, 40, -135], [55, 30, -135]],
      // Cassiopeia (W shape)
      [[0, -20, -180], [10, -10, -170], [20, -25, -160], [30, -5, -150], [40, -30, -140]],
      // Cygnus (Swan / Cross)
      [[-80, -10, -140], [-60, -20, -150], [-40, -30, -160], [-20, -40, -170]], // Spine
      [[-70, -35, -150], [-60, -20, -150], [-50, 5, -150]], // Wings
      // Andromeda
      [[90, -20, -160], [100, -15, -155], [110, -25, -150], [115, -10, -145], [125, -5, -140]],
      // Leo
      [[20, 60, -140], [30, 65, -135], [40, 58, -130], [45, 45, -125], [35, 35, -120], [25, 40, -125], [20, 50, -130]],
      // Gemini
      [[-90, 40, -150], [-80, 35, -145], [-75, 20, -140], [-85, 10, -135], [-95, 25, -140]],
      // Aquarius
      [[0, 70, -180], [10, 65, -175], [15, 80, -170], [25, 75, -165]],
      // Hercules
      [[-10, -60, -160], [0, -50, -155], [10, -45, -150], [5, -35, -145], [-5, -40, -150]]
    ].map((set) => set.map(([x, y, z]) => new THREE.Vector3(x, y, z))),
    [],
  );

  return (
    <group>
      {sets.map((points, index) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <group key={`constellation-${index}`}>
            <line geometry={geometry}>
              <lineBasicMaterial color="#8ba2d8" transparent opacity={0.32} />
            </line>
            {points.map((point, pointIndex) => (
              <mesh key={`star-${index}-${pointIndex}`} position={point}>
                <sphereGeometry args={[0.42, 10, 10]} />
                <meshBasicMaterial color="#edf3ff" transparent opacity={0.95} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};



const SolarCore = ({ leader, dna, leaderTransitionValue = 0 }: { leader: GalaxyTeam; dna: PlanetDNA; leaderTransitionValue?: number }) => {
  // Reduced size so the #1 position planet is only slightly bigger than the others
  const sunSize = 1.5 + leader.sizeScale * 0.2;
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load('/textures/sun.jpg');
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[sunSize, 64, 64]} />
        <meshBasicMaterial map={texture} color="#ffddaa" />
      </mesh>
      <Billboard position={[0, sunSize * 1.8, 0]}>
        <Html center transform sprite distanceFactor={14}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: '0.24em',
              color: '#fff7e7',
              textTransform: 'uppercase',
              fontSize: '15px',
              textShadow: '0 2px 10px rgba(0,0,0,0.65)',
              whiteSpace: 'nowrap',
            }}
          >
            {leader.name}
          </div>
        </Html>
      </Billboard>
    </group>
  );
};

const Ring = ({ radius, color }: { radius: number; color: string }) => (
  <mesh rotation={[-Math.PI / 2.8, 0, 0]}>
    <ringGeometry args={[radius * 1.32, radius * 1.88, 96]} />
    <meshStandardMaterial color={color} transparent opacity={0.28} roughness={0.95} metalness={0.04} side={THREE.DoubleSide} />
  </mesh>
);

const Moon = ({ index, orbitRadius, speed }: { index: number; orbitRadius: number; speed: number }) => {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + index * 1.6;
    ref.current.position.set(Math.cos(t) * orbitRadius, 0.05 * Math.sin(t * 2.0), Math.sin(t) * orbitRadius);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.08 + index * 0.02, 12, 12]} />
      <meshStandardMaterial color="#9fa7ba" roughness={0.95} metalness={0.02} />
    </mesh>
  );
};

const PlanetNode = ({
  team,
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

  const texture = useMemo(() => generatePlanetTexture(dna), [dna]);
  const baseColor = useMemo(() => hexToColor(dna.palette.base), [dna.palette.base]);
  const labelOffset = 1.5 + team.sizeScale * 1.25;
  const shouldShowRing = !team.isDwarfPlanet && dna.ringProbability > 0.55;
  const moonCount = team.isDwarfPlanet ? 0 : Math.min(4, Math.max(0, Math.round((dna.moonRange[0] + dna.moonRange[1]) / 2 - 1)));

  const { planetScale } = useSpring({
    planetScale: team.sizeScale * (isSelected ? 1.2 : hovered ? 1.08 : 1) * (1 + pulseValue * 0.1 + (isPreviousLeader ? transitionValue * 0.06 : 0)),
    config: { mass: 1.1, tension: 170, friction: 22 },
  });

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const orbitalPosition = setOrbitalPosition(team, t, tmpVec);
    groupRef.current.position.lerp(orbitalPosition, 0.08);
    groupRef.current.rotation.y += 0.002 + dna.rotationSpeedBase * 0.002;
    groupRef.current.rotation.z = dna.axialTilt * 0.35;

    if (cloudRef.current) {
      cloudRef.current.rotation.y += 0.0015 + dna.cloudStrength * 0.0015;
    }
  });

  const handleSelect = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelectTeam(team.id);
  };

  return (
    <a.group
      ref={groupRef}
      scale={planetScale.to((s) => [s, s, s])}
      onClick={handleSelect}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1, qualityMode === 'cinematic' ? 48 : 24, qualityMode === 'cinematic' ? 48 : 24]} />
        <meshStandardMaterial
          color={baseColor}
          map={texture}
          roughnessMap={texture}
          bumpMap={texture}
          bumpScale={team.isDwarfPlanet ? 0.02 : 0.035}
          roughness={Math.min(0.95, 0.58 + dna.roughnessBase * 0.22)}
          metalness={0.03}
          emissive={hexToColor(dna.palette.base).multiplyScalar(0.08)}
          emissiveIntensity={team.isDwarfPlanet ? 0.015 : 0.02}
        />
      </mesh>

      {!team.isDwarfPlanet ? (
        <mesh ref={cloudRef} scale={1.015 + dna.cloudStrength * 0.04}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial color={dna.palette.cloud} transparent opacity={0.025 + dna.cloudStrength * 0.025} roughness={1} metalness={0} depthWrite={false} />
        </mesh>
      ) : null}

      {!team.isDwarfPlanet ? (
        <mesh scale={1.045 + dna.atmosphereDensityBase * 0.05}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial color={dna.palette.atmosphere} transparent opacity={0.02 + (isSelected ? 0.02 : 0)} depthWrite={false} />
        </mesh>
      ) : null}

      {shouldShowRing ? <Ring radius={1.04} color={dna.palette.secondary} /> : null}

      {Array.from({ length: moonCount }).map((_, index) => (
        <Moon key={`${team.id}-moon-${index}`} index={index} orbitRadius={1.8 + index * 0.42} speed={0.35 - index * 0.04} />
      ))}

      <Billboard position={[0, labelOffset, 0]}>
        <Html center transform sprite distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: isSelected ? '#ffffff' : 'rgba(235,241,255,0.82)',
              fontSize: hovered || isSelected ? '11px' : '9px',
              textShadow: '0 2px 10px rgba(0,0,0,0.85)',
              whiteSpace: 'nowrap',
            }}
          >
            {team.name}
          </div>
        </Html>
      </Billboard>
    </a.group>
  );
};

const CameraRig = ({
  teams,
  selectedTeamId,
  onResetViewKey,
  isFreeView,
}: {
  teams: GalaxyTeam[];
  selectedTeamId: string | null;
  onResetViewKey?: number;
  isFreeView?: boolean;
}) => {
  const controlsRef = useRef<any>(null);
  const desiredPosition = useRef(new THREE.Vector3(0, 90, 42));
  const desiredTarget = useRef(new THREE.Vector3(0, 0, 0));
  const { camera } = useThree();

  const computedOverview = useMemo(() => {
    const maxOrbit = teams.reduce((max, team) => Math.max(max, team.orbitRadius + team.sizeScale * 3), 26);
    return {
      position: new THREE.Vector3(0, Math.max(52, maxOrbit * 1.24), Math.max(26, maxOrbit * 0.28)),
      target: new THREE.Vector3(0, 0, 0),
      maxDistance: Math.max(120, maxOrbit * 2.7),
    };
  }, [teams]);

  useEffect(() => {
    desiredPosition.current.copy(computedOverview.position);
    desiredTarget.current.copy(computedOverview.target);
    if (controlsRef.current) {
      controlsRef.current.target.copy(computedOverview.target);
      controlsRef.current.update();
    }
  }, [computedOverview, onResetViewKey]);

  useFrame(({ clock }) => {
    if (isFreeView) {
      controlsRef.current?.update();
      return;
    }

    if (selectedTeamId) {
      const selected = teams.find((team) => team.id === selectedTeamId);
      if (selected) {
        const orbital = setOrbitalPosition(selected, clock.getElapsedTime(), tmpVec);
        const focusHeight = Math.max(10, 14 + selected.rank * 0.18);
        const focusDepth = Math.max(8, 10 + selected.rank * 0.1);
        desiredTarget.current.lerp(orbital, 0.14);
        desiredPosition.current.lerp(
          new THREE.Vector3(orbital.x, focusHeight + selected.sizeScale * 4, orbital.z + focusDepth + selected.sizeScale * 2),
          0.12,
        );
      }
    } else {
      desiredTarget.current.lerp(computedOverview.target, 0.12);
      desiredPosition.current.lerp(computedOverview.position, 0.08);
    }

    camera.position.lerp(desiredPosition.current, 0.06);
    camera.lookAt(desiredTarget.current);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(desiredTarget.current, 0.12);
      controlsRef.current.update();
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={36} near={0.1} far={1200} position={computedOverview.position.toArray()} />
      <OrbitControls
        ref={controlsRef}
        enabled={!!isFreeView}
        enablePan={!!isFreeView}
        enableRotate={!!isFreeView}
        zoomToCursor
        minDistance={12}
        maxDistance={computedOverview.maxDistance}
        minPolarAngle={0.02}
        maxPolarAngle={Math.PI * 0.5}
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

  if (!leader) return null;

  return (
    <>
      <color attach="background" args={['#010208']} />
      <fog attach="fog" args={['#010208', 180, 520]} />

      <CameraRig teams={teams} selectedTeamId={selectedTeamId} onResetViewKey={onResetViewKey} isFreeView={isFreeView} />

      <ambientLight intensity={0.34} color="#aeb7cc" />
      <pointLight position={[0, 0, 0]} intensity={150} color="#ffd08f" decay={2.1} />
      <directionalLight position={[70, 90, 40]} intensity={1.15} color="#dbe7ff" />

      <DeepSpaceBackdrop qualityMode={qualityMode} />
      <Stars radius={460} depth={220} count={qualityMode === 'cinematic' ? 14000 : 7000} factor={qualityMode === 'cinematic' ? 5.6 : 4.1} saturation={0.02} fade speed={0.12} />
      <Constellations />


      {teams.slice(1).map((team) => (
        <OrbitRibbon key={`${team.id}-orbit`} team={team} />
      ))}

      <SolarCore leader={leader} dna={dnaByTeam[leader.id]} leaderTransitionValue={leaderTransitionValue} />

      {teams.slice(1).map((team) => (
        <PlanetNode
          key={team.id}
          team={team}
          dna={dnaByTeam[team.id]}
          isSelected={selectedTeamId === team.id}
          isPreviousLeader={team.id === previousLeaderId}
          transitionValue={leaderTransitionValue}
          pulseValue={pulseByTeamId[team.id] ?? 0}
          qualityMode={qualityMode}
          onSelectTeam={onSelectTeam}
        />
      ))}

      <EffectComposer multisampling={qualityMode === 'cinematic' ? 4 : 0}>
        <Bloom intensity={qualityMode === 'cinematic' ? 0.42 : 0.24} luminanceThreshold={0.68} luminanceSmoothing={0.45} />
        {qualityMode === 'cinematic' ? <Noise opacity={0.015} /> : null}
        <Vignette eskil={false} offset={0.14} darkness={0.72} />
      </EffectComposer>
    </>
  );
};

export function GalaxyCanvas(props: GalaxyCanvasProps) {
  const dpr = props.qualityMode === 'cinematic' ? [1, 2] : [1, 1.35];

  return (
    <Canvas
      shadows={props.qualityMode === 'cinematic' ? 'soft' : false}
      dpr={dpr}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        useLegacyLights: false,
      }}
    >
      <GalaxyScene {...props} />
    </Canvas>
  );
}
