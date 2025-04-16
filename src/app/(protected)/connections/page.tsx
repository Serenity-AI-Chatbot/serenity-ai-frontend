"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConnectionCard from "@/components/ConnectionCard";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2, UserPlus, Users } from "lucide-react";
import Link from "next/link";

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

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-emerald-800">Your Connections</h1>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
          <Link href="/connections/discover" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Discover People
          </Link>
        </Button>
      </div>
      
      <Tabs defaultValue="connections" onValueChange={setActiveTab}>
        <TabsList className="mb-4 bg-emerald-50 border-emerald-100">
          <TabsTrigger 
            value="connections" 
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            Connections
          </TabsTrigger>
          <TabsTrigger 
            value="requests" 
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
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
            <div className="text-center p-12 bg-emerald-50 rounded-lg border border-emerald-100">
              <h3 className="text-lg font-medium mb-2 text-emerald-800">No connections yet</h3>
              <p className="text-emerald-700 mb-4">Start connecting with others by visiting the discover page</p>
              <Button className="bg-emerald-600 hover:bg-emerald-700" asChild>
                <Link href="/connections/discover" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Discover People
                </Link>
              </Button>
            </div>
          ) : (
            <div>
              {connections.map((connection) => (
                <ConnectionCard
                  key={connection.connection_id}
                  connection={connection}
                  onMessage={handleMessageConnection}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="requests">
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : pendingConnections.length === 0 ? (
            <div className="text-center p-12 bg-emerald-50 rounded-lg border border-emerald-100">
              <h3 className="text-lg font-medium text-emerald-800">No pending requests</h3>
              <p className="text-emerald-700">When someone sends you a connection request, it will appear here</p>
            </div>
          ) : (
            <div>
              {pendingConnections.map((connection) => (
                <ConnectionCard
                  key={connection.connection_id}
                  connection={connection}
                  onAccept={handleAcceptConnection}
                  onReject={handleRejectConnection}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 