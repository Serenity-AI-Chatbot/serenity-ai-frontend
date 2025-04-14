'use client';

import { useState, useEffect } from 'react';
import { UserContextItem } from '@/lib/ai/types';
import UserContextList from '@/components/user/user-context-list';
import UserContextForm from '@/components/user/user-context-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

export default function UserContextPage() {
  const [userContexts, setUserContexts] = useState<UserContextItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<UserContextItem | null>(null);
  const [activeTab, setActiveTab] = useState('list');

  // Fetch user contexts on component mount
  useEffect(() => {
    const fetchUserContexts = async () => {
      try {
        const response = await fetch('/api/user-context');
        if (!response.ok) {
          throw new Error('Failed to fetch user contexts');
        }
        const data = await response.json();
        setUserContexts(data);
      } catch (error) {
        console.error('Error fetching user contexts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserContexts();
  }, []);

  const handleAddNew = () => {
    setSelectedItem(null);
    setActiveTab('edit');
  };

  const handleEditItem = (item: UserContextItem) => {
    setSelectedItem(item);
    setActiveTab('edit');
  };

  const handleDeleteItem = async (id: number) => {
    try {
      const response = await fetch(`/api/user-context/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      // Remove the deleted item from the state
      setUserContexts(userContexts.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting user context:', error);
    }
  };

  const handleSaveComplete = (savedItem: UserContextItem) => {
    if (selectedItem) {
      // Update existing item
      setUserContexts(
        userContexts.map(item => (item.id === savedItem.id ? savedItem : item))
      );
    } else {
      // Add new item
      setUserContexts([...userContexts, savedItem]);
    }
    setActiveTab('list');
    setSelectedItem(null);
  };

  const handleCancel = () => {
    setActiveTab('list');
    setSelectedItem(null);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-3 text-emerald-600">Your Personal Context</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          This information helps Serenity AI understand you better and provide more personalized responses. 
          Add details about people, places, or preferences important to you.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 w-full bg-emerald-50 p-1">
          <TabsTrigger 
            value="list" 
            className="flex-1 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            All Information
          </TabsTrigger>
          <TabsTrigger 
            value="edit" 
            className="flex-1 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            {selectedItem ? 'Edit Information' : 'Add Information'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-0">
          <div className="flex justify-end mb-6">
            <Button 
              onClick={handleAddNew} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Add New Information
            </Button>
          </div>
          
          {isLoading ? (
            <Card className="p-10 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-lg text-muted-foreground">Loading your information...</p>
              </div>
            </Card>
          ) : userContexts.length === 0 ? (
            <Card className="p-10 border-dashed border-2 bg-emerald-50/30">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-medium text-emerald-700">No personal information yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  Adding personal context helps Serenity AI understand your preferences, relationships, 
                  and important details about your life.
                </p>
                <Button 
                  onClick={handleAddNew} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Add Your First Information
                </Button>
              </div>
            </Card>
          ) : (
            <UserContextList 
              items={userContexts} 
              onEdit={handleEditItem} 
              onDelete={handleDeleteItem} 
            />
          )}
        </TabsContent>

        <TabsContent value="edit" className="mt-0">
          <UserContextForm 
            initialData={selectedItem}
            onSave={handleSaveComplete}
            onCancel={handleCancel}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 