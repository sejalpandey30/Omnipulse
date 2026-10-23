import React, { useEffect, useRef } from 'react';
import { useSpatialNavigation } from '../../hooks/useSpatialNavigation';

interface FocusableProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  onSelect?: () => void;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
  autoFocus?: boolean;
  priority?: number;
  scope?: string;
}

export const Focusable: React.FC<FocusableProps> = ({
  id,
  onSelect,
  className = '',
  activeClassName = 'tv-focused ring-4 ring-tv-accent scale-[1.03] shadow-tv-focus',
  children,
  autoFocus = false,
  priority = 0,
  scope,
  ...rest
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const { activeId, register, unregister, focusId } = useSpatialNavigation();
  const isFocused = activeId === id;

  useEffect(() => {
    if (elementRef.current) {
      register(id, elementRef.current, onSelect, priority, scope);
      if (autoFocus) {
        focusId(id);
      }
    }
    return () => {
      unregister(id);
    };
  }, [id, onSelect, register, unregister, autoFocus, focusId, priority, scope]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    focusId(id);
    if (onSelect) {
      onSelect();
    }
    rest.onClick?.(e);
  };

  return (
    <div
      ref={elementRef}
      id={id}
      tabIndex={-1}
      onClick={handleClick}
      onMouseEnter={() => focusId(id)}
      className={`tv-focusable cursor-pointer select-none rounded-xl ${className} ${
        isFocused ? activeClassName : 'opacity-95'
      }`}
      {...rest}
    >
      {children}
    </div>
  );
};
