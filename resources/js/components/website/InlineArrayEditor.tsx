import { useState } from 'react';
import { Plus, Trash2, GripVertical, Pencil, X, Check, Eye, EyeOff } from 'lucide-react';
import InlineEditField from './InlineEditField';

interface ArrayItem {
  [key: string]: string;
}

interface InlineArrayEditorProps {
  items: ArrayItem[];
  isEditing: boolean;
  onChange: (items: ArrayItem[]) => void;
  renderItem: (item: ArrayItem, index: number, isEditingItem: boolean, onFieldChange: (key: string, value: string) => void) => React.ReactNode;
  newItemDefaults: ArrayItem;
  emptyLabel?: string;
  addLabel?: string;
}

export default function InlineArrayEditor({
  items,
  isEditing,
  onChange,
  renderItem,
  newItemDefaults,
  emptyLabel = 'No items yet',
  addLabel = 'Add Item',
}: InlineArrayEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<ArrayItem>({ ...newItemDefaults });

  if (!isEditing) return null;

  const handleFieldChange = (index: number, key: string, value: string) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    onChange(updated);
  };

  const handleNewFieldChange = (key: string, value: string) => {
    setNewItem((prev) => ({ ...prev, [key]: value }));
  };

  const deleteItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const addItem = () => {
    onChange([...items, { ...newItem }]);
    setNewItem({ ...newItemDefaults });
    setIsAdding(false);
  };

  const moveItem = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= items.length) return;
    const updated = [...items];
    [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
    onChange(updated);
  };

  return (
    <div className="relative z-40 border-t-2 border-dashed border-blue-300 bg-blue-50/30 pt-4 pb-2">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Items */}
        <div className="space-y-3">
          {items.map((item, index) => {
            const isEditingItem = editingIndex === index;
            return (
              <div
                key={index}
                className={`group relative rounded-xl border-2 transition-all ${
                  isEditingItem
                    ? 'border-blue-400 bg-white shadow-lg ring-2 ring-blue-100'
                    : 'border-dashed border-slate-300 bg-white/80 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {/* Controls bar */}
                <div className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-1.5">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="text-slate-400 hover:text-slate-600 disabled:opacity-20"
                    >
                      <GripVertical className="h-3 w-3 rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      className="text-slate-400 hover:text-slate-600 disabled:opacity-20"
                    >
                      <GripVertical className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">#{index + 1}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingIndex(isEditingItem ? null : index)}
                      className={`rounded p-1 transition ${
                        isEditingItem
                          ? 'bg-blue-100 text-blue-600'
                          : 'text-slate-400 hover:bg-slate-100 hover:text-blue-600'
                      }`}
                      title={isEditingItem ? 'Stop editing this item' : 'Edit this item'}
                    >
                      {isEditingItem ? <EyeOff className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteItem(index)}
                      className="rounded p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                      title="Remove this item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Rendered item in its actual layout */}
                <div className="p-4">
                  {renderItem(item, index, isEditingItem, (key, value) =>
                    handleFieldChange(index, key, value)
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-400 italic">{emptyLabel}</p>
        )}

        {/* Add new item */}
        {isAdding ? (
          <div className="mt-4 rounded-xl border-2 border-green-300 bg-green-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-green-700">
              New Item
            </p>
            <div className="p-4 bg-white rounded-lg border border-green-200">
              {renderItem(newItem, -1, true, (key, value) => handleNewFieldChange(key, value))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
              >
                <Check className="h-4 w-4" /> Add to page
              </button>
              <button
                type="button"
                onClick={() => { setIsAdding(false); setNewItem({ ...newItemDefaults }); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-green-300 bg-green-50/50 py-3 text-sm font-semibold text-green-700 transition hover:border-green-400 hover:bg-green-100"
          >
            <Plus className="h-5 w-5" />
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}
