'use client';

import { useState } from 'react';
import { UserContextItem } from '@/lib/ai/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TagInput } from '@/components/user/tag-input';
import { useToast } from '@/hooks/use-toast';
interface UserContextFormProps {
  initialData: UserContextItem | null;
  onSave: (savedItem: UserContextItem) => void;
  onCancel: () => void;
}

const ENTITY_TYPES = [
  'person',
  'location',
  'project',
  'preference',
  'pet',
  'organization',
  'interest',
  'hobby',
  'health',
  'goal',
  'routine',
  'custom'
];

export default function UserContextForm({ initialData, onSave, onCancel }: UserContextFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entityName, setEntityName] = useState(initialData?.entity_name || '');
  const [entityType, setEntityType] = useState(initialData?.entity_type || 'person');
  const [description, setDescription] = useState(initialData?.information?.description || '');
  const [relationship, setRelationship] = useState(initialData?.information?.relationship || '');
  const [preferences, setPreferences] = useState<string[]>(
    initialData?.information?.preferences || []
  );
  const [importantDates, setImportantDates] = useState<string[]>(
    initialData?.information?.important_dates || []
  );
  const [notes, setNotes] = useState<string[]>(
    initialData?.information?.notes || []
  );
  const [customFields, setCustomFields] = useState<{key: string, value: string}[]>(
    Object.entries(initialData?.information || {})
      .filter(([key]) => !['description', 'relationship', 'preferences', 'important_dates', 'notes'].includes(key))
      .map(([key, value]) => ({ 
        key, 
        value: Array.isArray(value) ? value.join(', ') : String(value) 
      }))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!entityName.trim()) {
      toast({
        title: "Name required",
        description: "Please provide a name for this information",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Build the information object
      const information: Record<string, any> = {
        description: description.trim(),
      };
      
      if (relationship.trim()) {
        information.relationship = relationship.trim();
      }
      
      if (preferences.length > 0) {
        information.preferences = preferences;
      }
      
      if (importantDates.length > 0) {
        information.important_dates = importantDates;
      }
      
      if (notes.length > 0) {
        information.notes = notes;
      }
      
      // Add custom fields
      customFields.forEach(({ key, value }) => {
        if (key.trim() && value.trim()) {
          information[key.trim()] = value.trim();
        }
      });

      const payload = {
        entity_name: entityName.trim(),
        entity_type: entityType,
        information
      };

      // Determine if this is a create or update
      const url = initialData 
        ? `/api/user-context/${initialData.id}` 
        : '/api/user-context';
      
      const method = initialData ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save user context');
      }

      const savedItem = await response.json();
      
      toast({
        title: initialData ? "Updated successfully" : "Added successfully",
        description: `Your information about "${entityName}" has been ${initialData ? 'updated' : 'added'}.`,
      });

      onSave(savedItem);
    } catch (error) {
      console.error('Error saving user context:', error);
      toast({
        title: "Error saving information",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const updateCustomField = (index: number, field: 'key' | 'value', value: string) => {
    const updatedFields = [...customFields];
    updatedFields[index][field] = value;
    setCustomFields(updatedFields);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="entity-name">Name</Label>
              <Input 
                id="entity-name" 
                value={entityName} 
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="E.g., John Smith, Home, Work Project"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="entity-type">Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger id="entity-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship (if applicable)</Label>
            <Input 
              id="relationship" 
              value={relationship} 
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="E.g., Friend, Colleague, Favorite restaurant"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Preferences (optional)</Label>
            <TagInput
              placeholder="Add preferences and press Enter"
              tags={preferences}
              setTags={setPreferences}
            />
            <p className="text-sm text-muted-foreground">Press Enter to add each preference</p>
          </div>
          
          <div className="space-y-2">
            <Label>Important Dates (optional)</Label>
            <TagInput
              placeholder="Add important dates and press Enter"
              tags={importantDates}
              setTags={setImportantDates}
            />
            <p className="text-sm text-muted-foreground">Format: Date - Description (e.g., "May 15 - Birthday")</p>
          </div>
          
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <TagInput
              placeholder="Add notes and press Enter"
              tags={notes}
              setTags={setNotes}
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Custom Fields (optional)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                Add Field
              </Button>
            </div>
            
            {customFields.map((field, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  placeholder="Field name"
                  value={field.key}
                  onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                />
                <Input
                  placeholder="Value"
                  value={field.value}
                  onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeCustomField(index)}
                  className="text-destructive"
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
} 