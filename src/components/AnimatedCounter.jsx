// src/components/AnimatedCounter.jsx
import { useState, useEffect, useRef } from 'react';

const AnimatedCounter = ({ value, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
    const hasSuffix = value.includes('+') || value.includes('x') || value.includes('/');
    const step = numericValue / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += step;
      if (current >= numericValue) {
        setCount(numericValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isVisible, value, duration]);

  const displayValue = isVisible
    ? value.includes('+')
      ? `${Math.floor(count)}+`
      : value.includes('x')
      ? `${count.toFixed(1)}x`
      : value.includes('/')
      ? value
      : `${Math.floor(count)}${suffix}`
    : '0';

  return <span ref={ref}>{displayValue}</span>;
};

export default AnimatedCounter;