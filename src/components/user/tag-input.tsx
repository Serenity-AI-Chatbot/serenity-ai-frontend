'use client';

import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TagInputProps {
  placeholder?: string;
  tags: string[];
  setTags: (tags: string[]) => void;
}

export function TagInput({ placeholder, tags, setTags }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      // Add the tag if it doesn't already exist
      if (!tags.includes(inputValue.trim())) {
        setTags([...tags, inputValue.trim()]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove the last tag when backspace is pressed on an empty input
      const newTags = [...tags];
      newTags.pop();
      setTags(newTags);
    }
  };

  const removeTag = (index: number) => {
    const newTags = [...tags];
    newTags.splice(index, 1);
    setTags(newTags);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      {tags.map((tag, index) => (
        <Badge key={index} variant="secondary" className="gap-1 px-2 py-1">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="ml-1 rounded-full hover:bg-muted p-1"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove {tag}</span>
          </button>
        </Badge>
      ))}
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-8"
      />
    </div>
  );
} 