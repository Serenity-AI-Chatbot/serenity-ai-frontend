'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TelegramUser {
  id: string;
  telegram_id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  created_at: string;
  updated_at: string;
}

export default function TelegramSettings() {
  const [telegramId, setTelegramId] = useState('');
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  // Fetch existing Telegram user on mount
  useEffect(() => {
    const fetchTelegramUser = async () => {
      try {
        const response = await fetch('/api/telegram-user');
        if (response.ok) {
          const data = await response.json();
          setTelegramUser(data);
          if (data?.telegram_id) {
            setTelegramId(data.telegram_id);
          }
        }
      } catch (error) {
        console.error('Error fetching Telegram user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTelegramUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const method = telegramUser ? 'PUT' : 'POST';
      const response = await fetch('/api/telegram-user', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegram_id: telegramId }),
      });

      if (!response.ok) {
        throw new Error('Failed to save Telegram ID');
      }

      const data = await response.json();
      setTelegramUser(data);
      toast({
        title: 'Telegram ID saved successfully',
        description: 'Your Telegram ID has been saved successfully',
      });
    } catch (error) {
      console.error('Error saving Telegram ID:', error);
      toast({
        title: 'Failed to save Telegram ID',
        description: 'Please try again',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove your Telegram connection?')) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/telegram-user', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove Telegram ID');
      }

      setTelegramUser(null);
      setTelegramId('');
      toast({
        title: 'Telegram connection removed',
        description: 'Your Telegram connection has been removed successfully',
      });
    } catch (error) {
      console.error('Error removing Telegram ID:', error);
      toast({
        title: 'Failed to remove Telegram ID',
        description: 'Please try again',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-emerald-600">Telegram Integration</CardTitle>
        <CardDescription>
          Connect your Telegram account to receive journal reminders and chat with Serenity AI on the go.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="ml-2">Loading your settings...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="telegram-id" className="text-sm font-medium">
                Your Telegram ID
              </label>
              <div className="flex gap-2">
                <Input
                  id="telegram-id"
                  placeholder="e.g. 123456789"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  disabled={isSaving}
                  className="flex-1"
                />
                <Button type="submit" disabled={isSaving || !telegramId} className="bg-emerald-600 hover:bg-emerald-700">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {telegramUser ? 'Update' : 'Connect'}
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground mt-2">
              <p>To find your Telegram ID:</p>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                <li>Chat with <span className="font-medium">@SerenityAIBot</span> on Telegram</li>
                <li>Send the command <code className="bg-muted px-1 rounded">/myid</code></li>
                <li>Copy the ID number and paste it here</li>
              </ol>
            </div>

            {telegramUser && (
              <div className="flex items-center mt-4 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Telegram account connected on {new Date(telegramUser.updated_at).toLocaleDateString()}
              </div>
            )}
          </form>
        )}
      </CardContent>

      {telegramUser && (
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            Removing connection will stop all Telegram notifications
          </div>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleRemove}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Remove Connection
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 