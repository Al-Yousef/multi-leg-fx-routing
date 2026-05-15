import { useEffect, useMemo, useRef, type ReactElement } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

export type RoutingNetwork3DProps = {
  currencies: string[];
  edges: Array<{ from: string; to: string }>;
  activePath: string[];
};

type BrandColors = { gold: string; goldSoft: string; blue: string };

const EDGE_DIM = "#3a3b42";
const NODE_DIM = "#54555c";
const NODE_TEXT = "#f3f3f6";

function readBrandColorsFromCss(): BrandColors {
  if (typeof document === "undefined") {
    return { gold: "#d4a853", goldSoft: "#e8c36a", blue: "#1e6fd9" };
  }
  const s = getComputedStyle(document.documentElement);
  return {
    gold: s.getPropertyValue("--gold").trim() || "#d4a853",
    goldSoft: s.getPropertyValue("--gold-soft").trim() || "#e8c36a",
    blue: s.getPropertyValue("--blue").trim() || "#1e6fd9",
  };
}

const SPHERE_RADIUS = 2.05;
const MAX_BACKGROUND_NODES = 18;
const MAX_BACKGROUND_EDGES = 22;

function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
  }
  return points;
}

type NodeLayout = {
  code: string;
  position: THREE.Vector3;
  active: boolean;
};

type EdgeLayout = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  active: boolean;
  order: number;
};

function buildLayout(
  currencies: string[],
  edges: Array<{ from: string; to: string }>,
  activePath: string[],
): { nodes: NodeLayout[]; edges: EdgeLayout[] } {
  const codes = currencies.slice(0, MAX_BACKGROUND_NODES);
  const activeSet = new Set(activePath);
  for (const code of activePath) {
    if (!codes.includes(code)) {
      codes.push(code);
    }
  }

  const positions = fibonacciSphere(codes.length, SPHERE_RADIUS);
  const codeToPos = new Map<string, THREE.Vector3>();
  const nodes: NodeLayout[] = codes.map((code, index) => {
    const pos = positions[index];
    codeToPos.set(code, pos);
    return { code, position: pos, active: activeSet.has(code) };
  });

  const seen = new Set<string>();
  const eligible: EdgeLayout[] = [];

  for (let i = 0; i < activePath.length - 1; i += 1) {
    const a = activePath[i];
    const b = activePath[i + 1];
    const pa = codeToPos.get(a);
    const pb = codeToPos.get(b);
    if (!pa || !pb) continue;
    const key = `${a}|${b}`;
    seen.add(key);
    seen.add(`${b}|${a}`);
    eligible.push({ from: pa, to: pb, active: true, order: i });
  }

  let extra = 0;
  for (const edge of edges) {
    if (extra >= MAX_BACKGROUND_EDGES) break;
    const key = `${edge.from}|${edge.to}`;
    if (seen.has(key)) continue;
    const pa = codeToPos.get(edge.from);
    const pb = codeToPos.get(edge.to);
    if (!pa || !pb) continue;
    seen.add(key);
    seen.add(`${edge.to}|${edge.from}`);
    eligible.push({ from: pa, to: pb, active: false, order: -1 });
    extra += 1;
  }

  return { nodes, edges: eligible };
}

function Edge({ edge, gold }: { edge: EdgeLayout; gold: string }) {
  const ref = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array([
      edge.from.x,
      edge.from.y,
      edge.from.z,
      edge.to.x,
      edge.to.y,
      edge.to.z,
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [edge.from, edge.to]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.LineBasicMaterial;
    if (edge.active) {
      const t = (Math.sin(clock.elapsedTime * 1.6 + edge.order) + 1) / 2;
      mat.opacity = 0.55 + t * 0.45;
    }
  });

  return (
    <lineSegments ref={ref} geometry={geometry}>
      <lineBasicMaterial
        color={edge.active ? gold : EDGE_DIM}
        transparent
        opacity={edge.active ? 0.95 : 0.18}
        linewidth={1}
      />
    </lineSegments>
  );
}

function Node({ node, gold, goldSoft }: { node: NodeLayout; gold: string; goldSoft: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (node.active && haloRef.current) {
      const t = (Math.sin(clock.elapsedTime * 2 + node.position.x) + 1) / 2;
      const scale = 1 + t * 0.4;
      haloRef.current.scale.setScalar(scale);
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.25 + (1 - t) * 0.25;
    }
  });

  return (
    <group position={node.position}>
      {node.active ? (
        <mesh ref={haloRef}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshBasicMaterial color={goldSoft} transparent opacity={0.35} />
        </mesh>
      ) : null}
      <mesh ref={meshRef}>
        <sphereGeometry args={[node.active ? 0.07 : 0.045, 16, 16]} />
        <meshBasicMaterial color={node.active ? gold : NODE_DIM} />
      </mesh>
      <Html
        center
        distanceFactor={6}
        zIndexRange={[10, 0]}
        style={{
          pointerEvents: "none",
          color: node.active ? gold : NODE_TEXT,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: node.active ? 12 : 10,
          fontWeight: 600,
          letterSpacing: "0.06em",
          opacity: node.active ? 1 : 0.55,
          textShadow: node.active ? `0 0 14px color-mix(in srgb, ${gold} 55%, transparent)` : "none",
          transform: "translate(8px, -50%)",
          whiteSpace: "nowrap",
        }}
      >
        {node.code}
      </Html>
    </group>
  );
}

function Scene({
  currencies,
  edges,
  activePath,
  brand,
}: RoutingNetwork3DProps & { brand: BrandColors }) {
  const groupRef = useRef<THREE.Group>(null);
  const { nodes, edges: eligibleEdges } = useMemo(
    () => buildLayout(currencies, edges, activePath),
    [currencies, edges, activePath],
  );

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.0001) * 0.18;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={0.6} color={brand.gold} />
      <pointLight position={[-5, -5, -5]} intensity={0.4} color={brand.blue} />

      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[SPHERE_RADIUS * 1.02, 48, 48]} />
          <meshBasicMaterial color={brand.blue} transparent opacity={0.02} wireframe />
        </mesh>

        {eligibleEdges.map((edge, index) => (
          <Edge key={`e-${index}`} edge={edge} gold={brand.gold} />
        ))}

        {nodes.map((node) => (
          <Node key={node.code} node={node} gold={brand.gold} goldSoft={brand.goldSoft} />
        ))}
      </group>
    </>
  );
}

export default function RoutingNetwork3DScene(props: RoutingNetwork3DProps): ReactElement {
  const brand = useMemo(() => readBrandColorsFromCss(), []);

  return (
    <Canvas
      camera={{ position: [0, 0, 5.4], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <Scene {...props} brand={brand} />
    </Canvas>
  );
}
