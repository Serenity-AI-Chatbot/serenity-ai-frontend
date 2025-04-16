"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Loader2, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const inputRef = useRef<HTMLInputElement>(null);
  
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

  // Focus input when page loads
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);
  
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

  // Format date for message groups
  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ).forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };
  
  // Handle back navigation
  const handleBack = () => {
    router.push("/connections");
  };
  
  if (!connectionId) {
    return null; // Will redirect in useEffect
  }
  
  const messageGroups = groupMessagesByDate();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="container max-w-4xl mx-auto p-4 h-screen flex flex-col">
        {/* Header */}
        <Card className="p-3 mb-4 flex items-center border-emerald-100 shadow-sm bg-white">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {connectionInfo && (
            <>
              <Avatar className="h-10 w-10 mr-3 border-2 border-emerald-100">
                {connectionInfo.profile_picture_url && (
                  <AvatarImage 
                    src={connectionInfo.profile_picture_url} 
                    alt={connectionInfo.display_name} 
                  />
                )}
                <AvatarFallback className="bg-emerald-100 text-emerald-800 font-medium">
                  {connectionInfo.display_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="font-bold text-emerald-800">{connectionInfo.display_name}</h2>
                <p className="text-sm text-emerald-600 truncate max-w-xs">
                  {connectionInfo.bio || "No bio available"}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <Info className="h-5 w-5" />
              </Button>
            </>
          )}
        </Card>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4 bg-white rounded-lg border border-emerald-100 shadow-sm p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-10 text-emerald-600">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center h-full py-20 text-emerald-600"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <Send className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-2">Send a message to start the conversation</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {Object.entries(messageGroups).map(([date, dateMessages]) => (
                <div key={date} className="space-y-3">
                  <div className="flex justify-center">
                    <div className="bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full">
                      {formatMessageDate(dateMessages[0].created_at)}
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {dateMessages.map((message, index) => {
                      // Check if message is part of a consecutive group from same sender
                      const isConsecutive = index > 0 && dateMessages[index-1].is_self === message.is_self;
                      
                      return (
                        <motion.div
                          key={message.message_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${message.is_self ? "justify-end" : "justify-start"} ${isConsecutive ? "mt-1" : "mt-3"}`}
                        >
                          {!message.is_self && !isConsecutive && (
                            <Avatar className="h-8 w-8 mr-2 mt-1 border border-emerald-100">
                              {connectionInfo?.profile_picture_url && (
                                <AvatarImage 
                                  src={connectionInfo.profile_picture_url} 
                                  alt={connectionInfo.display_name} 
                                />
                              )}
                              <AvatarFallback className="text-xs bg-emerald-100 text-emerald-800">
                                {connectionInfo?.display_name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div
                            className={`max-w-[75%] rounded-2xl p-3 ${
                              message.is_self
                                ? "bg-emerald-600 text-white"
                                : "bg-emerald-50 text-emerald-900"
                            } ${message.is_self ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                          >
                            <div className="text-sm">{message.content}</div>
                            <div
                              className={`text-xs mt-1 text-right ${
                                message.is_self ? "text-emerald-200" : "text-emerald-500"
                              }`}
                            >
                              {formatTime(message.created_at)}
                            </div>
                          </div>
                          
                          {message.is_self && !isConsecutive && (
                            <Avatar className="h-8 w-8 ml-2 mt-1 border border-emerald-100">
                              <AvatarFallback className="text-xs bg-emerald-600 text-white">
                                ME
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message Input */}
        <Card className="p-3 border-emerald-100 bg-white shadow-sm">
          <form onSubmit={handleSendMessage} className="flex items-center">
            <Input
              ref={inputRef}
              className="flex-1 mr-2 border-emerald-200 focus-visible:ring-emerald-600 py-6"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending || loading || !connectionInfo || connectionInfo.connection_status !== "connected"}
            />
            <Button 
              type="submit" 
              disabled={sending || !newMessage.trim() || loading || !connectionInfo || connectionInfo.connection_status !== "connected"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              <span>Send</span>
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
} 