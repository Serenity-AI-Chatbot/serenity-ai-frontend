import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { MessageSquare } from "lucide-react";

type ConnectionCardProps = {
  connection: {
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
  onAccept?: (connectionId: string) => Promise<void>;
  onReject?: (connectionId: string) => Promise<void>;
  onMessage?: (connectionId: string, userId: string) => void;
};

export default function ConnectionCard({
  connection,
  onAccept,
  onReject,
  onMessage,
}: ConnectionCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const isPending = connection.connection_status === "pending";
  const isConnected = connection.connection_status === "connected";
  
  const handleAccept = async () => {
    if (!onAccept) return;
    
    setIsLoading(true);
    try {
      await onAccept(connection.connection_id);
    } catch (error) {
      console.error("Error accepting connection:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReject = async () => {
    if (!onReject) return;
    
    setIsLoading(true);
    try {
      await onReject(connection.connection_id);
    } catch (error) {
      console.error("Error rejecting connection:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleMessage = () => {
    if (!onMessage) return;
    onMessage(connection.connection_id, connection.connected_user_id);
  };
  
  return (
    <Card className="mb-4 p-4 shadow-md border-emerald-100 hover:border-emerald-300 transition-colors">
      <div className="flex items-start">
        {/* User Avatar */}
        <div className="relative">
          <Avatar className="w-16 h-16 mr-4 ring-2 ring-emerald-100">
            {connection.profile_picture_url && (
              <AvatarImage 
                src={connection.profile_picture_url}
                alt={connection.display_name}
              />
            )}
            <AvatarFallback className="bg-emerald-100 text-emerald-800">
              {connection.display_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {connection.unread_messages > 0 && isConnected && (
            <Badge className="absolute -top-2 -right-2 px-2 bg-emerald-600">
              {connection.unread_messages}
            </Badge>
          )}
        </div>
        
        {/* User Info */}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold text-emerald-800">{connection.display_name}</h3>
            <Badge className={
              isPending 
                ? "bg-yellow-500" 
                : isConnected 
                  ? "bg-emerald-600" 
                  : "bg-gray-500"
            }>
              {isPending 
                ? connection.is_initiator 
                  ? "Pending" 
                  : "Request" 
                : isConnected 
                  ? "Connected" 
                  : "Rejected"}
            </Badge>
          </div>
          
          <p className="text-emerald-700 text-sm mb-4">
            {connection.bio || "No bio available"}
          </p>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            {isPending && !connection.is_initiator && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleReject}
                  disabled={isLoading}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  Decline
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handleAccept}
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Accept
                </Button>
              </>
            )}
            
            {isConnected && (
              <Button 
                variant={connection.unread_messages > 0 ? "default" : "outline"}
                size="sm"
                onClick={handleMessage}
                className={connection.unread_messages > 0 
                  ? "bg-emerald-600 hover:bg-emerald-700" 
                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {connection.unread_messages > 0 ? `Message (${connection.unread_messages})` : "Message"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
} 