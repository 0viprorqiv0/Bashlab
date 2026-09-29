'use client';

import { useState } from 'react';
import styles from './Admin.module.css';

export default function ReasonDialog({ title, description, confirmLabel, danger, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!reason.trim()) {
      setError('A reason is required.');
      return;
    }
    setBusy(true);
    setError('');
    const message = await onConfirm(reason.trim());
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <div className={styles.backdrop} role="presentation" onClick={onCancel}>
      <form className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="reason-title"
        onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <h2 id="reason-title">{title}</h2>
        {description && <p>{description}</p>}
        <label className={styles.field}>
          Reason (recorded in the admin log)
          <textarea autoFocus rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        {error && <p className={styles.errorText} role="alert">{error}</p>}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.button} onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="submit" className={danger ? styles.dangerButton : styles.primaryButton} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
