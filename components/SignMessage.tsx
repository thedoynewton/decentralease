import { useState } from "react";
import { useSignMessage } from "wagmi";
import styles from "../styles/SignMessage.module.css";

export function SignMessage() {
  const [message, setMessage] = useState("Hello from Decentralease!");
  const { data, isPending, isSuccess, signMessage, error } = useSignMessage();

  return (
    <div className={styles.container}>
      <div className={styles.inputRow}>
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Message to sign"
          className={styles.input}
        />
        <button
          onClick={() => signMessage({ message })}
          disabled={isPending}
          className={styles.button}
        >
          {isPending ? "Signing..." : "Sign Message"}
        </button>
      </div>
      {isSuccess && (
        <div className={styles.signature}>
          <strong>Signature:</strong>
          <div>{data}</div>
        </div>
      )}
      {error && (
        <div className={styles.error}>
          Error: {error.message}
        </div>
      )}
    </div>
  );
}