import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';

interface CanvasProps {
  onConvertTo2D: (canvas: fabric.Canvas) => void;
  onConvertTo3D: (canvas: fabric.Canvas) => void;
}

export default function Canvas({ onConvertTo2D, onConvertTo3D }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [drawingMode, setDrawingMode] = useState<boolean>(false);
  
  useEffect(() => {
    if (canvasRef.current && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      // Set canvas size to fit container with some padding
      const canvasWidth = Math.min(containerWidth - 20, 600);
      const canvasHeight = Math.min(containerHeight - 60, 500); // Leave space for buttons
      
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: '#f5f5f5',
        isDrawingMode: drawingMode,
      });
      
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }
      
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = 3;
        canvas.freeDrawingBrush.color = '#000000';
      }
      
      setFabricCanvas(canvas);
      
      // Handle window resize
      const handleResize = () => {
        if (containerRef.current) {
          const newWidth = Math.min(containerRef.current.clientWidth - 20, 600);
          const newHeight = Math.min(containerRef.current.clientHeight - 60, 500);
          canvas.setWidth(newWidth);
          canvas.setHeight(newHeight);
          canvas.renderAll();
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        canvas.dispose();
      };
    }
  }, []);
  
  useEffect(() => {
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = drawingMode;
      
      // Ensure the brush is initialized when switching to drawing mode
      if (drawingMode && !fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
        fabricCanvas.freeDrawingBrush.width = 3;
        fabricCanvas.freeDrawingBrush.color = '#000000';
      }
    }
  }, [drawingMode, fabricCanvas]);
  
  const toggleDrawingMode = () => {
    setDrawingMode(!drawingMode);
  };
  
  const addText = () => {
    if (fabricCanvas) {
      const text = new fabric.IText('Text', {
        left: 100,
        top: 100,
        fontFamily: 'Arial',
        fontSize: 20,
        fill: '#000000',
      });
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
    }
  };
  
  const clearCanvas = () => {
    if (fabricCanvas) {
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = '#f5f5f5';
      fabricCanvas.renderAll();
    }
  };
  
  const handleConvertTo2D = () => {
    if (fabricCanvas) {
      onConvertTo2D(fabricCanvas);
    }
  };
  
  const handleConvertTo3D = () => {
    if (fabricCanvas) {
      onConvertTo3D(fabricCanvas);
    }
  };
  
  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      <div className="flex flex-wrap gap-1 mb-2">
        <button 
          className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={toggleDrawingMode}
        >
          {drawingMode ? 'Selection' : 'Drawing'}
        </button>
        <button 
          className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={addText}
        >
          Add Text
        </button>
        <button 
          className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          onClick={clearCanvas}
        >
          Clear
        </button>
        <button 
          className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
          onClick={handleConvertTo2D}
        >
          Convert to 2D
        </button>
        <button 
          className="px-2 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
          onClick={handleConvertTo3D}
        >
          Convert to 3D
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
} 