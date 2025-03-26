import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as fabric from 'fabric';
import * as THREE from 'three';

interface ThreeDModelProps {
  originalCanvas: fabric.Canvas | null;
}

// Component for a single 3D shape generated from a 2D path
const Shape = ({ pathObj }: { pathObj: fabric.Path }) => {
  const path = pathObj.path as any[];
  if (!path || path.length === 0) {
    console.log('Path is empty or undefined');
    return null;
  }
  
  // Extract points from the path
  const points: THREE.Vector2[] = [];
  
  path.forEach((cmd: any) => {
    if (cmd[0] === 'M' || cmd[0] === 'L') {
      points.push(new THREE.Vector2(cmd[1], cmd[2]));
    } else if (cmd[0] === 'Q') {
      // Add quadratic curve points
      points.push(new THREE.Vector2(cmd[1], cmd[2]));
      points.push(new THREE.Vector2(cmd[3], cmd[4]));
    } else if (cmd[0] === 'C') {
      // Add cubic curve points
      points.push(new THREE.Vector2(cmd[1], cmd[2]));
      points.push(new THREE.Vector2(cmd[3], cmd[4]));
      points.push(new THREE.Vector2(cmd[5], cmd[6]));
    }
  });
  
  console.log('Points extracted:', points.length);
  if (points.length < 3) {
    console.log('Not enough points to create a shape');
    return null;
  }
  
  // Create a shape from the points
  const shape = new THREE.Shape(points);
  const extrudeSettings = {
    steps: 1,
    depth: 20,
    bevelEnabled: true,
    bevelThickness: 2,
    bevelSize: 1,
    bevelOffset: 0,
    bevelSegments: 3
  };
  
  // Random color for the object
  const color = new THREE.Color(Math.random(), Math.random(), Math.random());
  
  return (
    <mesh position={[0, 0, 0]}>
      <extrudeGeometry args={[shape, extrudeSettings]} />
      <meshPhongMaterial color={color} specular={0x111111} shininess={30} />
    </mesh>
  );
};

// Component for text in 3D
const Text3D = ({ textObj }: { textObj: fabric.IText }) => {
  // For simplicity, we'll just create a box with the text dimensions
  const width = textObj.width || 100;
  const height = textObj.height || 50;
  const depth = 10;
  
  return (
    <mesh position={[textObj.left || 0, -(textObj.top || 0), 0]}>
      <boxGeometry args={[width, height, depth]} />
      <meshPhongMaterial color={0x3498db} />
    </mesh>
  );
};

// Scene setup with lights
const Scene = ({ objects }: { objects: fabric.Object[] }) => {
  console.log('Rendering Scene with objects:', objects.length);
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      {/* Base platform for reference */}
      <mesh position={[0, 0, -10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[800, 600]} />
        <meshBasicMaterial color="#f0f0f0" />
      </mesh>
      
      <group position={[-400, -300, 0]} scale={[1, -1, 1]}>
        {objects.map((obj, index) => {
          console.log('Processing object:', obj.type);
          if (obj.type === 'path') {
            return <Shape key={index} pathObj={obj as fabric.Path} />;
          } else if (obj.type === 'i-text') {
            return <Text3D key={index} textObj={obj as fabric.IText} />;
          }
          return null;
        })}
      </group>
      <OrbitControls makeDefault />
    </>
  );
};

export default function ThreeDModel({ originalCanvas }: ThreeDModelProps) {
  const [objects, setObjects] = useState<fabric.Object[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (originalCanvas) {
      const canvasObjects = originalCanvas.getObjects();
      console.log('Canvas objects found:', canvasObjects.length);
      setObjects(canvasObjects);
    }
  }, [originalCanvas]);
  
  if (!originalCanvas) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-gray-400">No canvas data available</div>
      </div>
    );
  }
  
  return (
    <div ref={containerRef} className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 800], fov: 75 }}>
        <Scene objects={objects} />
      </Canvas>
    </div>
  );
} 