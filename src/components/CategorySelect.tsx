import React from 'react';
import { ChevronDown, Folder } from 'lucide-react';
import { useCategories, Category } from '@/hooks/useCategories';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CategorySelectProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

const CategorySelect: React.FC<CategorySelectProps> = ({ 
  value, 
  onChange, 
  placeholder = "Kategoriya tanlang" 
}) => {
  const { categories, isLoading } = useCategories();

  if (isLoading) {
    return <div className="h-10 bg-muted rounded-lg animate-pulse" />;
  }

  return (
    <Select 
      value={value || "none"} 
      onValueChange={(v) => onChange(v === "none" ? null : v)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {value ? (
            <div className="flex items-center gap-2">
              <span>{categories.find(c => c.id === value)?.icon}</span>
              <span>{categories.find(c => c.id === value)?.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Folder className="w-4 h-4" />
              <span>{placeholder}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            <span>Kategoriyasiz</span>
          </div>
        </SelectItem>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <div className="flex items-center gap-2">
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CategorySelect;
