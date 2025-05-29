import React from "react";
import styles from "../src/styles/Acknowledgement.module.css";

interface AcknowledgeModalProps {
  open: boolean;
  hasDamage: boolean | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AcknowledgeModal({
  open,
  hasDamage,
  loading,
  onConfirm,
  onCancel,
}: AcknowledgeModalProps) {
  if (!open) return null;
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Acknowledge Return</h2>
        <div className={styles.question}>
          Do you confirm that the returned asset has{" "}
          <b>{hasDamage ? "Damage" : "No damage"}</b>?
        </div>
        <div className={styles.buttonGroup}>
          <button
            className={styles.noButton}
            disabled={loading}
            onClick={onConfirm}
          >
            Confirm
          </button>
          <button
            className={styles.cancelButton}
            disabled={loading}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}