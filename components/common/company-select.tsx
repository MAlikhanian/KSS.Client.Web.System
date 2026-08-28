'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { useCompanies } from '@/hooks/use-companies';
import { useBrokerages } from '@/hooks/use-brokerages';
import { useInvestmentFunds } from '@/hooks/use-investment-funds';

export type CompanySelectSource = 'company' | 'brokerage' | 'fund';

interface CompanyOption {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  nationalId?: string;
}

interface CompanySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  source?: CompanySelectSource;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  showClearButton?: boolean;
}

function useOptions(source: CompanySelectSource): { items: CompanyOption[]; loading: boolean; error: string | null } {
  const companyHook = useCompanies();
  const brokerageHook = useBrokerages();
  const fundHook = useInvestmentFunds();

  if (source === 'brokerage') {
    return { items: brokerageHook.brokerages, loading: brokerageHook.loading, error: brokerageHook.error };
  }
  if (source === 'fund') {
    return { items: fundHook.investmentFunds, loading: fundHook.loading, error: fundHook.error };
  }
  return { items: companyHook.companies, loading: companyHook.loading, error: companyHook.error };
}

/**
 * Unified select for companies / brokerages / funds. All three sources return
 * the same CompanySelectDto shape from the backend, so the only difference
 * here is which hook drives the dropdown contents. The UI / search / display
 * is identical across sources.
 */
export function CompanySelect({
  value,
  onValueChange,
  source = 'company',
  placeholder,
  label,
  required = false,
  disabled = false,
  showClearButton = true,
}: CompanySelectProps) {
  const { t } = useTranslation('company-information');
  const { items, loading, error } = useOptions(source);
  const [open, setOpen] = useState(false);

  const defaultPlaceholder = placeholder ?? t('placeholders.selectedCompany', {
    defaultValue: 'Choose a company to submit information for',
  });
  const defaultLabel = label ?? t('fields.selectedCompany', { defaultValue: 'Select Company' });

  const selected = items.find((c) => c.id === value);

  if (loading) {
    return (
      <div className="space-y-2">
        <Label htmlFor="company-select">
          {defaultLabel}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
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
        <Label htmlFor="company-select">
          {defaultLabel}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Button variant="outline" disabled className="w-full justify-between">
          {t('common.error', { defaultValue: 'Error loading' })}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="company-select">
        {defaultLabel}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled}
            >
              {selected
                ? `${selected.name}${selected.nationalId ? ` (${selected.nationalId})` : ''}`
                : defaultPlaceholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder={t('search.placeholder', { defaultValue: 'Search companies...' })} />
              <CommandList>
                <CommandEmpty>{t('search.noResults', { defaultValue: 'No companies found.' })}</CommandEmpty>
                <CommandGroup>
                  {items.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.name} ${c.nationalId || ''} ${c.code || ''}`}
                      onSelect={() => {
                        onValueChange(c.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === c.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="flex-1">{c.name}</span>
                      {c.nationalId && (
                        <span className="text-xs text-muted-foreground font-mono">{c.nationalId}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {showClearButton && selected && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onValueChange('')}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
