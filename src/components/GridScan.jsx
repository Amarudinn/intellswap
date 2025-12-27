import { useEffect, useRef } from 'react';
import './GridScan.css';

const GridScan = ({
  sensitivity = 0.55,
  lineThickness = 1,
  linesColor = '#69d169',
  gridScale = 0.1,
  scanColor = '#69d169',
  scanOpacity = 0.4,
  className = '',
  style = {}
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 105, g: 209, b: 105 };
    };

    const lineColor = hexToRgb(linesColor);
    const scanColorRgb = hexToRgb(scanColor);

    const draw = () => {
      time += 0.016;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      const gridSize = canvas.height * gridScale;
      const cols = Math.ceil(canvas.width / gridSize);
      const rows = Math.ceil(canvas.height / gridSize);

      ctx.strokeStyle = `rgba(${lineColor.r}, ${lineColor.g}, ${lineColor.b}, 0.3)`;
      ctx.lineWidth = lineThickness;

      // Vertical lines
      for (let i = 0; i <= cols; i++) {
        const x = i * gridSize;
        const offset = Math.sin(time + i * 0.1) * 2;
        ctx.beginPath();
        ctx.moveTo(x + offset, 0);
        ctx.lineTo(x + offset, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let i = 0; i <= rows; i++) {
        const y = i * gridSize;
        const offset = Math.cos(time + i * 0.1) * 2;
        ctx.beginPath();
        ctx.moveTo(0, y + offset);
        ctx.lineTo(canvas.width, y + offset);
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height
      };
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [sensitivity, lineThickness, linesColor, gridScale, scanColor, scanOpacity]);

  return (
    <div className={`gridscan ${className}`} style={style}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
};

export default GridScan;
