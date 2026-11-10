import React, { useRef, useState } from 'react';

export const SpotlightCard = ({
  children,
  className = "",
  spotlightColor = "rgba(37, 99, 235, 0.08)",
  ...props
}) => {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-3xl border border-white/90 bg-white/85 backdrop-blur-2xl shadow-[0_1px_3px_rgba(15,23,42,0.03),0_12px_32px_-4px_rgba(15,23,42,0.05),inset_0_1px_1.5px_0_rgba(255,255,255,0.95)] transition-all duration-300 ease-out hover:border-slate-300/80 hover:shadow-[0_16px_40px_-6px_rgba(15,23,42,0.08),inset_0_1px_2px_0_rgba(255,255,255,1)] ${className}`}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Layer */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 ease-in-out"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 75%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default SpotlightCard;
