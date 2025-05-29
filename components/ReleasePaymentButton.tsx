import React from "react";

interface ReleasePaymentButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function ReleasePaymentButton({
  onClick,
  disabled,
}: ReleasePaymentButtonProps) {
  return (
    <button
      style={{
        background: "#43a047",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: "10px 22px",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        marginTop: 12,
      }}
      onClick={onClick}
      disabled={disabled}
    >
      Release Payment
    </button>
  );
}