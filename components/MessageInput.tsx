import React, { FormEvent, useRef, useState } from "react";
import styles from "../src/styles/MessageInput.module.css";
import { supabase } from "../supabase/supabase-client";

interface MessageInputProps {
  messageInput: string;
  setMessageInput: (val: string) => void;
  sending: boolean;
  onSend: (e: FormEvent, imageUrl?: string) => void;
}

export default function MessageInput({
  messageInput,
  setMessageInput,
  sending,
  onSend,
}: MessageInputProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from("chat-images")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });
    setUploading(false);
    if (error) {
      alert("Image upload failed!");
      return;
    }
    const { data: publicUrlData } = supabase.storage
      .from("chat-images")
      .getPublicUrl(fileName);
    if (publicUrlData?.publicUrl) {
      onSend(
        // create a fake event to prevent default form submission
        { preventDefault: () => {} } as any,
        publicUrlData.publicUrl
      );
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <form className={styles.messageInputForm} onSubmit={onSend}>
      <input
        type="text"
        className={styles.messageInput}
        placeholder="Type a message..."
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        disabled={sending || uploading}
      />
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={sending || uploading}
      />
      <button
        type="button"
        className={styles.sendButton}
        onClick={() => fileInputRef.current?.click()}
        disabled={sending || uploading}
        title="Upload Image"
      >
        📷
      </button>
      <button
        type="submit"
        className={styles.sendButton}
        disabled={sending || !messageInput.trim() || uploading}
      >
        Send
      </button>
    </form>
  );
}