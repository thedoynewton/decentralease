import React from "react";

interface CollectAllFundsButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function CollectAllFundsButton({ onClick, disabled }: CollectAllFundsButtonProps) {
  return (
    <button
      style={{
        background: "#059669",
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
      Collect All Funds
    </button>
  );
}