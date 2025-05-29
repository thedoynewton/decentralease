import styles from "../src/styles/ConfirmReturnModal.module.css";

interface ConfirmReturnModalProps {
  open: boolean;
  imageUrl: string;
  loading: boolean;
  hasDamage: boolean | null;
  confirmationCount: number;
  isAcknowledge?: boolean;
  onClose: () => void;
  onAction: (hasDamage: boolean) => void;
  onAcknowledge?: () => void;
}

export default function ConfirmReturnModal({
  open,
  imageUrl,
  loading,
  hasDamage,
  confirmationCount,
  isAcknowledge,
  onClose,
  onAction,
  onAcknowledge,
}: ConfirmReturnModalProps) {
  if (!open) return null;
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Proof of Handover</h2>
        <img src={imageUrl} alt="Proof" className={styles.image} />
        <div className={styles.question}>Does the item have any damage?</div>
        {/* Button logic */}
        {confirmationCount === 0 && (
          <div className={styles.buttonGroup}>
            <button
              className={styles.noButton}
              disabled={loading}
              onClick={() => onAction(false)}
            >
              No damage
            </button>
            <button
              className={styles.yesButton}
              disabled={loading}
              onClick={() => onAction(true)}
            >
              Yes, has damage
            </button>
          </div>
        )}
        {confirmationCount === 1 && !isAcknowledge && (
          <div className={styles.buttonGroup}>
            <button
              className={`${styles.noButton} ${
                hasDamage === false ? styles.selected : ""
              }`}
              disabled={loading}
              onClick={() => onAction(false)}
            >
              No damage
            </button>
            <button
              className={`${styles.yesButton} ${
                hasDamage === true ? styles.selected : ""
              }`}
              disabled={loading}
              onClick={() => onAction(true)}
            >
              Yes, has damage
            </button>
            <span className={styles.infoText}>
              You can change your selection until the other party acknowledges.
            </span>
          </div>
        )}
        {confirmationCount === 1 && isAcknowledge && (
          <div className={styles.buttonGroup}>
            <span className={styles.selectedText}>
              Selected: {hasDamage ? "Yes, has damage" : "No damage"}
            </span>
            <button className={styles.acknowledgeButton} disabled>
              Acknowledged
            </button>
          </div>
        )}
        <div>
          <button
            className={styles.cancelButton}
            disabled={loading}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
