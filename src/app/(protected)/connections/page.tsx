"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConnectionCard from "@/components/ConnectionCard";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2, UserPlus, Users, Bell, Search } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

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

export default function ConnectionsPage() {
  const supabase = createClientComponentClient();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingConnections, setPendingConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("connections");

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }

      // Get all connections
      const { data: allConnections, error } = await supabase
        .rpc('get_user_connections', { p_user_id: user.id });

      if (error) {
        console.error("Error fetching connections:", error);
        return;
      }

      // Filter connections by status
      const pendingConns = allConnections.filter((conn: Connection) => 
        conn.connection_status === 'pending' && !conn.is_initiator
      );
      
      const activeConns = allConnections.filter((conn: Connection) => 
        conn.connection_status === 'connected' || 
        (conn.connection_status === 'pending' && conn.is_initiator)
      );

      setConnections(activeConns || []);
      setPendingConnections(pendingConns || []);
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptConnection = async (connectionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .rpc('accept_connection', { 
          p_user_id: user.id,
          p_connection_id: connectionId
        });

      if (error) {
        console.error("Error accepting connection:", error);
        return;
      }

      // Refresh connections list
      fetchConnections();
    } catch (error) {
      console.error("Error accepting connection:", error);
    }
  };

  const handleRejectConnection = async (connectionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .rpc('reject_connection', {
          p_user_id: user.id,
          p_connection_id: connectionId
        });

      if (error) {
        console.error("Error rejecting connection:", error);
        return;
      }

      // Refresh connections list
      fetchConnections();
    } catch (error) {
      console.error("Error rejecting connection:", error);
    }
  };

  const handleMessageConnection = (connectionId: string, userId: string) => {
    // Navigate to conversation
    window.location.href = `/connections/messages/${connectionId}`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="container max-w-4xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-emerald-800">Your Connections</h1>
            <p className="text-emerald-600 mt-1">Stay connected with your network</p>
          </div>
          <div className="flex gap-3">
            <Button className="bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200" asChild>
              <Link href="/profile/connections" className="flex items-center gap-2">
                Settings
              </Link>
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" asChild>
              <Link href="/connections/discover" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Discover People
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-emerald-100">
          <Tabs defaultValue="connections" onValueChange={setActiveTab}>
            <TabsList className="mb-6 bg-emerald-50 border border-emerald-100 p-1 rounded-lg w-full">
              <TabsTrigger 
                value="connections" 
                className="flex-1 py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md transition-all"
              >
                <Users className="h-4 w-4 mr-2" />
                Connections ({connections.length})
              </TabsTrigger>
              <TabsTrigger 
                value="requests" 
                className="flex-1 py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md transition-all"
              >
                <Bell className="h-4 w-4 mr-2" />
                Requests
                {pendingConnections.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {pendingConnections.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="connections">
              {isLoading ? (
                <div className="flex justify-center items-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
              ) : connections.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-center p-12 bg-emerald-50 rounded-lg border border-emerald-100"
                >
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-medium mb-2 text-emerald-800">No connections yet</h3>
                  <p className="text-emerald-700 mb-5 max-w-md mx-auto">Start connecting with others who share similar interests and experiences</p>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm" asChild>
                    <Link href="/connections/discover" className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Discover People
                    </Link>
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {connections.map((connection) => (
                    <motion.div key={connection.connection_id} variants={itemVariants}>
                      <ConnectionCard
                        connection={connection}
                        onMessage={handleMessageConnection}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </TabsContent>
            
            <TabsContent value="requests">
              {isLoading ? (
                <div className="flex justify-center items-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
              ) : pendingConnections.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-center p-12 bg-emerald-50 rounded-lg border border-emerald-100"
                >
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-medium text-emerald-800">No pending requests</h3>
                  <p className="text-emerald-700 mt-2">When someone sends you a connection request, it will appear here</p>
                </motion.div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {pendingConnections.map((connection) => (
                    <motion.div key={connection.connection_id} variants={itemVariants}>
                      <ConnectionCard
                        connection={connection}
                        onAccept={handleAcceptConnection}
                        onReject={handleRejectConnection}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 