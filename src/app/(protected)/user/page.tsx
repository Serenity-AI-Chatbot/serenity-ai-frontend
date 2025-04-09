'use client';

import { useState, useEffect } from 'react';
import { UserContextItem } from '@/lib/ai/types';
import UserContextList from '@/components/user/user-context-list';
import UserContextForm from '@/components/user/user-context-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function UserContextPage() {
  const [userContexts, setUserContexts] = useState<UserContextItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<UserContextItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
    setIsEditing(true);
  };

  const handleEditItem = (item: UserContextItem) => {
    setSelectedItem(item);
    setIsEditing(true);
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
    setIsEditing(false);
    setSelectedItem(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedItem(null);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Your Contextual Information</h1>
      <p className="mb-6 text-muted-foreground">
        Manage your personal context that helps Serenity AI understand you better and provide more personalized responses.
      </p>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list">Your Information</TabsTrigger>
          {isEditing && <TabsTrigger value="edit">
            {selectedItem ? 'Edit Information' : 'Add Information'}
          </TabsTrigger>}
        </TabsList>

        <TabsContent value="list">
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddNew}>Add New Information</Button>
          </div>
          
          {isLoading ? (
            <Card className="p-8 text-center">Loading your information...</Card>
          ) : userContexts.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="mb-4">You haven't added any contextual information yet.</p>
              <Button onClick={handleAddNew}>Add Your First Information</Button>
            </Card>
          ) : (
            <UserContextList 
              items={userContexts} 
              onEdit={handleEditItem} 
              onDelete={handleDeleteItem} 
            />
          )}
        </TabsContent>

        {isEditing && (
          <TabsContent value="edit">
            <UserContextForm 
              initialData={selectedItem}
              onSave={handleSaveComplete}
              onCancel={handleCancel}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 