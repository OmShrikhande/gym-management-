import { useEffect, useRef } from 'react';

/**
 * Futuristic particle background with connected threads (blue/pink)
 * - Lightweight, no external deps
 * - Responsive particle count
 * - HiDPI aware
 * - Pointer-events: none (non-interactive)
 */
const ParticlesBackground = () => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particlesRef = useRef([]);
  const ctxRef = useRef(null);
  const dpiRef = useRef(1);
  const mouseRef = useRef({ x: null, y: null, active: false });

  // Utility: random float range
  const rand = (min, max) => Math.random() * (max - min) + min;

  const createParticles = (width, height) => {
    const isMobile = width < 768;
    const count = isMobile ? 35 : 80; // increased density
    const maxSpeed = isMobile ? 0.005 : 0.005;

    const particles = new Array(count).fill(0).map(() => {
      const colorPick = Math.random() < 0.5 ? 'blue' : 'pink';
      const color = colorPick === 'blue' ? 'rgba(96,165,250,' : 'rgba(244,114,182,'; // sky-400 and pink-400
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: rand(-maxSpeed, maxSpeed),
        vy: rand(-maxSpeed, maxSpeed),
        r: rand(1.0, 2.0),
        colorBase: color,
      };
    });

    particlesRef.current = particles;
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { innerWidth: width, innerHeight: height, devicePixelRatio } = window;
    const dpi = Math.min(2, devicePixelRatio || 1); // cap DPI for perf
    dpiRef.current = dpi;

    canvas.width = Math.floor(width * dpi);
    canvas.height = Math.floor(height * dpi);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
    ctxRef.current = ctx;

    createParticles(width, height);
  };

  const step = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const width = canvas.width / dpiRef.current;
    const height = canvas.height / dpiRef.current;

    ctx.clearRect(0, 0, width, height);

    const particles = particlesRef.current;
    const connectDist = Math.min(width, height) < 700 ? 120 : 160; // stronger network reach
    const mouse = mouseRef.current;

    // Move and draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      // Bounce from edges
      if (p.x <= 0 || p.x >= width) p.vx *= -1;
      if (p.y <= 0 || p.y >= height) p.vy *= -1;

      // Soft attraction towards mouse when nearby
      if (mouse.active && mouse.x != null) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist2 = dx * dx + dy * dy;
        const radius = 160; // influence radius
        if (dist2 < radius * radius) {
          const force = 0.0009; // subtle
          p.vx += dx * force;
          p.vy += dy * force;
        }
      }

      // Draw dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `${p.colorBase} 1)`; // stronger node
      ctx.fill();
    }

    // Draw connections (threads)
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        // Only if close enough
        if (d2 < connectDist * connectDist) {
          const d = Math.sqrt(d2);
          const alpha = 1 - d / connectDist; // fade with distance
          // Blend color: use average of the two node base colors by picking stronger alpha
          ctx.strokeStyle = alpha > 0.6
            ? 'rgba(96,165,250,0.55)'
            : 'rgba(244,114,182,0.48)';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    resizeCanvas();
    rafRef.current = requestAnimationFrame(step);

    const handleResize = () => {
      resizeCanvas();
    };

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 1, // stronger visibility
      }}
    />
  );
};

export default ParticlesBackground;