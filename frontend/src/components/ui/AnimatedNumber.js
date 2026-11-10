import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs';

export const AnimatedNumber = ({ value = 0, duration = 800, decimals = 0, suffix = "" }) => {
  const spanRef = useRef(null);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const obj = { val: prevValueRef.current };

    if (typeof animate === 'function') {
      try {
        const anim = animate(obj, {
          val: target,
          duration: duration,
          ease: 'outExpo',
          onUpdate: () => {
            if (spanRef.current) {
              const formatted = decimals > 0 ? obj.val.toFixed(decimals) : Math.round(obj.val);
              spanRef.current.innerText = `${formatted}${suffix}`;
            }
          },
          onComplete: () => {
            prevValueRef.current = target;
          }
        });
        return () => {
          if (anim && typeof anim.pause === 'function') anim.pause();
        };
      } catch (e) {
        if (spanRef.current) {
          spanRef.current.innerText = `${target.toFixed(decimals)}${suffix}`;
        }
      }
    } else {
      if (spanRef.current) {
        spanRef.current.innerText = `${target.toFixed(decimals)}${suffix}`;
      }
    }
  }, [value, duration, decimals, suffix]);

  return <span ref={spanRef}>{Number(value || 0).toFixed(decimals)}{suffix}</span>;
};

export default AnimatedNumber;
