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
import { InfoIcon, Plus, Save, X } from 'lucide-react';

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
    <Card className="p-6 border-emerald-100 shadow-md">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-emerald-700 mb-2">
          {initialData ? 'Edit' : 'Add New'} Information
        </h2>
        <p className="text-muted-foreground text-sm">
          {initialData
            ? 'Update the details below to modify this information.'
            : 'Fill in the details below to add new personal context information.'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="entity-name" className="text-emerald-700">Name</Label>
              <Input 
                id="entity-name" 
                value={entityName} 
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="E.g., John Smith, Home, Work Project"
                className="border-emerald-200 focus-visible:ring-emerald-500"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="entity-type" className="text-emerald-700">Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger id="entity-type" className="border-emerald-200 focus-visible:ring-emerald-500">
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
            <Label htmlFor="description" className="text-emerald-700">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description"
              className="border-emerald-200 focus-visible:ring-emerald-500"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="relationship" className="text-emerald-700">Relationship (if applicable)</Label>
            <Input 
              id="relationship" 
              value={relationship} 
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="E.g., Friend, Colleague, Favorite restaurant"
              className="border-emerald-200 focus-visible:ring-emerald-500"
            />
          </div>
          
          <div className="p-4 bg-emerald-50/50 rounded-lg space-y-6 border border-emerald-100">
            <div className="space-y-2">
              <Label className="text-emerald-700 flex items-center">
                <InfoIcon className="h-4 w-4 mr-1" /> Preferences (optional)
              </Label>
              <TagInput
                placeholder="Add preferences and press Enter"
                tags={preferences}
                setTags={setPreferences}
                className="bg-white"
              />
              <p className="text-sm text-muted-foreground">Press Enter to add each preference</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-emerald-700 flex items-center">
                <InfoIcon className="h-4 w-4 mr-1" /> Important Dates (optional)
              </Label>
              <TagInput
                placeholder="Add important dates and press Enter"
                tags={importantDates}
                setTags={setImportantDates}
                className="bg-white"
              />
              <p className="text-sm text-muted-foreground">Format: Date - Description (e.g., "May 15 - Birthday")</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-emerald-700 flex items-center">
                <InfoIcon className="h-4 w-4 mr-1" /> Notes (optional)
              </Label>
              <TagInput
                placeholder="Add notes and press Enter"
                tags={notes}
                setTags={setNotes}
                className="bg-white"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-emerald-700">Custom Fields (optional)</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addCustomField}
                className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Field
              </Button>
            </div>
            
            {customFields.length > 0 ? (
              <div className="space-y-3">
                {customFields.map((field, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Input
                      placeholder="Field name"
                      value={field.key}
                      onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                      className="border-emerald-200 focus-visible:ring-emerald-500"
                    />
                    <Input
                      placeholder="Value"
                      value={field.value}
                      onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                      className="border-emerald-200 focus-visible:ring-emerald-500"
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeCustomField(index)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed border-emerald-200 rounded-lg bg-emerald-50/30">
                <p className="text-muted-foreground text-sm">
                  Add custom fields for any additional information
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-emerald-100">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              disabled={isSubmitting}
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                <span className="flex items-center">
                  <Save className="h-4 w-4 mr-2" />
                  {initialData ? 'Update' : 'Save'}
                </span>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
} 