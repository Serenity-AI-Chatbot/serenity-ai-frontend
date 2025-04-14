'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserContextItem } from '@/lib/ai/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, EditIcon, InfoIcon, TrashIcon } from 'lucide-react';
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

  // Get type icon based on entity type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'person':
        return '👤';
      case 'location':
        return '📍';
      case 'project':
        return '📋';
      case 'preference':
        return '❤️';
      case 'pet':
        return '🐾';
      case 'organization':
        return '🏢';
      case 'interest':
        return '🌟';
      case 'hobby':
        return '🎨';
      case 'health':
        return '🩺';
      case 'goal':
        return '🎯';
      case 'routine':
        return '⏰';
      default:
        return '📝';
    }
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedItems).map(([entityType, items]) => (
        <div key={entityType} className="space-y-4">
          <h2 className="text-xl font-semibold capitalize flex items-center text-emerald-700">
            <span className="mr-2">{getTypeIcon(entityType)}</span>
            {entityType}s
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {items.map(item => (
              <Card key={item.id} className="overflow-hidden border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-medium text-emerald-700">{item.entity_name}</h3>
                      <Badge variant="outline" className="mt-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                        {item.entity_type}
                      </Badge>
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onEdit(item)}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <EditIcon className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteClick(item)} 
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {item.information.description && (
                    <p className="text-muted-foreground mb-3 line-clamp-2">
                      {item.information.description}
                    </p>
                  )}
                  
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="details" className="border-b-0">
                      <AccordionTrigger className="py-2 text-sm text-emerald-600 hover:text-emerald-700 hover:no-underline">
                        <span className="flex items-center">
                          <InfoIcon className="h-4 w-4 mr-1" /> View Complete Details
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 mt-2 bg-emerald-50/50 p-4 rounded-md">
                          {Object.entries(item.information).map(([key, value]) => (
                            <div key={key} className="grid grid-cols-[120px_1fr] gap-2">
                              <span className="font-medium capitalize text-emerald-700">{key.replace(/_/g, ' ')}:</span>
                              <span>
                                {Array.isArray(value) 
                                  ? value.join(', ') 
                                  : typeof value === 'object' 
                                    ? JSON.stringify(value) 
                                    : value.toString()}
                              </span>
                            </div>
                          ))}
                          <div className="grid grid-cols-[120px_1fr] gap-2 border-t border-emerald-100 pt-2 mt-2">
                            <span className="font-medium text-emerald-700 flex items-center">
                              <CalendarIcon className="h-3 w-3 mr-1" /> Last updated:
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {new Date(item.updated_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the information about "{itemToDelete?.entity_name}" from your personal context.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 