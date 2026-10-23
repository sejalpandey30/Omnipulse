import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { tvAudio } from '../utils/sound';
import { appLogger } from '../core/logger';

export interface FocusableNode {
  id: string;
  element: HTMLElement;
  onSelect?: () => void;
  priority?: number;
  scope?: string; // modal or overlay trap scope
}

interface RectCacheEntry {
  rect: DOMRect;
  center: { x: number; y: number };
}

interface SpatialNavigationContextType {
  activeId: string | null;
  register: (id: string, element: HTMLElement, onSelect?: () => void, priority?: number, scope?: string) => void;
  unregister: (id: string) => void;
  focusId: (id: string) => void;
  currentDirection: string | null;
  activeScope: string | null;
  setActiveScope: (scope: string | null) => void;
  pushBackHandler: (handler: () => boolean | void) => () => void;
  saveScreenFocus: (screenKey: string, id: string) => void;
  getScreenFocus: (screenKey: string) => string | undefined;
}

const SpatialNavigationContext = createContext<SpatialNavigationContextType | null>(null);

export const SpatialNavigationProvider: React.FC<{
  children: React.ReactNode;
  defaultFocusId?: string;
}> = ({ children, defaultFocusId }) => {
  const [activeId, setActiveId] = useState<string | null>(defaultFocusId || null);
  const [currentDirection, setCurrentDirection] = useState<string | null>(null);
  const [activeScope, setActiveScope] = useState<string | null>(null);

  const registry = useRef<Map<string, FocusableNode>>(new Map());
  const rectCache = useRef<Map<string, RectCacheEntry>>(new Map());
  const lastCacheTime = useRef<number>(0);

  // Focus restore stack (for modals/dialogs)
  const focusHistoryStack = useRef<string[]>([]);
  // Screen-level remembered focus
  const screenFocusMap = useRef<Map<string, string>>(new Map());
  // Back button LIFO handler stack
  const backHandlerStack = useRef<Array<() => boolean | void>>([]);

  // Invalidate geometry cache on window resize or scroll
  const invalidateRectCache = useCallback(() => {
    rectCache.current.clear();
    lastCacheTime.current = 0;
  }, []);

  useEffect(() => {
    window.addEventListener('resize', invalidateRectCache, { passive: true });
    window.addEventListener('scroll', invalidateRectCache, { passive: true });
    return () => {
      window.removeEventListener('resize', invalidateRectCache);
      window.removeEventListener('scroll', invalidateRectCache);
    };
  }, [invalidateRectCache]);

  const pushBackHandler = useCallback((handler: () => boolean | void) => {
    backHandlerStack.current.push(handler);
    return () => {
      const idx = backHandlerStack.current.lastIndexOf(handler);
      if (idx !== -1) {
        backHandlerStack.current.splice(idx, 1);
      }
    };
  }, []);

  const saveScreenFocus = useCallback((screenKey: string, id: string) => {
    screenFocusMap.current.set(screenKey, id);
  }, []);

  const getScreenFocus = useCallback((screenKey: string) => {
    return screenFocusMap.current.get(screenKey);
  }, []);

  const getCachedRect = useCallback((node: FocusableNode): RectCacheEntry | null => {
    const now = Date.now();
    // Cache for 250ms unless invalidated
    if (now - lastCacheTime.current > 250) {
      rectCache.current.clear();
      lastCacheTime.current = now;
    }

    const cached = rectCache.current.get(node.id);
    if (cached) return cached;

    if (!node.element || !node.element.isConnected) return null;
    const rect = node.element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const entry: RectCacheEntry = {
      rect,
      center: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      },
    };
    rectCache.current.set(node.id, entry);
    return entry;
  }, []);

  const register = useCallback(
    (id: string, element: HTMLElement, onSelect?: () => void, priority = 0, scope?: string) => {
      registry.current.set(id, { id, element, onSelect, priority, scope });

      setActiveId((prev) => {
        if (!prev) return id;
        if (defaultFocusId && id === defaultFocusId) return id;
        return prev;
      });
    },
    [defaultFocusId]
  );

  const unregister = useCallback((id: string) => {
    registry.current.delete(id);
    rectCache.current.delete(id);

    setActiveId((prev) => {
      if (prev === id) {
        // First try to restore previous focus from history stack if element still exists
        while (focusHistoryStack.current.length > 0) {
          const candidateId = focusHistoryStack.current.pop();
          if (candidateId && registry.current.has(candidateId)) {
            return candidateId;
          }
        }

        // Otherwise find first eligible node in current activeScope (or any node if no scope)
        const entries = Array.from(registry.current.values());
        const eligible = entries.filter((n) => !activeScope || n.scope === activeScope);
        return eligible.length > 0 ? eligible[0].id : null;
      }
      return prev;
    });
  }, [activeScope]);

  const focusId = useCallback((id: string) => {
    if (registry.current.has(id)) {
      setActiveId((prev) => {
        if (prev && prev !== id) {
          focusHistoryStack.current.push(prev);
          if (focusHistoryStack.current.length > 15) {
            focusHistoryStack.current.shift();
          }
        }
        return id;
      });

      tvAudio.playFocus();
      const node = registry.current.get(id);
      node?.element?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, []);

  // 2D Geometric Spatial Direction Finder with Direction-Weighted Scoring
  const navigateDirection = useCallback(
    (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (!activeId || registry.current.size <= 1) return;

      const current = registry.current.get(activeId);
      if (!current) return;

      const currentGeometry = getCachedRect(current);
      if (!currentGeometry) return;

      let bestCandidate: FocusableNode | null = null;
      let shortestDistance = Infinity;

      for (const candidate of registry.current.values()) {
        if (candidate.id === activeId || !candidate.element) continue;

        // Scope filter: If inside an active modal trap scope, only navigate within that scope
        if (activeScope && candidate.scope !== activeScope) continue;
        if (!activeScope && candidate.scope) continue; // don't jump into unactive scopes

        const targetGeometry = getCachedRect(candidate);
        if (!targetGeometry) continue;

        const dx = targetGeometry.center.x - currentGeometry.center.x;
        const dy = targetGeometry.center.y - currentGeometry.center.y;

        let isEligible = false;
        let primaryDiff = 0;
        let secondaryDiff = 0;

        if (direction === 'RIGHT' && dx > 8) {
          isEligible = true;
          primaryDiff = dx;
          secondaryDiff = Math.abs(dy);
        } else if (direction === 'LEFT' && dx < -8) {
          isEligible = true;
          primaryDiff = Math.abs(dx);
          secondaryDiff = Math.abs(dy);
        } else if (direction === 'DOWN' && dy > 8) {
          isEligible = true;
          primaryDiff = dy;
          secondaryDiff = Math.abs(dx);
        } else if (direction === 'UP' && dy < -8) {
          isEligible = true;
          primaryDiff = Math.abs(dy);
          secondaryDiff = Math.abs(dx);
        }

        if (isEligible) {
          // Penalize off-axis candidates by 3.2x to keep strict alignment along rails and grids
          const score = primaryDiff + secondaryDiff * 3.2 - (candidate.priority || 0) * 10;
          if (score < shortestDistance) {
            shortestDistance = score;
            bestCandidate = candidate;
          }
        }
      }

      if (bestCandidate) {
        focusId(bestCandidate.id);
        setCurrentDirection(direction);
      }
    },
    [activeId, activeScope, focusId, getCachedRect]
  );

  // Key repeat and debounce state
  const lastKeyTime = useRef<number>(0);
  const repeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentKey = useRef<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept inputs inside text input / textarea elements
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      const now = Date.now();
      // Debounce duplicate key events fired within 50ms
      if (currentKey.current === e.key && now - lastKeyTime.current < 50) {
        return;
      }
      lastKeyTime.current = now;

      // Handle Back / Escape LIFO Stack
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'BrowserBack') {
        if (backHandlerStack.current.length > 0) {
          const handler = backHandlerStack.current[backHandlerStack.current.length - 1];
          const handled = handler();
          if (handled !== false) {
            e.preventDefault();
            tvAudio.playSelect();
            return;
          }
        }
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();

        // Direction mapping
        let dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null = null;
        if (e.key === 'ArrowUp') dir = 'UP';
        if (e.key === 'ArrowDown') dir = 'DOWN';
        if (e.key === 'ArrowLeft') dir = 'LEFT';
        if (e.key === 'ArrowRight') dir = 'RIGHT';

        if (dir) {
          navigateDirection(dir);

          // Setup long-press key repeat with acceleration
          if (currentKey.current !== e.key) {
            currentKey.current = e.key;
            if (repeatTimer.current) clearTimeout(repeatTimer.current);
            if (repeatInterval.current) clearInterval(repeatInterval.current);

            repeatTimer.current = setTimeout(() => {
              let delay = 180;
              repeatInterval.current = setInterval(() => {
                if (dir) navigateDirection(dir);
                // Accelerate repeat speed
                delay = Math.max(90, delay - 15);
              }, delay);
            }, 320);
          }
        } else if (e.key === 'Enter' || e.key === ' ') {
          if (activeId && registry.current.has(activeId)) {
            const current = registry.current.get(activeId);
            tvAudio.playSelect();
            current?.onSelect?.();
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (currentKey.current === e.key) {
          currentKey.current = null;
          if (repeatTimer.current) clearTimeout(repeatTimer.current);
          if (repeatInterval.current) clearInterval(repeatInterval.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (repeatTimer.current) clearTimeout(repeatTimer.current);
      if (repeatInterval.current) clearInterval(repeatInterval.current);
    };
  }, [activeId, navigateDirection]);

  const value = useMemo(
    () => ({
      activeId,
      register,
      unregister,
      focusId,
      currentDirection,
      activeScope,
      setActiveScope,
      pushBackHandler,
      saveScreenFocus,
      getScreenFocus,
    }),
    [
      activeId,
      register,
      unregister,
      focusId,
      currentDirection,
      activeScope,
      setActiveScope,
      pushBackHandler,
      saveScreenFocus,
      getScreenFocus,
    ]
  );

  return <SpatialNavigationContext.Provider value={value}>{children}</SpatialNavigationContext.Provider>;
};

export const useSpatialNavigation = () => {
  const context = useContext(SpatialNavigationContext);
  if (!context) {
    throw new Error('useSpatialNavigation must be used within a SpatialNavigationProvider');
  }
  return context;
};
