import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import  FilterValues  from '@/data/Inventory.json'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';

import { API_BASE_URL } from '@/config';

export interface FilterItem {
  id: string;
  field: string;
  operator: '>' | '=' | '<' | '>=' | '<=';
  value: string;
}

export interface InventoryItem {
  field: string;
  value: string;
}

export function Inventory() {
  const [filters, setFilters] = useState<FilterItem[]>([
    { id: '1', field: '', operator: '=', value: '' }
  ]);
  const [inventory, setInventory] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<unknown[]>([]);

  const operators: Array<'>' | '=' | '<' | '>=' | '<='> = ['>', '=', '<', '>=', '<='];

  const addFilter = (id:string,val:string) => {
    const newId = Math.random().toString(36).substr(2, 9);
    setFilters([...filters, { id: newId, field: '', operator: '=', value: '' }]);
  };

  const removeFilter = (id: string) => {
    if (filters.length > 1) {
      setFilters(filters.filter(f => f.id !== id));
    }
  };

  const updateFilter = (id: string, key: keyof FilterItem, val: string) => {
    setFilters(filters.map(f =>
      f.id === id ? { ...f, [key]: val } : f
    ));
  };

  const updateInventory = (id: string, val: string) => {
    setInventory(prev => ({...prev,
        [id]:val}));
    console.log(inventory)
    console.log(id);
    console.log(val);
  }

  const handleApplyFilters = async () => {
    const activeFilters = filters.filter(f => f.field && f.value);

    if (activeFilters.length === 0) {
      setError('Please enter at least one filter');
      return;
    }

    const operatorMap: Record<string, string> = {
      '=': 'equal',
      '>': 'gt',
      '<': 'lt',
      '>=': 'gte',
      '<=': 'lte',
    };

    const mappedFilters = activeFilters.map(f => ({
      ...f,
      operator: operatorMap[f.operator] || f.operator
    }));

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/filters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters: mappedFilters }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);
      console.log('Filter results:', data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply filters';
      setError(errorMessage);
      console.error('Error applying filters:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilters([{ id: '1', field: '', operator: '=', value: '' }]);
    setResults([]);
    setError(null);
  };

  return (
    <div className="flex flex-col justify-center items-center py-20 px-4 lg:px-40">
      <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance mb-4">
        Rat Inventory
      </h1>

      <p className="text-muted-foreground text-lg text-center mb-8">
        Peruse a Breakdown of the Available Data and Select What You Want
      </p>

      <Card className="w-full max-w-2xl p-6">
        <div className="space-y-4">

              <div className="w-24">
                <label className="text-sm font-medium">Surgery Type</label>
                <Select value={inventory["Surgery Type"] ?? ""} onValueChange={(val) => updateInventory("Surgery Type", val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FilterValues["Surgery Type"].map(val => (
                      <SelectItem key={val} value={val}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-24">
                <label className="text-sm font-medium">Drug Administered</label>
                <Select value={inventory["Drug Administered"] ?? ""} onValueChange={(val) => updateInventory("Drug Administered", val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FilterValues["Drug Administered"].map(val => (
                      <SelectItem key={val} value={val}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-24">
                <label className="text-sm font-medium">Apparatus</label>
                <Select value={inventory["Apparatus"] ?? ""} onValueChange={(val) => updateInventory("Apparatus", val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FilterValues["Apparatus"].map(val => (
                      <SelectItem key={val} value={val}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-24">
                <label className="text-sm font-medium">Apparatus Pattern</label>
                <Select value={inventory["Apparatus Pattern"] ?? ""} onValueChange={(val) => updateInventory("Apparatus Pattern", val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FilterValues["Apparatus Pattern"].map(val => (
                      <SelectItem key={val} value={val}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-24">
                <label className="text-sm font-medium">Session Type</label>
                <Select value={inventory["Session Type"] ?? ""} onValueChange={(val) => updateInventory("Session Type", val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FilterValues["Session Type"].map(val => (
                      <SelectItem key={val} value={val}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t">

          <Button
            onClick={handleClearFilters}
            variant="ghost">
            Clear All
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="w-full max-w-2xl p-4 mt-4 bg-red-50 border-red-200">
          <p className="text-red-800 font-semibold">Error</p>
          <p className="text-red-700">{error}</p>
        </Card>
      )}
    </div>
  );
}
