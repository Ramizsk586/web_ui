import { useEffect, useRef } from 'react';

export const DevPerfCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const dataPoints: number[] = Array(50).fill(40);
    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      dataPoints.shift();
      const lastPoint = dataPoints[dataPoints.length - 1];
      const change = (Math.random() - 0.5) * 8;
      const nextPoint = Math.max(10, Math.min(canvas.height - 10, lastPoint + change));
      dataPoints.push(nextPoint);

      // Draw background grid
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += 30) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
      }

      // Draw waveform gradient path
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      const step = canvas.width / (dataPoints.length - 1);
      for (let k = 0; k < dataPoints.length; k++) {
        ctx.lineTo(k * step, canvas.height - dataPoints[k]);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Stroke outer waveform line
      ctx.beginPath();
      for (let k = 0; k < dataPoints.length; k++) {
        const x = k * step;
        const y = canvas.height - dataPoints[k];
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw active pulsate dot at the end
      const lastX = canvas.width;
      const lastY = canvas.height - dataPoints[dataPoints.length - 1];
      ctx.beginPath();
      ctx.arc(lastX - 2, lastY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#60a5fa';
      ctx.fill();

      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block bg-transparent" />;
};
