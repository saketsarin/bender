import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';

interface ImprovedCanvasProps {
  originalCanvas: fabric.Canvas | null;
}

export default function ImprovedCanvas({ originalCanvas }: ImprovedCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const improvedCanvasRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (canvasRef.current && containerRef.current && !improvedCanvasRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      // Set canvas size to fit container with some padding
      const canvasWidth = Math.min(containerWidth - 20, 600);
      const canvasHeight = Math.min(containerHeight - 20, 500);
      
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: '#f5f5f5',
        selection: false,
        interactive: false,
      });
      
      improvedCanvasRef.current = canvas;
      
      // Handle window resize
      const handleResize = () => {
        if (containerRef.current && improvedCanvasRef.current) {
          const newWidth = Math.min(containerRef.current.clientWidth - 20, 600);
          const newHeight = Math.min(containerRef.current.clientHeight - 20, 500);
          improvedCanvasRef.current.setWidth(newWidth);
          improvedCanvasRef.current.setHeight(newHeight);
          improvedCanvasRef.current.renderAll();
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        canvas.dispose();
        improvedCanvasRef.current = null;
      };
    }
  }, []);

  useEffect(() => {
    if (originalCanvas && improvedCanvasRef.current) {
      const improvedCanvas = improvedCanvasRef.current;
      improvedCanvas.clear();
      
      // Clone all objects from original canvas
      const objects = originalCanvas.getObjects();
      
      // Process each object to make it "improved"
      objects.forEach(obj => {
        try {
          if (obj.type === 'path') {
            // For free-drawn paths, smooth them out
            const pathObj = obj as fabric.Path;
            
            // Create a new path instead of cloning
            const path = new fabric.Path(pathObj.path, {
              left: pathObj.left,
              top: pathObj.top,
              strokeWidth: 5,
              stroke: getRandomColor(),
              strokeLineCap: 'round',
              strokeLineJoin: 'round',
              fill: '',
            });
            
            improvedCanvas.add(path);
          } else if (obj.type === 'i-text') {
            // For text, make it more stylish
            const textObj = obj as fabric.IText;
            const clonedText = new fabric.IText(textObj.text || '', {
              left: textObj.left,
              top: textObj.top,
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
            
            improvedCanvas.add(clonedText);
          } else {
            // For other objects, create new ones with the same properties
            const objData = obj.toObject();
            const newObj = new fabric.Object(objData);
            newObj.set({
              stroke: getRandomColor(),
              fill: getRandomColor(0.3)
            });
            
            improvedCanvas.add(newObj);
          }
        } catch (error) {
          console.error('Error processing object:', error);
        }
      });
      
      improvedCanvas.renderAll();
    }
  }, [originalCanvas]);
  
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

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <canvas ref={canvasRef} />
    </div>
  );
} 