'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserContextItem } from '@/lib/ai/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { PencilIcon, TrashIcon } from 'lucide-react';
import { useState } from 'react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface UserContextListProps {
  items: UserContextItem[];
  onEdit: (item: UserContextItem) => void;
  onDelete: (id: number) => void;
}

export default function UserContextList({ items, onEdit, onDelete }: UserContextListProps) {
  const [itemToDelete, setItemToDelete] = useState<UserContextItem | null>(null);

  const handleDeleteClick = (item: UserContextItem) => {
    setItemToDelete(item);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      onDelete(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  const cancelDelete = () => {
    setItemToDelete(null);
  };

  // Group items by entity type
  const groupedItems: Record<string, UserContextItem[]> = {};
  items.forEach(item => {
    if (!groupedItems[item.entity_type]) {
      groupedItems[item.entity_type] = [];
    }
    groupedItems[item.entity_type].push(item);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groupedItems).map(([entityType, items]) => (
        <div key={entityType} className="space-y-4">
          <h2 className="text-xl font-semibold capitalize">{entityType}s</h2>
          
          {items.map(item => (
            <Card key={item.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-medium">{item.entity_name}</h3>
                  <Badge variant="outline" className="mt-1">{item.entity_type}</Badge>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onEdit(item)}
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteClick(item)} 
                    className="text-destructive"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="details">
                  <AccordionTrigger>View Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 mt-2">
                      {Object.entries(item.information).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span>
                            {Array.isArray(value) 
                              ? value.join(', ') 
                              : typeof value === 'object' 
                                ? JSON.stringify(value) 
                                : value.toString()}
                          </span>
                        </div>
                      ))}
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="font-medium">Last updated:</span>
                        <span>{new Date(item.updated_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          ))}
        </div>
      ))}

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the "{itemToDelete?.entity_name}" information from your personal context.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 