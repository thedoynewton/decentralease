import React, { RefObject } from "react";
import styles from "../src/styles/Inbox.module.css";

interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  created_at: string;
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
          <span>{msg.content}</span>
          <div className={styles.messageTime}>{timeAgo(msg.created_at)}</div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}