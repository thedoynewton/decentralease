import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { Send } from '@deemlol/next-icons';
import Layout from '../../../components/Layout';
import styles from '../../styles/LessorInbox.module.css';
import { supabase } from '../../../supabase/supabase-client';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  sender?: { name: string };
  receiver?: { name: string };
}

interface Conversation {
  id: string;
  user_id: string;
  user: {
    name: string;
    wallet_address: string;
  };
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  listing_title: string;
}

function timeAgo(date: string) {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  let interval = seconds / 31536000;

  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  return Math.floor(seconds) + ' seconds ago';
}

export default function LessorInbox() {
  const { address, isConnected } = useAccount();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchConversations() {
      if (!isConnected || !address) return;

      try {
        setLoading(true);
        setError(null);

        // Get user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('wallet_address', address.toLowerCase())
          .single();

        if (userError) throw userError;
        if (!userData) throw new Error('User not found');

        // Fetch conversations for lessor
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select(`
            id,
            user_id,
            user:users!conversations_user_id_fkey (
              name,
              wallet_address
            ),
            last_message,
            last_message_time,
            unread_count,
            listing:listings(title)
          `)
          .eq('lessor_id', userData.id) // Filter by lessor_id
          .order('last_message_time', { ascending: false });

        if (conversationsError) throw conversationsError;
        
        // Transform the data to match the Conversation interface
        const typedConversations: Conversation[] = (conversationsData || []).map(conv => ({
          id: conv.id,
          user_id: conv.user_id,
          user: {
            name: conv.user[0]?.name || 'Unknown User',
            wallet_address: conv.user[0]?.wallet_address || '',
          },
          last_message: conv.last_message,
          last_message_time: conv.last_message_time,
          unread_count: conv.unread_count || 0,
          listing_title: conv.listing?.[0]?.title || 'Unknown Listing'
        }));

        setConversations(typedConversations);

        if (typedConversations.length > 0) {
          setSelectedConversation(typedConversations[0]);
        }
      } catch (err: any) {
        console.error('Error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();
  }, [address, isConnected]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  async function fetchMessages(conversationId: string) {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(name),
          receiver:users!messages_receiver_id_fkey(name)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      // Mark messages as read
      if (messagesData && messagesData.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .eq('receiver_id', address?.toLowerCase());
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err.message);
      setError(err.message);
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !address) return;

    try {
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: selectedConversation.id,
            sender_id: address.toLowerCase(),
            receiver_id: selectedConversation.user.wallet_address,
            content: newMessage.trim(),
          },
        ])
        .select()
        .single();

      if (messageError) throw messageError;

      // Update conversations list
      setConversations(prevConversations =>
        prevConversations.map(conv =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                last_message: newMessage.trim(),
                last_message_time: new Date().toISOString(),
              }
            : conv
        )
      );

      // Update messages list
      if (messageData) {
        setMessages(prevMessages => [...prevMessages, messageData]);
      }

      setNewMessage('');
    } catch (err: any) {
      console.error('Error sending message:', err.message);
      setError(err.message);
    }
  };

  const filteredConversations = conversations.filter(conversation =>
    conversation.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className={styles.loading}>Loading conversations...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className={styles.error}>{error}</div>
      </Layout>
    );
  }

  if (!isConnected) {
    return (
      <Layout>
        <div className={styles.error}>Please connect your wallet to view messages.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.sidebar}>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.conversationList}>
            {filteredConversations.length === 0 ? (
              <div className={styles.empty}>No conversations found.</div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`${styles.conversationItem} ${
                    selectedConversation?.id === conversation.id ? styles.active : ''
                  } ${conversation.unread_count > 0 ? styles.unread : ''}`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className={styles.conversationHeader}>
                    <span className={styles.userName}>{conversation.user.name}</span>
                    <span className={styles.listingTitle}>{conversation.listing_title}</span>
                    {conversation.last_message_time && (
                      <span className={styles.timestamp}>
                        {timeAgo(conversation.last_message_time)}
                      </span>
                    )}
                  </div>
                  {conversation.last_message && (
                    <div className={styles.lastMessage}>{conversation.last_message}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.chatContainer}>
          {selectedConversation ? (
            <>
              <div className={styles.chatHeader}>
                <div className={styles.chatStatus} />
                <span className={styles.chatUserName}>{selectedConversation.user.name}</span>
              </div>

              <div className={styles.messageList}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${styles.message} ${
                      message.sender_id === address?.toLowerCase()
                        ? styles.sent
                        : styles.received
                    }`}
                  >
                    {message.content}
                    <div className={styles.messageTime}>
                      {timeAgo(message.created_at)}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className={styles.inputContainer}>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className={styles.messageInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  className={styles.sendButton}
                  disabled={!newMessage.trim()}
                >
                  <Send />
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className={styles.empty}>Select a conversation to start messaging.</div>
          )}
        </div>
      </div>
    </Layout>
  );
} 