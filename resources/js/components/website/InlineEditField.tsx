import { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';

interface InlineEditFieldProps {
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}

export default function InlineEditField({
  value,
  onChange,
  isEditing,
  as: Tag = 'p',
  className = '',
  placeholder = 'Click to edit...',
  multiline = false,
  rows = 3,
}: InlineEditFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  if (!isEditing) {
    return <Tag className={className}>{value || placeholder}</Tag>;
  }

  if (multiline) {
    return (
      <div className="group relative">
        <textarea
          rows={rows}
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`w-full rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/50 px-3 py-2 text-inherit font-inherit resize-y transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 ${className}`}
          style={{ minHeight: `${rows * 1.5}em` }}
        />
        {!isFocused && (
          <div className="absolute -top-2 -right-2 rounded-full bg-blue-600 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="h-3 w-3" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group relative inline-block w-full">
      <input
        type="text"
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={`w-full rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/50 px-3 py-1 text-inherit font-inherit transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 ${className}`}
      />
      {!isFocused && (
        <div className="absolute -top-2 -right-2 rounded-full bg-blue-600 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}
