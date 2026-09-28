'use client';

import { useState } from 'react';
import styles from './Auth.module.css';

export default function AuthField({ id, label, value, onChange, error, hint, type = 'text', autoComplete, placeholder, aside }) {
  const [visible, setVisible] = useState(false);
  const password = type === 'password';
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      <div className={styles.fieldTop}>
        <label className={styles.label} htmlFor={id}>{label}</label>
        {aside}
      </div>
      <div className={styles.inputWrap}>
        <input id={id} name={id} type={password && visible ? 'text' : type} value={value}
          onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete}
          placeholder={placeholder} aria-invalid={!!error} aria-describedby={describedBy}
          className={`${styles.input} ${password ? styles.withToggle : ''} ${error ? styles.inputError : ''}`} />
        {password && <button type="button" className={styles.toggle} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)}>
          <span className="material-symbols-outlined" aria-hidden="true">{visible ? 'visibility_off' : 'visibility'}</span>
        </button>}
      </div>
      {hint && <p id={`${id}-hint`} className={styles.hint}>{hint}</p>}
      {error && <p id={`${id}-error`} className={styles.error}>{error}</p>}
    </div>
  );
}
