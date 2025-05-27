import React, { RefObject, useState } from "react";
import styles from "../src/styles/MessageList.module.css";

interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  image_url?: string | null;
}

interface MessageListProps {
  messages: Message[];
  address: string | undefined;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  timeAgo: (dateString?: string) => string;
}

export default function MessageList({
  messages,
  address,
  messagesEndRef,
  timeAgo,
}: MessageListProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <div className={styles.messagesList}>
      {messages.length === 0 && (
        <div className={styles.messagesPlaceholder}>
          <p>No messages yet.</p>
        </div>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={
            msg.sender_id === address
              ? styles.messageSent
              : styles.messageReceived
          }
        >
          {/* Show image if image_url exists */}
          {msg.image_url && (
            <>
              <img
                src={msg.image_url}
                alt="chat"
                style={{
                  maxWidth: 180,
                  maxHeight: 180,
                  borderRadius: 8,
                  marginBottom: msg.content ? 4 : 0,
                  display: "block",
                  cursor: "pointer",
                }}
                onClick={() => setPreviewUrl(msg.image_url || null)}
              />
            </>
          )}
          {/* Show text if content exists */}
          {msg.content && <span>{msg.content}</span>}
          <div className={styles.messageTime}>{timeAgo(msg.created_at)}</div>
        </div>
      ))}
      <div ref={messagesEndRef} />

      {/* Image preview modal */}
      {previewUrl && (
        <div
          className={styles.imagePreviewOverlay}
          onClick={() => setPreviewUrl(null)}
        >
          <div className={styles.imagePreviewContent}>
            <img src={previewUrl} alt="preview" />
          </div>
        </div>
      )}
    </div>
  );
}