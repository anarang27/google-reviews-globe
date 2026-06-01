import { useMemo } from "react";
import { AdditiveBlending, BackSide, BufferGeometry, Float32BufferAttribute } from "three";
import { mesh } from "topojson-client";
import countriesTopology from "world-atlas/countries-50m.json";
import type { MultiLineString } from "geojson";

const GLOBE_RADIUS = 100;
const BORDER_RADIUS = 100.8;
const GRID_RADIUS = 100.35;

function toPoint(lat: number, lng: number, radius: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((90 - lng) * Math.PI) / 180;

  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function buildLineGeometry(lines: number[][][], radius: number) {
  const positions: number[] = [];

  for (const line of lines) {
    for (let index = 0; index < line.length - 1; index += 1) {
      const [lngA, latA] = line[index];
      const [lngB, latB] = line[index + 1];

      // TopoJSON arcs can wrap around the antimeridian; skipping those long
      // jumps avoids stray lines cutting across the globe.
      if (Math.abs(lngA - lngB) > 180) {
        continue;
      }

      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(lngA - lngB), Math.abs(latA - latB)) / 2));

      for (let step = 0; step < steps; step += 1) {
        const startT = step / steps;
        const endT = (step + 1) / steps;
        const startLng = lngA + (lngB - lngA) * startT;
        const startLat = latA + (latB - latA) * startT;
        const endLng = lngA + (lngB - lngA) * endT;
        const endLat = latA + (latB - latA) * endT;

        positions.push(...toPoint(startLat, startLng, radius), ...toPoint(endLat, endLng, radius));
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geometry;
}

function buildGridLines() {
  const lines: number[][][] = [];

  for (let lat = -60; lat <= 60; lat += 30) {
    const line: number[][] = [];
    for (let lng = -180; lng <= 180; lng += 4) {
      line.push([lng, lat]);
    }
    lines.push(line);
  }

  for (let lng = -180; lng < 180; lng += 30) {
    const line: number[][] = [];
    for (let lat = -84; lat <= 84; lat += 4) {
      line.push([lng, lat]);
    }
    lines.push(line);
  }

  return lines;
}

function buildStarGeometry() {
  const positions: number[] = [];
  const starCount = 900;

  for (let index = 0; index < starCount; index += 1) {
    const seed = index + 1;
    const theta = (seed * 12.9898) % (Math.PI * 2);
    const phi = Math.acos(2 * (((seed * 78.233) % 1000) / 1000) - 1);
    const radius = 430 + ((seed * 37.719) % 220);

    positions.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta),
    );
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geometry;
}

export function WireframeEarth() {
  const borderGeometry = useMemo(() => {
    const borders = mesh(
      countriesTopology as never,
      (countriesTopology as unknown as { objects: { countries: never } }).objects.countries,
      (a, b) => a !== b,
    ) as MultiLineString;

    return buildLineGeometry(borders.coordinates, BORDER_RADIUS);
  }, []);

  const gridGeometry = useMemo(() => buildLineGeometry(buildGridLines(), GRID_RADIUS), []);
  const starGeometry = useMemo(() => buildStarGeometry(), []);

  return (
    <>
      <points geometry={starGeometry}>
        <pointsMaterial color="#ffffff" size={1.05} sizeAttenuation transparent opacity={0.86} />
      </points>

      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
        <meshBasicMaterial color="#010302" />
      </mesh>

      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 2.8, 96, 96]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          color="#1fffc3"
          opacity={0.08}
          side={BackSide}
          transparent
        />
      </mesh>

      <lineSegments geometry={gridGeometry}>
        <lineBasicMaterial color="#2e6058" transparent opacity={0.34} />
      </lineSegments>

      <lineSegments geometry={borderGeometry}>
        <lineBasicMaterial color="#27f0a8" transparent opacity={0.92} />
      </lineSegments>
    </>
  );
}
