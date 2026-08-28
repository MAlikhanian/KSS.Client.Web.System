'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface LocationData {
  id: string;
  name: string;
  nameEn: string;
  countryId?: string;
  provinceId?: string;
}

interface LocationSelectProps {
  type: 'country' | 'province' | 'city';
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  countryId?: string;
  provinceId?: string;
}

export function LocationSelect({
  type,
  value,
  onValueChange,
  placeholder,
  label,
  required = false,
  disabled = false,
  countryId,
  provinceId,
}: LocationSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let typeName = '';
        let params = '';
        switch (type) {
          case 'country':
            typeName = 'countries';
            break;
          case 'province':
            typeName = 'provinces';
            if (countryId) {
              params = `&countryId=${countryId}`;
            }
            break;
          case 'city':
            typeName = 'cities';
            if (provinceId) {
              params = `&provinceId=${provinceId}`;
            }
            break;
        }

        const response = await fetch(`/api/locations?type=${typeName}${params}`);
        if (!response.ok) {
          throw new Error(`Failed to load ${type} data`);
        }
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    // For provinces, only fetch when a country is selected
    if (type === 'province' && !countryId) {
      setData([]);
      setLoading(false);
      return;
    }

    // For cities, only fetch when a province is selected
    if (type === 'city' && !provinceId) {
      setData([]);
      setLoading(false);
      return;
    }

    fetchData();
  }, [type, countryId, provinceId]);

  // Data is already filtered server-side by the /api/locations endpoint
  const filteredData = data;

  const selectedItem = filteredData.find((item) => item.id === value);

  if (loading) {
    return (
      <div className="space-y-2">
        {label && (
          <Label>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        <Button variant="outline" disabled className="w-full justify-between">
          {t('common.loading', { defaultValue: 'Loading...' })}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        {label && (
          <Label>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        <Button variant="outline" disabled className="w-full justify-between">
          {t('common.error', { defaultValue: 'Error loading' })}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const isDisabled =
    disabled ||
    (type === 'province' && !countryId) ||
    (type === 'city' && !provinceId);

  // Contextual placeholder: when the parent dependency isn't picked, prompt
  // the user toward it instead of showing the generic "انتخاب کنید".
  let triggerPlaceholder = placeholder || t('common.selectOption', { defaultValue: 'Select' });
  if (type === 'province' && !countryId) {
    triggerPlaceholder = t('common.selectCountryFirst', { defaultValue: 'Select a country first' });
  } else if (type === 'city' && !provinceId) {
    triggerPlaceholder = t('common.selectProvinceFirst', { defaultValue: 'Select a province first' });
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={isDisabled}
          >
            {selectedItem ? selectedItem.name : triggerPlaceholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder={t('common.search', { defaultValue: 'Search...' })} />
            <CommandList>
              <CommandEmpty>{t('common.noResults', { defaultValue: 'No results found.' })}</CommandEmpty>
              <CommandGroup>
                {selectedItem && (
                  <CommandItem
                    value={`__clear__ ${placeholder || t('common.selectOption', { defaultValue: 'Select' })}`}
                    onSelect={() => {
                      onValueChange('0');
                      setOpen(false);
                    }}
                    className="text-muted-foreground"
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    {placeholder || t('common.selectOption', { defaultValue: 'Select' })}
                  </CommandItem>
                )}
                {filteredData.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.name}
                    onSelect={() => {
                      onValueChange(item.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {item.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

