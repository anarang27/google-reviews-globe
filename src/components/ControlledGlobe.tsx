import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, {
  createContext,
  Suspense,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import {
  OrthographicCamera as OrthographicCameraImpl,
  PerspectiveCamera as PerspectiveCameraImpl,
  Quaternion,
  Vector3,
  type Group,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const GLOBE_RADIUS = 100;
const EPS = 0.001;
const Z_INDEX_RANGE = [16777271, 0] as const;

export type Coordinates = {
  lat: number;
  lng: number;
};

export type RootRef = {
  pointOfView: (coords: Coordinates) => void;
};

type GlobeContextValue = {
  projection: "3d";
};

type RootProps = {
  globeRef?: Ref<RootRef>;
  originX?: number;
  originY?: number;
  polarOffset?: number;
  azimuthOffset?: number;
  rotateSpeed?: number;
  divRef?: Ref<HTMLDivElement>;
  children?: ReactNode;
} & React.ComponentPropsWithoutRef<"div">;

type MarkerProps = {
  coordinates: Coordinates;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const GlobeContext = createContext<GlobeContextValue | null>(null);

function useGlobeContext(debugName: string) {
  const ctx = useContext(GlobeContext);

  if (!ctx) {
    throw new Error(`<${debugName}> must be used within <Root>`);
  }

  return ctx;
}

function deg2Rad(deg: number) {
  return (deg * Math.PI) / 180;
}

function polar2Cartesian({ lat, lng }: Coordinates, relAltitude = 0) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((90 - lng) * Math.PI) / 180;
  const radius = GLOBE_RADIUS * (1 + relAltitude);

  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ] as const;
}

function useVec3(debugName: string, coordinates: Coordinates, relAltitude?: number) {
  const { projection } = useGlobeContext(debugName);

  return useMemo(() => {
    if (projection === "3d") {
      return new Vector3(...polar2Cartesian(coordinates, relAltitude));
    }

    return new Vector3(deg2Rad(coordinates.lng) * GLOBE_RADIUS, deg2Rad(coordinates.lat) * GLOBE_RADIUS, relAltitude ?? 0);
  }, [coordinates, projection, relAltitude]);
}

type TunnelEntry = [string, ReactNode];

type TunnelInContextValue = {
  register: (key: string, children: ReactNode) => () => void;
  incVersion: () => void;
};

const TunnelVersionContext = createContext(0);
const TunnelInContext = createContext<TunnelInContextValue | null>(null);
const TunnelOutContext = createContext<TunnelEntry[] | null>(null);

function TunnelContainer({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<TunnelEntry[]>([]);
  const [version, setVersion] = useState(0);

  const inContextValue = useMemo(
    () => ({
      register: (key: string, entryChildren: ReactNode) => {
        setCurrent((entries) => [...entries, [key, entryChildren]]);
        return () => setCurrent((entries) => entries.filter((entry) => entry[0] !== key));
      },
      incVersion: () => setVersion((currentVersion) => currentVersion + 1),
    }),
    [],
  );

  return (
    <TunnelInContext.Provider value={inContextValue}>
      <TunnelVersionContext.Provider value={version}>
        <TunnelOutContext.Provider value={current}>{children}</TunnelOutContext.Provider>
      </TunnelVersionContext.Provider>
    </TunnelInContext.Provider>
  );
}

function TunnelOut() {
  const tunnel = useContext(TunnelOutContext);

  if (!tunnel) {
    throw new Error("<TunnelOut> must be used inside <TunnelContainer>");
  }

  return tunnel.map(([key, children]) => <React.Fragment key={key}>{children}</React.Fragment>);
}

function TunnelIn({ children }: { children: ReactNode }) {
  const key = React.useId();
  const version = useContext(TunnelVersionContext);
  const tunnel = useContext(TunnelInContext);

  if (!tunnel) {
    throw new Error("<TunnelIn> must be used inside <TunnelContainer>");
  }

  useLayoutEffect(() => {
    tunnel.incVersion();
  }, [tunnel]);

  useLayoutEffect(() => tunnel.register(key, children), [children, key, tunnel, version]);

  return null;
}

function Scene({
  globeRef,
  originX: offsetX,
  originY: offsetY,
  polarOffset,
  azimuthOffset,
  rotateSpeed,
  children,
}: Pick<RootProps, "globeRef" | "originX" | "originY" | "polarOffset" | "azimuthOffset" | "rotateSpeed" | "children">) {
  const getThree = useThree((state) => state.get);
  const ctrl = useRef<OrbitControlsImpl | null>(null);

  useImperativeHandle(
    globeRef,
    () => ({
      pointOfView: (coords) => {
        ctrl.current?.setPolarAngle(Math.PI / 2 - deg2Rad(coords.lat) + (polarOffset ?? 0));
        ctrl.current?.setAzimuthalAngle(deg2Rad(coords.lng) + (azimuthOffset ?? 0));
      },
    }),
    [azimuthOffset, polarOffset],
  );

  useLayoutEffect(() => {
    const { camera, size } = getThree();
    camera.setViewOffset(
      size.width * 2,
      size.height * 2,
      (1 - (offsetX ?? 0.5)) * size.width,
      (1 - (offsetY ?? 0.5)) * size.height,
      size.width,
      size.height,
    );
  }, [getThree, offsetX, offsetY]);

  return (
    <>
      <ambientLight color={0xcccccc} intensity={Math.PI} />
      <directionalLight color={0xffffff} intensity={0.6 * Math.PI} />
      <PerspectiveCamera makeDefault position={[0, 0, GLOBE_RADIUS * 5]} />
      <OrbitControls
        ref={ctrl}
        makeDefault
        minDistance={110}
        maxDistance={800}
        enablePan={false}
        rotateSpeed={rotateSpeed}
        onStart={() => {
          document.body.style.userSelect = "none";
        }}
        onEnd={() => {
          document.body.style.userSelect = "";
        }}
      />
      <GlobeContext.Provider value={{ projection: "3d" }}>{children}</GlobeContext.Provider>
    </>
  );
}

export function Root({
  globeRef,
  originX,
  originY,
  polarOffset,
  azimuthOffset,
  rotateSpeed = 1,
  divRef,
  children,
  style,
  ...divProps
}: RootProps) {
  return (
    <div
      ref={divRef}
      {...divProps}
      style={{
        position: "relative",
        zIndex: 0,
        ...style,
      }}
    >
      <TunnelContainer>
        <Canvas frameloop="demand">
          <Suspense fallback={null}>
            <Scene
              globeRef={globeRef}
              originX={originX}
              originY={originY}
              polarOffset={polarOffset}
              azimuthOffset={azimuthOffset}
              rotateSpeed={rotateSpeed}
            >
              {children}
            </Scene>
          </Suspense>
        </Canvas>
        <TunnelOut />
      </TunnelContainer>
    </div>
  );
}

const v1 = new Vector3();
const v2 = new Vector3();
const q1 = new Quaternion();

function calculatePosition(el: Group, camera: PerspectiveCameraImpl | OrthographicCameraImpl, size: { width: number; height: number }) {
  const objectPos = v1.setFromMatrixPosition(el.matrixWorld);
  objectPos.project(camera);
  const widthHalf = size.width / 2;
  const heightHalf = size.height / 2;

  return [objectPos.x * widthHalf + widthHalf, -objectPos.y * heightHalf + heightHalf] as const;
}

function getObjectZ(el: Group, camera: PerspectiveCameraImpl | OrthographicCameraImpl) {
  const objectPos = v1.setFromMatrixPosition(el.matrixWorld);
  const cameraRot = q1.setFromRotationMatrix(camera.matrixWorldInverse);
  objectPos.applyQuaternion(cameraRot);

  return objectPos.z;
}

function objectZIndex(el: Group, camera: PerspectiveCameraImpl | OrthographicCameraImpl) {
  const objectPos = v1.setFromMatrixPosition(el.matrixWorld);
  const cameraPos = v2.setFromMatrixPosition(camera.matrixWorld);
  const dist = objectPos.distanceTo(cameraPos);
  const coefficient = (Z_INDEX_RANGE[1] - Z_INDEX_RANGE[0]) / (camera.far - camera.near);
  const constant = Z_INDEX_RANGE[1] - coefficient * camera.far;

  return Math.round(coefficient * dist + constant);
}

function getState(occluded: boolean) {
  return occluded ? "occluded" : "visible";
}

function Html({
  position,
  occlusionOffset = 0,
  occlusionEps = 1,
  className,
  style,
  children,
}: {
  position: Vector3;
  occlusionOffset?: number;
  occlusionEps?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<Group | null>(null);
  const camera = useThree((state) => state.camera as PerspectiveCameraImpl | OrthographicCameraImpl);
  const scene = useThree((state) => state.scene);
  const size = useThree((state) => state.size);
  const oldZoom = useRef(0);
  const oldPosition = useRef<readonly [number, number]>([0, 0]);
  const oldOccluded = useRef<boolean | null>(null);

  useLayoutEffect(() => {
    if (!elRef.current || !groupRef.current) {
      return;
    }

    scene.updateMatrixWorld();
    const vec = calculatePosition(groupRef.current, camera, size);
    const occluded = getObjectZ(groupRef.current, camera) - occlusionOffset < 0;
    elRef.current.style.zIndex = `${objectZIndex(groupRef.current, camera)}`;
    elRef.current.style.transform = `translate3d(${vec[0]}px,${vec[1]}px,0)`;
    elRef.current.dataset.state = getState(occluded);
  }, [camera, occlusionOffset, scene, size]);

  useFrame(() => {
    if (!elRef.current || !groupRef.current) {
      return;
    }

    camera.updateMatrixWorld();
    groupRef.current.updateWorldMatrix(true, false);
    const vec = calculatePosition(groupRef.current, camera, size);
    const occluded =
      getObjectZ(groupRef.current, camera) -
        occlusionOffset +
        (oldOccluded.current === null ? 0 : oldOccluded.current ? -occlusionEps : occlusionEps) <
      0;

    if (oldOccluded.current !== occluded) {
      elRef.current.dataset.state = getState(occluded);
      oldOccluded.current = occluded;
    }

    if (
      Math.abs(oldZoom.current - camera.zoom) > EPS ||
      Math.abs(oldPosition.current[0] - vec[0]) > EPS ||
      Math.abs(oldPosition.current[1] - vec[1]) > EPS
    ) {
      elRef.current.style.zIndex = `${objectZIndex(groupRef.current, camera)}`;
      elRef.current.style.transform = `translate3d(${vec[0]}px,${vec[1]}px,0)`;
      oldPosition.current = vec;
      oldZoom.current = camera.zoom;
    }
  });

  return (
    <>
      <group ref={groupRef} position={position} />
      <TunnelIn>
        <div
          ref={elRef}
          className={className}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transformOrigin: "0 0",
            ...style,
          }}
        >
          {children}
        </div>
      </TunnelIn>
    </>
  );
}

export function Marker({ coordinates, children, ...div }: MarkerProps) {
  const vec = useVec3("Marker", coordinates, 0.01);

  return (
    <Html {...div} position={vec}>
      {children}
    </Html>
  );
}
