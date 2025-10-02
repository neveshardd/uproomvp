// Utilitários para otimização de performance
import { useCallback, useMemo, useRef } from 'react';

// Debounce hook
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
};

// Throttle hook
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef<number>(0);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      callback(...args);
    }
  }, [callback, delay]) as T;
};

// Memoização de objetos complexos
export const useStableValue = <T>(value: T): T => {
  return useMemo(() => value, [JSON.stringify(value)]);
};

// Lazy loading de imagens
export const useLazyImage = (src: string, placeholder?: string) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  
  useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    
    img.onerror = () => {
      setIsError(true);
    };
    
    img.src = src;
  }, [src]);
  
  return { imageSrc, isLoaded, isError };
};

// Intersection Observer para lazy loading
export const useIntersectionObserver = (
  callback: () => void,
  options?: IntersectionObserverInit
) => {
  const targetRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback();
        }
      },
      options
    );
    
    observer.observe(target);
    
    return () => {
      observer.unobserve(target);
    };
  }, [callback, options]);
  
  return targetRef;
};

// Virtual scrolling hook
export const useVirtualScroll = (
  items: any[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index,
    }));
  }, [items, itemHeight, containerHeight, scrollTop]);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = Math.floor(scrollTop / itemHeight) * itemHeight;
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
  };
};

// Performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  const renderStart = useRef<number>();
  
  useEffect(() => {
    renderStart.current = performance.now();
  });
  
  useEffect(() => {
    if (renderStart.current) {
      const renderTime = performance.now() - renderStart.current;
      
      if (renderTime > 16) { // Mais de 16ms (60fps)
        console.warn(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
      }
    }
  });
};

// Bundle size optimization
export const preloadComponent = (importFn: () => Promise<any>) => {
  return () => {
    const componentPromise = importFn();
    return componentPromise;
  };
};

// Memory optimization
export const useMemoryOptimization = () => {
  const cleanupFunctions = useRef<(() => void)[]>([]);
  
  const addCleanup = useCallback((fn: () => void) => {
    cleanupFunctions.current.push(fn);
  }, []);
  
  useEffect(() => {
    return () => {
      cleanupFunctions.current.forEach(fn => fn());
      cleanupFunctions.current = [];
    };
  }, []);
  
  return { addCleanup };
};

// Image optimization
export const optimizeImage = (src: string, width?: number, quality?: number): string => {
  const url = new URL(src);
  
  if (width) {
    url.searchParams.set('w', width.toString());
  }
  
  if (quality) {
    url.searchParams.set('q', quality.toString());
  }
  
  return url.toString();
};

// Bundle splitting
export const createAsyncComponent = (importFn: () => Promise<any>) => {
  return React.lazy(importFn);
};
