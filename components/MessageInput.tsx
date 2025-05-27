import React, { FormEvent } from "react";
import styles from "../src/styles/Inbox.module.css";

interface MessageInputProps {
  messageInput: string;
  setMessageInput: (val: string) => void;
  sending: boolean;
  onSend: (e: FormEvent) => void;
}

export default function MessageInput({
  messageInput,
  setMessageInput,
  sending,
  onSend,
}: MessageInputProps) {
  return (
    <form className={styles.messageInputForm} onSubmit={onSend}>
      <input
        type="text"
        className={styles.messageInput}
        placeholder="Type a message..."
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        disabled={sending}
      />
      <button
        type="submit"
        className={styles.sendButton}
        disabled={sending || !messageInput.trim()}
      >
        Send
      </button>
    </form>
  );
}