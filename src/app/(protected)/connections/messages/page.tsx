"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";

type Message = {
  message_id: string;
  sender_id: string;
  is_self: boolean;
  content: string;
  created_at: string;
  is_read: boolean;
};

type ConnectionInfo = {
  connection_id: string;
  connected_user_id: string;
  display_name: string;
  bio: string;
  profile_picture_url: string | null;
  connection_status: string;
};

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectionId = searchParams.get("id");
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Redirect if no connection ID provided
  useEffect(() => {
    if (!connectionId) {
      router.push("/connections");
    }
  }, [connectionId, router]);
  
  // Fetch messages and connection info
  const fetchData = async () => {
    if (!connectionId) return;
    
    try {
      // Fetch messages
      const msgRes = await fetch(`/api/connection-messages?connectionId=${connectionId}`);
      if (!msgRes.ok) throw new Error("Failed to fetch messages");
      const msgData = await msgRes.json();
      setMessages(msgData.messages || []);
      
      // Fetch connection info to get user details
      const connRes = await fetch("/api/user-connections");
      if (!connRes.ok) throw new Error("Failed to fetch connection info");
      const connData = await connRes.json();
      
      const connection = connData.connections?.find(
        (conn: any) => conn.connection_id === connectionId
      );
      
      if (connection) {
        setConnectionInfo(connection);
      } else {
        throw new Error("Connection not found");
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data load
  useEffect(() => {
    fetchData();
    
    // Set up polling for new messages every 5 seconds
    pollingIntervalRef.current = setInterval(fetchData, 5000);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [connectionId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connectionId || !newMessage.trim()) return;
    
    setSending(true);
    try {
      const res = await fetch("/api/connection-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          content: newMessage,
        }),
      });
      
      if (!res.ok) throw new Error("Failed to send message");
      
      // Clear input and refresh messages
      setNewMessage("");
      await fetchData();
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };
  
  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Handle back navigation
  const handleBack = () => {
    router.push("/connections");
  };
  
  if (!connectionId) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <div className="container max-w-4xl mx-auto p-4 h-screen flex flex-col">
      {/* Header */}
      <Card className="p-4 mb-4 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-2"
          onClick={handleBack}
        >
          ←
        </Button>
        
        {connectionInfo && (
          <>
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
            <div>
              <h2 className="font-bold">{connectionInfo.display_name}</h2>
              <p className="text-sm text-gray-500 truncate max-w-xs">
                {connectionInfo.bio || "No bio available"}
              </p>
            </div>
          </>
        )}
      </Card>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto mb-4 bg-gray-50 rounded-lg p-4">
        {loading ? (
          <div className="text-center py-10">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>No messages yet</p>
            <p className="text-sm mt-2">Send a message to start the conversation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ).map((message) => (
              <div
                key={message.message_id}
                className={`flex ${message.is_self ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.is_self
                      ? "bg-blue-500 text-white"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div>{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.is_self ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Message Input */}
      <Card className="p-3">
        <form onSubmit={handleSendMessage} className="flex">
          <Input
            className="flex-1 mr-2"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending || loading || !connectionInfo || connectionInfo.connection_status !== "connected"}
          />
          <Button 
            type="submit" 
            disabled={sending || !newMessage.trim() || loading || !connectionInfo || connectionInfo.connection_status !== "connected"}
          >
            Send
          </Button>
        </form>
      </Card>
    </div>
  );
} 