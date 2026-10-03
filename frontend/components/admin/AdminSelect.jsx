'use client';

import { useEffect, useId, useRef, useState } from 'react';
import styles from './AdminSelect.module.css';

/**
 * Shared admin picker. Native selects render an OS-owned light menu in a few
 * browsers, so operations controls use the same accessible, themed menu.
 */
export default function AdminSelect({
  label,
  value,
  options,
  onChange,
  buttonText,
  menuLabel,
  align = 'left',
  className = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();
  const selected = options.find((item) => item.value === value) || options[0];

  useEffect(() => {
    const closeOnOutsidePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const select = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`${styles.root} ${className}`}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={`${label}: ${selected?.label || ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{buttonText || selected?.label}</span>
        <span className={`material-symbols-outlined ${styles.chevron}`} aria-hidden="true">expand_more</span>
      </button>
      {open && (
        <div id={menuId} className={`${styles.menu} ${align === 'right' ? styles.menuRight : ''}`} role="menu" aria-label={menuLabel || label}>
          {options.map((item) => (
            <button
              key={item.value}
              type="button"
              role="menuitemradio"
              aria-checked={item.value === value}
              className={styles.item}
              onClick={() => select(item.value)}
            >
              <span>{item.label}</span>
              {item.value === value && <span className="material-symbols-outlined" aria-hidden="true">check</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
