"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, ArrowLeft, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useParams } from "next/navigation";

type Message = {
  message_id: string;
  sender_id: string;
  is_self: boolean;
  content: string;
  created_at: string;
  is_read: boolean;
};

type Connection = {
  connection_id: string;
  connected_user_id: string;
  display_name: string;
  bio: string;
  profile_picture_url: string | null;
  connection_status: string;
  is_initiator: boolean;
  created_at: string;
  updated_at: string;
  unread_messages: number;
};

export default function MessagesPage() {
  const params = useParams();
  const connectionId = params.id as string;
  const supabase = createClientComponentClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionInfo, setConnectionInfo] = useState<Connection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_connection_messages', {
          p_connection_id: connectionId,
          p_user_id: userId,
          p_limit: 100
        });
      
      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }
      
      // Reverse messages to show oldest first
      setMessages(data ? [...data].reverse() : []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, [connectionId, userId, supabase]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchMessages();
    setIsRefreshing(false);
  }, [fetchMessages]);

  useEffect(() => {
    const fetchUserAndMessages = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        setUserId(user.id);
        
        // Fetch connection info
        const { data: connections } = await supabase
          .rpc('get_user_connections', { p_user_id: user.id });
        
        const connection = connections?.find((c: Connection) => c.connection_id === connectionId);
        if (!connection) {
          console.error("Connection not found");
          return;
        }
        
        setConnectionInfo(connection);
        
        // Fetch messages
        await fetchMessages();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserAndMessages();
    
    // Set up real-time subscription for messages
    const subscription = supabase
      .channel('connection_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connection_messages',
          filter: `connection_id=eq.${connectionId}`
        },
        (payload) => {
          // Refresh messages when a new one comes in
          fetchMessages();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [connectionId, supabase, fetchMessages]);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMessages();
      }
    };

    // Add event listeners for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', fetchMessages);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', fetchMessages);
    };
  }, [fetchMessages]);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !userId || !connectionInfo) return;
    
    setIsSending(true);
    try {
      // Insert new message
      const { data, error } = await supabase
        .from('connection_messages')
        .insert({
          connection_id: connectionId,
          sender_id: userId,
          content: messageText.trim()
        });
      
      if (error) {
        console.error("Error sending message:", error);
        return;
      }
      
      // Clear input
      setMessageText("");
      
      // Fetch updated messages
      await fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!connectionInfo) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Connection not found</h2>
          <p className="text-gray-600 mb-6">This connection doesn't exist or you don't have access to it.</p>
          <Button asChild>
            <Link href="/connections">Back to Connections</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-4 flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center pb-4 border-b">
        <Link href="/connections" className="mr-2">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        
        <Avatar className="h-10 w-10 mr-3">
          {connectionInfo.profile_picture_url && (
            <AvatarImage 
              src={connectionInfo.profile_picture_url} 
              alt={connectionInfo.display_name} 
            />
          )}
          <AvatarFallback>
            {connectionInfo.display_name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h2 className="font-semibold">{connectionInfo.display_name}</h2>
          <p className="text-xs text-gray-500">
            {connectionInfo.connection_status === 'connected' ? 'Connected' : 'Pending'}
          </p>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.message_id}
                className={`flex ${message.is_self ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg ${
                    message.is_self
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p>{message.content}</p>
                  <p className={`text-xs mt-1 ${message.is_self ? 'text-blue-100' : 'text-gray-500'}`}>
                    {formatMessageTime(message.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      
      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="pt-4 border-t mt-4">
        <div className="flex items-center">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 mr-2"
            disabled={connectionInfo.connection_status !== 'connected' || isSending}
          />
          <Button 
            type="submit" 
            disabled={!messageText.trim() || connectionInfo.connection_status !== 'connected' || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {connectionInfo.connection_status !== 'connected' && (
          <p className="text-xs text-amber-600 mt-2">
            You can't send messages until the connection is established.
          </p>
        )}
      </form>
    </div>
  );
} 