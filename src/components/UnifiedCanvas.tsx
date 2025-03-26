import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface FabricThreeObject extends fabric.Object {
  threeElement?: HTMLDivElement & {
    _dragCleanupFn?: () => void;
  };
  model3d?: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    animate: () => void;
  };
}

interface BoundingRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type ExtendedHTMLDivElement = HTMLDivElement & {
  _dragCleanupFn?: () => void;
};

export default function UnifiedCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [drawingMode, setDrawingMode] = useState<boolean>(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentDrawing, setCurrentDrawing] = useState<fabric.Object | null>(null);
  const [animationFrames, setAnimationFrames] = useState<number[]>([]);
  const [activeThreeElement, setActiveThreeElement] = useState<ExtendedHTMLDivElement | null>(null);

  // Initialize the canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvas) {
      console.log('Initializing canvas with dimensions:', {
        width: window.innerWidth,
        height: window.innerHeight - 80 // Adjusted for new toolbar height
      });
      
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: window.innerWidth,
        height: window.innerHeight - 80,
        backgroundColor: '#f5f5f5',
        isDrawingMode: true,
      });
      
      console.log('Canvas initialized:', {
        width: canvas.width,
        height: canvas.height,
        backgroundColor: canvas.backgroundColor
      });
      
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }
      
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = 2;
        canvas.freeDrawingBrush.color = 'var(--text-primary)';
      }

      // Add event listener for path creation when drawing
      canvas.on('path:created', (e) => {
        const path = e.path;
        if (path) {
          setCurrentDrawing(path);
          console.log('Drawing created:', path);
        }
      });
      
      canvas.on('selection:created', (e) => {
        const target = e.selected?.[0] as fabric.Object;
        if (target) {
          setCurrentDrawing(target);
        }
      });
      
      // Handle clicks on canvas to make sure we're not drawing on top of 3D models
      canvas.on('mouse:down', (e) => {
        if (activeThreeElement) {
          e.e.stopPropagation();
          e.e.preventDefault();
          return false;
        }
      });
      
      setFabricCanvas(canvas);
      
      const handleResize = () => {
        canvas.setWidth(window.innerWidth);
        canvas.setHeight(window.innerHeight - 80);
        canvas.renderAll();
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        // Clean up animation frames
        animationFrames.forEach(frame => cancelAnimationFrame(frame));
        window.removeEventListener('resize', handleResize);
        canvas.dispose();
      };
    }
  }, []);

  // Cleanup animation frames on unmount
  useEffect(() => {
    return () => {
      animationFrames.forEach(frame => cancelAnimationFrame(frame));
      
      // Clean up all event listeners to prevent memory leaks
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (fabricCanvas) {
        const objects = fabricCanvas.getObjects();
        objects.forEach(obj => {
          const threeObj = obj as FabricThreeObject;
          if (threeObj.threeElement && threeObj.threeElement._dragCleanupFn) {
            threeObj.threeElement._dragCleanupFn();
          }
        });
      }
    };
  }, [animationFrames]);

  // Update drawing mode when it changes
  useEffect(() => {
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = drawingMode && !activeThreeElement;
      
      if (drawingMode && !fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
      }
      
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.width = 2;
        fabricCanvas.freeDrawingBrush.color = 'var(--text-primary)';
      }
    }
  }, [drawingMode, fabricCanvas, activeThreeElement]);

  const toggleDrawingMode = () => {
    setDrawingMode(!drawingMode);
  };

  const addText = () => {
    if (fabricCanvas) {
      const text = new fabric.IText('Text', {
        left: Math.random() * (fabricCanvas.width || 800) * 0.8,
        top: Math.random() * (fabricCanvas.height || 600) * 0.8,
        fontFamily: 'Arial',
        fontSize: 20,
        fill: 'var(--text-primary)',
      });
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      setCurrentDrawing(text);
    }
  };

  const clearCanvas = () => {
    if (fabricCanvas) {
      // Stop all 3D animations
      const objects = fabricCanvas.getObjects();
      objects.forEach(obj => {
        const threeObj = obj as FabricThreeObject;
        if (threeObj.threeElement) {
          // Remove drag event listeners if they exist
          if (threeObj.threeElement._dragCleanupFn) {
            threeObj.threeElement._dragCleanupFn();
          }
          document.body.removeChild(threeObj.threeElement);
        }
      });
      
      // Clear animation frames
      animationFrames.forEach(frame => cancelAnimationFrame(frame));
      setAnimationFrames([]);
      setActiveThreeElement(null);
      
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = '#f5f5f5';
      fabricCanvas.renderAll();
      setCurrentDrawing(null);
    }
  };

  // Helper function to generate random colors
  const getRandomColor = (opacity = 1) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#1A535C', '#FFE66D', '#FF9F1C',
      '#2EC4B6', '#E71D36', '#011627', '#FDFFFC', '#3772FF'
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    if (opacity < 1) {
      // Convert hex to rgba for transparency
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    return color;
  };

  // Convert to improved 2D
  const convertTo2D = () => {
    if (fabricCanvas) {
      // Get all objects on the canvas
      const objects = fabricCanvas.getObjects();
      
      if (objects.length === 0) {
        alert('Draw something first!');
        return;
      }
      
      // Get the bounding rectangle of all objects
      const allObjectsBounds = fabricCanvas.getObjects().reduce((acc, obj) => {
        const bounds = obj.getBoundingRect();
        if (!acc) return bounds;
        
        return {
          left: Math.min(acc.left, bounds.left),
          top: Math.min(acc.top, bounds.top),
          width: Math.max(acc.left + acc.width, bounds.left + bounds.width) - Math.min(acc.left, bounds.left),
          height: Math.max(acc.top + acc.height, bounds.top + bounds.height) - Math.min(acc.top, bounds.top)
        };
      }, null as BoundingRect | null);
      
      if (!allObjectsBounds) return;
      
      // Process all objects and create improved versions
      objects.forEach(originalObj => {
        const bounds = originalObj.getBoundingRect();
        
        // Calculate the relative position within the group
        const relX = bounds.left - allObjectsBounds.left;
        const relY = bounds.top - allObjectsBounds.top;
        
        // Create improved version based on type
        if (originalObj.type === 'path') {
          const pathObj = originalObj as fabric.Path;
          
          // Create a new path with improved styling
          const improvedPath = new fabric.Path(pathObj.path, {
            left: allObjectsBounds.left + allObjectsBounds.width + 20 + relX, // Position to the right maintaining relative position
            top: allObjectsBounds.top + relY,
            strokeWidth: 5,
            stroke: getRandomColor(),
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            fill: getRandomColor(0.3),
          });
          
          fabricCanvas.add(improvedPath);
        } else if (originalObj.type === 'i-text') {
          const textObj = originalObj as fabric.IText;
          
          // Create improved text
          const improvedText = new fabric.IText(textObj.text || '', {
            left: allObjectsBounds.left + allObjectsBounds.width + 20 + relX,
            top: allObjectsBounds.top + relY,
            fontFamily: 'Arial',
            fontSize: textObj.fontSize,
            fontWeight: 'bold',
            fill: getRandomColor(),
            shadow: new fabric.Shadow({
              color: 'rgba(0,0,0,0.3)',
              blur: 5,
              offsetX: 2,
              offsetY: 2
            })
          });
          
          fabricCanvas.add(improvedText);
        }
      });
      
      fabricCanvas.renderAll();
    } else {
      alert('Canvas not initialized!');
    }
  };

  // Convert to 3D with an interactive model
  const convertTo3D = () => {
    if (fabricCanvas) {
      // Get all objects on the canvas
      const objects = fabricCanvas.getObjects();
      
      // Filter to only include path objects (for 3D conversion)
      const pathObjects = objects.filter(obj => obj.type === 'path');
      
      if (pathObjects.length === 0) {
        alert('Draw paths to convert to 3D');
        return;
      }
      
      // Get the bounding rectangle of all objects
      const allObjectsBounds = pathObjects.reduce((acc, obj) => {
        const bounds = obj.getBoundingRect();
        if (!acc) return bounds;
        
        return {
          left: Math.min(acc.left, bounds.left),
          top: Math.min(acc.top, bounds.top),
          width: Math.max(acc.left + acc.width, bounds.left + bounds.width) - Math.min(acc.left, bounds.left),
          height: Math.max(acc.top + acc.height, bounds.top + bounds.height) - Math.min(acc.top, bounds.top)
        };
      }, null as BoundingRect | null);
      
      if (!allObjectsBounds) return;
      
      // Create container for 3D model
      const threeContainer = document.createElement('div');
      threeContainer.style.width = '300px';
      threeContainer.style.height = '300px';
      threeContainer.style.position = 'absolute';
      threeContainer.style.backgroundColor = 'transparent';
      threeContainer.style.zIndex = '10';
      threeContainer.style.border = '1px dashed #aaa';
      threeContainer.style.borderRadius = '4px';
      threeContainer.style.cursor = 'move'; // Set cursor to indicate it's draggable
      threeContainer.className = 'three-container';
      threeContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)'; // Add shadow for better visibility
      
      // Set initial position to the center of the screen
      const initialX = Math.max(window.innerWidth / 2 - 150, 20); // center with 20px minimum margin
      const initialY = Math.max(window.innerHeight / 2 - 150, 70); // center with 70px minimum margin for toolbar
      threeContainer.style.left = `${initialX}px`;
      threeContainer.style.top = `${initialY}px`;
      
      // Add interaction info
      const infoElement = document.createElement('div');
      infoElement.style.position = 'absolute';
      infoElement.style.top = '35px'; // Below the drag handle
      infoElement.style.left = '5px';
      infoElement.style.background = 'rgba(0,0,0,0.5)';
      infoElement.style.color = 'white';
      infoElement.style.padding = '2px 5px';
      infoElement.style.borderRadius = '3px';
      infoElement.style.fontSize = '10px';
      infoElement.style.pointerEvents = 'none';
      infoElement.textContent = 'Click and drag inside to rotate 3D model';
      threeContainer.appendChild(infoElement);
      
      // Add a visible drag handle at the top of the container
      const dragHandle = document.createElement('div');
      dragHandle.style.position = 'absolute';
      dragHandle.style.top = '0';
      dragHandle.style.left = '0';
      dragHandle.style.width = '100%';
      dragHandle.style.height = '30px';
      dragHandle.style.backgroundColor = 'rgba(128, 0, 128, 0.7)';
      dragHandle.style.cursor = 'move';
      dragHandle.style.borderTopLeftRadius = '4px';
      dragHandle.style.borderTopRightRadius = '4px';
      dragHandle.style.zIndex = '20'; // Make sure it's above the 3D canvas
      dragHandle.textContent = 'Drag here to move';
      dragHandle.style.color = 'white';
      dragHandle.style.fontWeight = 'bold';
      dragHandle.style.display = 'flex';
      dragHandle.style.alignItems = 'center';
      dragHandle.style.justifyContent = 'center';
      dragHandle.style.userSelect = 'none';
      threeContainer.appendChild(dragHandle);

      document.body.appendChild(threeContainer);
      
      // Set up Three.js
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(300, 300);
      renderer.setClearColor(0xf5f5f5, 1);
      threeContainer.appendChild(renderer.domElement);
      
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      
      // Create a compound shape from all path objects
      const compoundShape = new THREE.Shape();
      let isFirstPath = true;
      
      // Process each path object for the 3D model
      pathObjects.forEach(obj => {
        const pathObj = obj as fabric.Path;
        const path = pathObj.path;
        
        if (!path || path.length < 3) return;
        
        // Convert fabric path to Three.js shape
        const shape = new THREE.Shape();
        
        path.forEach((point) => {
          if (point[0] === 'M') {
            shape.moveTo(point[1] - allObjectsBounds.left, point[2] - allObjectsBounds.top);
          } else if (point[0] === 'L') {
            shape.lineTo(point[1] - allObjectsBounds.left, point[2] - allObjectsBounds.top);
          } else if (point[0] === 'Q') {
            shape.quadraticCurveTo(
              point[1] - allObjectsBounds.left, 
              point[2] - allObjectsBounds.top, 
              point[3] - allObjectsBounds.left, 
              point[4] - allObjectsBounds.top
            );
          } else if (point[0] === 'C') {
            shape.bezierCurveTo(
              point[1] - allObjectsBounds.left, 
              point[2] - allObjectsBounds.top, 
              point[3] - allObjectsBounds.left, 
              point[4] - allObjectsBounds.top, 
              point[5] - allObjectsBounds.left, 
              point[6] - allObjectsBounds.top
            );
          }
        });
        
        // Close the shape
        shape.autoClose = true;
        
        // For the first path, use it as the base
        if (isFirstPath) {
          compoundShape.curves = shape.curves;
          isFirstPath = false;
        } else {
          // For subsequent paths, you could decide how to combine them
          // This is a simplified approach - in a real app, you might
          // want more sophisticated boolean operations
          compoundShape.holes.push(shape);
        }
      });
      
      // Extrude the compound shape
      const extrudeSettings = {
        steps: 1,
        depth: 20,
        bevelEnabled: true,
        bevelThickness: 2,
        bevelSize: 2,
        bevelSegments: 3
      };
      
      const geometry = new THREE.ExtrudeGeometry(compoundShape, extrudeSettings);
      geometry.center(); // Center the geometry
      
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(Math.random(), Math.random(), Math.random()),
        specular: 0x111111,
        shininess: 30
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(1, -1, 1); // Flip y-axis to match canvas coordinates
      scene.add(mesh);

      // Add lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      const pointLight = new THREE.PointLight(0xffffff, 1);
      pointLight.position.set(10, 10, 10);
      scene.add(pointLight);

      // Position camera to see the 3D model clearly
      camera.position.z = 300;
      
      // Add OrbitControls for interaction
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;

      // Add a placeholder object to the fabric canvas
      const placeholder = new fabric.Rect({
        left: allObjectsBounds.left + allObjectsBounds.width + 350, // Position after the 2D improved version
        top: allObjectsBounds.top,
        width: 300,
        height: 300,
        fill: 'rgba(200,200,200,0.1)',
        stroke: '#aaa',
        strokeDashArray: [5, 5],
        selectable: true,
        hasControls: true,
      }) as FabricThreeObject;

      // Store reference to the Three.js elements
      placeholder.threeElement = threeContainer;
      placeholder.model3d = {
        scene,
        camera,
        renderer,
        controls,
        animate: function() {
          controls.update();
          renderer.render(scene, camera);
        }
      };

      // Set up dragging behavior for the container
      let isDragging = false;
      let dragOffsetX = 0;
      let dragOffsetY = 0;
      
      // Replace the complex dragging system with a simpler approach
      // that clearly separates the drag handle from the 3D view
      
      // Set up dragging behavior using the handle
      dragHandle.onmousedown = (e: MouseEvent) => {
        isDragging = true;
        const rect = threeContainer.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        e.preventDefault();
        e.stopPropagation();
        
        // Always disable OrbitControls when dragging the handle
        if (placeholder.model3d?.controls) {
          placeholder.model3d.controls.enabled = false;
        }
      };
      
      const onMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          threeContainer.style.left = `${e.clientX - dragOffsetX}px`;
          threeContainer.style.top = `${e.clientY - dragOffsetY}px`;
          
          // Update the placeholder on the canvas
          if (placeholder) {
            const left = e.clientX - dragOffsetX;
            const top = e.clientY - dragOffsetY;
            
            // Convert window coordinates to canvas coordinates
            if (fabricCanvas) {
              const offset = fabricCanvas.calcOffset();
              placeholder.set({
                left: left - offset.left,
                top: top - offset.top
              });
              fabricCanvas.renderAll();
            }
          }
        }
      };
      
      const onMouseUp = () => {
        isDragging = false;
        
        // Re-enable OrbitControls after dragging is done
        if (placeholder.model3d && placeholder.model3d.controls) {
          placeholder.model3d.controls.enabled = true;
        }
      };
      
      // Use the document for mouse events for better capture
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      
      // Store cleanup function
      (threeContainer as ExtendedHTMLDivElement)._dragCleanupFn = () => {
        dragHandle.onmousedown = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      // Add the placeholder to the canvas
      fabricCanvas.add(placeholder);
      fabricCanvas.renderAll();

      // Event handlers for the three container
      threeContainer.addEventListener('mouseenter', () => {
        setActiveThreeElement(threeContainer);
        // Only disable drawing mode when in drawing mode
        if (fabricCanvas && fabricCanvas.isDrawingMode && drawingMode) {
          fabricCanvas.isDrawingMode = false;
        }
      });

      threeContainer.addEventListener('mouseleave', () => {
        setActiveThreeElement(null);
        // Only re-enable drawing mode when in drawing mode
        if (fabricCanvas && drawingMode) {
          fabricCanvas.isDrawingMode = true;
        }
      });

      // Update Three.js container position when the placeholder moves
      placeholder.on('moving', function() {
        updateThreePosition(placeholder);
      });

      placeholder.on('scaling', function() {
        updateThreePosition(placeholder);
      });

      // Set initial position
      updateThreePosition(placeholder);

      // Start animation
      const animate = function() {
        const id = requestAnimationFrame(animate);
        setAnimationFrames(prev => [...prev, id]);
        
        if (placeholder.model3d) {
          placeholder.model3d.animate();
        }
      };
      animate();
    } else {
      alert('Canvas not initialized!');
    }
  };

  // Update the Three.js container position to match the fabric object
  const updateThreePosition = (obj: FabricThreeObject): void => {
    if (obj.threeElement && fabricCanvas) {
      const bounds = obj.getBoundingRect();
      const offset = fabricCanvas.calcOffset();
      
      obj.threeElement.style.left = `${bounds.left + offset.left}px`;
      obj.threeElement.style.top = `${bounds.top + offset.top}px`;
      obj.threeElement.style.width = `${bounds.width}px`;
      obj.threeElement.style.height = `${bounds.height}px`;
      
      // Update renderer size
      if (obj.model3d) {
        obj.model3d.renderer.setSize(bounds.width, bounds.height);
        obj.model3d.camera.aspect = bounds.width / bounds.height;
        obj.model3d.camera.updateProjectionMatrix();
      }
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="toolbar">
        <div className="flex items-center gap-4 mr-8 border-r border-gray-300 pr-8">
          <img src="/bender/small.jpg" alt="Bender" className="h-10 w-auto object-contain" title="Bender - Take the L" />
        </div>
        <button
          className={`flex items-center gap-2 ${drawingMode ? 'active' : ''}`}
          onClick={toggleDrawingMode}
          title="Toggle Drawing Mode"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
            <path d="M2 2l7.586 7.586"></path>
            <circle cx="11" cy="11" r="2"></circle>
          </svg>
          Draw
        </button>
        
        <button
          onClick={addText}
          title="Add Text"
          className="flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V4h16v3"></path>
            <path d="M9 20h6"></path>
            <path d="M12 4v16"></path>
          </svg>
          Text
        </button>

        <button
          onClick={convertTo2D}
          title="Convert to 2D"
          className="flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
            <path d="M3 12h18"></path>
          </svg>
          2D
        </button>

        <button
          onClick={convertTo3D}
          title="Convert to 3D"
          className="flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"></path>
            <path d="M12 12l8-4.5"></path>
            <path d="M12 12v9"></path>
            <path d="M12 12L4 7.5"></path>
          </svg>
          3D
        </button>

        <div className="flex-grow"></div>

        <button
          onClick={clearCanvas}
          title="Clear Canvas"
          className="flex items-center gap-2 bg-error text-white hover:bg-error/90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
          Clear
        </button>
      </div>

      <div ref={containerRef} className="relative flex-grow canvas-container">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
} 