import React, { useEffect, useState } from "react";
import styles from "../src/styles/EditProfileModal.module.css";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: { name: string; email: string; phone: string; location: string };
  onSave: (data: { name: string; email: string; phone: string; location: string }) => void;
  loading: boolean;
}

export default function EditProfileModal({
  open,
  onClose,
  user,
  onSave,
  loading,
}: EditProfileModalProps) {
  const [form, setForm] = useState(user);

  useEffect(() => {
    setForm(user);
  }, [user, open]);

  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Edit Profile</h2>
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave(form);
          }}
        >
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </label>
          <label>
            Phone
            <input
              type="text"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label>
            Location
            <input
              type="text"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            />
          </label>
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}