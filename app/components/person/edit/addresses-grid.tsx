'use client';

import { localizeDigits, formatDateTime, translateApiError } from '@/app/components/person/components/format-utils';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Star, StarOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClientFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';

const PERSIAN_LANGUAGE_ID = 12;

interface AddressItem {
  id: string;
  personId: string;
  labelId: number;
  countryId: number;
  regionId: number;
  cityId: number;
  postalCode: string;
  isPrimary: boolean;
  isVerified: boolean;
  translations: Array<{
    addressId: string;
    languageId: number;
    street1: string;
    street2?: string | null;
  }>;
}

interface AddressFormData {
  labelId: number;
  countryId: number;
  regionId: number;
  cityId: number;
  postalCode: string;
  street1: string;
  street2: string;
  isPrimary: boolean;
}

interface LookupItem {
  id: number;
  name: string;
  postalCodeLength?: number;
}

interface AddressLabelOption {
  id: number;
  name: string;
}

interface AddressesGridProps {
  personId: string;
  labelOptions: AddressLabelOption[];
  isReadOnly?: boolean;
}

const emptyFormData: AddressFormData = {
  labelId: 1,
  countryId: 0,
  regionId: 0,
  cityId: 0,
  postalCode: '',
  street1: '',
  street2: '',
  isPrimary: false,
};

export function AddressesGrid({ personId, labelOptions, isReadOnly = false }: AddressesGridProps) {
  const { t, i18n } = useTranslation('person-address');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    toast.custom(
      () => (
        <Alert variant="mono" icon={type === 'success' ? 'success' : 'destructive'}>
          <AlertIcon>
            {type === 'success' ? <RiCheckboxCircleFill /> : <RiErrorWarningFill />}
          </AlertIcon>
          <AlertTitle>{message}</AlertTitle>
        </Alert>
      ),
      { position: 'top-center' },
    );
  }, []);

  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({ ...emptyFormData });

  // Lookup data
  const [countries, setCountries] = useState<LookupItem[]>([]);
  const [regions, setRegions] = useState<LookupItem[]>([]);
  const [cities, setCities] = useState<LookupItem[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Lookup maps for displaying names in table
  const [countryMap, setCountryMap] = useState<Map<number, string>>(new Map());
  const [regionMap, setRegionMap] = useState<Map<number, string>>(new Map());
  const [cityMap, setCityMap] = useState<Map<number, string>>(new Map());
  const [postalCodeLengthMap, setPostalCodeLengthMap] = useState<Map<number, number>>(new Map());

  // Load addresses via per-section endpoint.
  const loadAddresses = useCallback(async () => {
    try {
      const response = await fetch(`/api/person/address?personId=${personId}`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data)) {
        setAddresses(data);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  }, [personId]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  // Fetch countries on mount
  useEffect(() => { fetchCountries(); }, []);

  // When addresses load, fetch region/city names for display
  useEffect(() => {
    if (addresses.length === 0) return;

    const countryIds = Array.from(new Set(addresses.map((a) => a.countryId).filter(Boolean)));
    const regionIds = Array.from(new Set(addresses.map((a) => a.regionId).filter(Boolean)));

    countryIds.forEach(async (countryId) => {
      try {
        const res = await apiClientFetch(`/api/common/regions?countryId=${countryId}&languageId=${PERSIAN_LANGUAGE_ID}`);
        if (res.ok) {
          const data: LookupItem[] = await res.json();
          setRegionMap((prev) => { const map = new Map(prev); data.forEach((r) => map.set(r.id, r.name)); return map; });
        }
      } catch (err) { console.error('Failed to fetch regions:', err); }
    });

    regionIds.forEach(async (regionId) => {
      try {
        const res = await apiClientFetch(`/api/common/cities?regionId=${regionId}&languageId=${PERSIAN_LANGUAGE_ID}`);
        if (res.ok) {
          const data: LookupItem[] = await res.json();
          setCityMap((prev) => { const map = new Map(prev); data.forEach((c) => map.set(c.id, c.name)); return map; });
        }
      } catch (err) { console.error('Failed to fetch cities:', err); }
    });
  }, [addresses]);

  const fetchCountries = async () => {
    setLoadingCountries(true);
    try {
      const res = await apiClientFetch(`/api/common/countries?languageId=${PERSIAN_LANGUAGE_ID}`);
      if (res.ok) {
        const data: LookupItem[] = await res.json();
        setCountries(data);
        setCountryMap(new Map(data.map((c) => [c.id, c.name])));
        const plMap = new Map<number, number>();
        data.forEach((c) => { if (c.postalCodeLength) plMap.set(c.id, c.postalCodeLength); });
        setPostalCodeLengthMap(plMap);
      }
    } catch (err) { console.error('Failed to fetch countries:', err); }
    finally { setLoadingCountries(false); }
  };

  const fetchRegions = useCallback(async (countryId: number) => {
    if (!countryId) { setRegions([]); setCities([]); return; }
    setLoadingRegions(true);
    try {
      const res = await apiClientFetch(`/api/common/regions?countryId=${countryId}&languageId=${PERSIAN_LANGUAGE_ID}`);
      if (res.ok) {
        const data: LookupItem[] = await res.json();
        setRegions(data);
        setRegionMap((prev) => { const map = new Map(prev); data.forEach((r) => map.set(r.id, r.name)); return map; });
      }
    } catch (err) { console.error('Failed to fetch regions:', err); }
    finally { setLoadingRegions(false); }
  }, []);

  const fetchCities = useCallback(async (regionId: number) => {
    if (!regionId) { setCities([]); return; }
    setLoadingCities(true);
    try {
      const res = await apiClientFetch(`/api/common/cities?regionId=${regionId}&languageId=${PERSIAN_LANGUAGE_ID}`);
      if (res.ok) {
        const data: LookupItem[] = await res.json();
        setCities(data);
        setCityMap((prev) => { const map = new Map(prev); data.forEach((c) => map.set(c.id, c.name)); return map; });
      }
    } catch (err) { console.error('Failed to fetch cities:', err); }
    finally { setLoadingCities(false); }
  }, []);

  const handleCountryChange = (value: string) => {
    const countryId = parseInt(value);
    setFormData((p) => ({ ...p, countryId, regionId: 0, cityId: 0, postalCode: '' }));
    setRegions([]); setCities([]);
    fetchRegions(countryId);
  };

  const handleRegionChange = (value: string) => {
    const regionId = parseInt(value);
    setFormData((p) => ({ ...p, regionId, cityId: 0 }));
    setCities([]);
    fetchCities(regionId);
  };

  const handleCityChange = (value: string) => {
    setFormData((p) => ({ ...p, cityId: parseInt(value) }));
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ ...emptyFormData, labelId: labelOptions[0]?.id || 1 });
    setRegions([]); setCities([]);
    setDialogOpen(true);
  };

  const handleOpenEdit = async (addr: AddressItem) => {
    const faT = addr.translations?.find((tr) => tr.languageId === PERSIAN_LANGUAGE_ID);
    setEditingId(addr.id);
    setFormData({
      labelId: addr.labelId,
      countryId: addr.countryId,
      regionId: addr.regionId,
      cityId: addr.cityId,
      postalCode: addr.postalCode,
      street1: faT?.street1 || '',
      street2: faT?.street2 || '',
      isPrimary: addr.isPrimary,
    });
    if (addr.countryId) await fetchRegions(addr.countryId);
    if (addr.regionId) await fetchCities(addr.regionId);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;

    const translations = [
      { languageId: PERSIAN_LANGUAGE_ID, street1: formData.street1, street2: formData.street2 || undefined },
    ];

    try {
      if (editingId) {
        const existingAddr = addresses.find((a) => a.id === editingId);
        const { translations: _tr, ...existingFields } = (existingAddr as unknown as Record<string, unknown>) || {}; void _tr;
        const response = await fetch('/api/person/address', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...existingFields,
            id: editingId,
            personId,
            labelId: formData.labelId,
            countryId: formData.countryId,
            regionId: formData.regionId,
            cityId: formData.cityId,
            postalCode: formData.postalCode,
            isPrimary: formData.isPrimary,
            translations,
          }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to update address');
        }
      } else {
        const newId = crypto.randomUUID();
        const response = await fetch('/api/person/address', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newId,
            personId,
            labelId: formData.labelId,
            countryId: formData.countryId,
            regionId: formData.regionId,
            cityId: formData.cityId,
            postalCode: formData.postalCode,
            isPrimary: formData.isPrimary,
            isVerified: false,
            translations,
          }),
        });
        if (!response.ok) throw new Error('Failed to add address');
      }

      await loadAddresses();
      setDialogOpen(false);
      setEditingId(null);
      setFormData({ ...emptyFormData });
      setRegions([]); setCities([]);
      showToast(editingId
        ? t('updated', { defaultValue: 'Address updated' })
        : t('added', { defaultValue: 'Address added' }), 'success');
    } catch (error) {
      showToast(error instanceof Error ? translateApiError(error.message, t) : t('common:error', { defaultValue: 'An error occurred' }), 'error');
    }
  };

  const handleDelete = async (addr: AddressItem) => {
    try {

      await fetch('/api/person/address', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: addr.id }),
      });
      await loadAddresses();
      showToast(t('deleted', { defaultValue: 'Address deleted' }), 'error');
    } catch {
      showToast(t('deleteFailed', { defaultValue: 'Failed to delete address' }), 'error');
    }
  };

  const selectedPostalCodeLength = postalCodeLengthMap.get(formData.countryId);
  const isPostalCodeValid =
    formData.postalCode.trim() !== '' &&
    (selectedPostalCodeLength === undefined || formData.postalCode.length === selectedPostalCodeLength);

  const isFormValid =
    formData.street1.trim() !== '' &&
    isPostalCodeValid &&
    formData.countryId > 0 &&
    formData.regionId > 0 &&
    formData.cityId > 0;

  const getCountryName = (id: number) => countryMap.get(id) || '';
  const getRegionName = (id: number) => regionMap.get(id) || '';
  const getCityName = (id: number) => cityMap.get(id) || '';
  const getLabelName = (id: number) => labelOptions.find((l) => l.id === id)?.name || '';

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {t('sectionTitle', { defaultValue: 'Addresses' })}
          </span>
          <Badge variant="secondary">{addresses.length}</Badge>
        </div>
        {!isReadOnly && (
          <Button type="button" variant="outline" size="sm" onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 ml-1" />
            {t('common:add', { defaultValue: 'Add' })}
          </Button>
        )}
      </div>

      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('noItems', { defaultValue: 'No addresses registered' })}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common:label', { defaultValue: 'Label' })}</TableHead>
              <TableHead>{t('location', { defaultValue: 'Country / Province / City' })}</TableHead>
              <TableHead>{t('address', { defaultValue: 'Address' })}</TableHead>
              <TableHead>{t('postalCode', { defaultValue: 'Postal Code' })}</TableHead>
              <TableHead>{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
              <TableHead>{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
              <TableHead className="w-16 text-center">{t('common:primary', { defaultValue: 'Primary' })}</TableHead>
              <TableHead className="w-24">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {addresses.map((addr) => {
              const faT = addr.translations?.find((tr) => tr.languageId === PERSIAN_LANGUAGE_ID);
              return (
                <TableRow key={addr.id}>
                  <TableCell>{getLabelName(addr.labelId)}</TableCell>
                  <TableCell>
                    {[getCountryName(addr.countryId), getRegionName(addr.regionId), getCityName(addr.cityId)]
                      .filter(Boolean)
                      .join(' / ')}
                  </TableCell>
                  <TableCell>
                    <div>{localizeDigits(faT?.street1 || '', locale)}</div>
                    {faT?.street2 && <div>{localizeDigits(faT.street2, locale)}</div>}
                  </TableCell>
                  <TableCell>
                    {localizeDigits(addr.postalCode?.length === 10
                      ? `${addr.postalCode.slice(0, 5)}-${addr.postalCode.slice(5)}`
                      : addr.postalCode, locale)}
                  </TableCell>
                  <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime((addr as unknown as Record<string, unknown>).createdAt as string, locale)}</TableCell>
                  <TableCell style={{ unicodeBidi: "plaintext" }}>{formatDateTime((addr as unknown as Record<string, unknown>).updatedAt as string, locale)}</TableCell>
                  <TableCell>
                    {addr.isPrimary
                      ? <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />
                      : <StarOff className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(addr)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(addr)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg border-white! dark:border-white!">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t('editDialog', { defaultValue: 'Edit Address' })
                : t('addDialog', { defaultValue: 'Add Address' })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Label */}
            <div className="space-y-2">
              <Label>{t('common:label', { defaultValue: 'Label' })}</Label>
              <Select
                value={formData.labelId.toString()}
                onValueChange={(v) => setFormData((p) => ({ ...p, labelId: parseInt(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {labelOptions.map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label>{t('common:country', { defaultValue: 'Country' })} <span className="text-destructive">*</span></Label>
              {loadingCountries ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('common:loading', { defaultValue: 'Loading...' })}
                </div>
              ) : (
                <Select value={formData.countryId ? formData.countryId.toString() : ''} onValueChange={handleCountryChange}>
                  <SelectTrigger><SelectValue placeholder={t('selectCountry', { defaultValue: 'Select Country' })} /></SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Region */}
            <div className="space-y-2">
              <Label>{t('common:region', { defaultValue: 'Province' })} <span className="text-destructive">*</span></Label>
              {loadingRegions ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('common:loading', { defaultValue: 'Loading...' })}
                </div>
              ) : (
                <Select value={formData.regionId ? formData.regionId.toString() : ''} onValueChange={handleRegionChange} disabled={!formData.countryId}>
                  <SelectTrigger>
                    <SelectValue placeholder={formData.countryId
                      ? t('selectRegion', { defaultValue: 'Select Province' })
                      : t('selectCountryFirst', { defaultValue: 'Select country first' })} />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label>{t('common:city', { defaultValue: 'City' })} <span className="text-destructive">*</span></Label>
              {loadingCities ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('common:loading', { defaultValue: 'Loading...' })}
                </div>
              ) : (
                <Select value={formData.cityId ? formData.cityId.toString() : ''} onValueChange={handleCityChange} disabled={!formData.regionId}>
                  <SelectTrigger>
                    <SelectValue placeholder={formData.regionId
                      ? t('selectCity', { defaultValue: 'Select City' })
                      : t('selectRegionFirst', { defaultValue: 'Select province first' })} />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Street 1 */}
            <div className="space-y-2">
              <Label>{t('street1', { defaultValue: 'Address (Street 1)' })} <span className="text-destructive">*</span></Label>
              <Input
                value={formData.street1}
                onChange={(e) => setFormData((p) => ({ ...p, street1: e.target.value }))}
                placeholder={t('street1Placeholder', { defaultValue: 'Main Street' })}
              />
            </div>

            {/* Street 2 */}
            <div className="space-y-2">
              <Label>{t('street2', { defaultValue: 'Address (Street 2)' })}</Label>
              <Input
                value={formData.street2}
                onChange={(e) => setFormData((p) => ({ ...p, street2: e.target.value }))}
                placeholder={t('street2Placeholder', { defaultValue: 'Building, Floor, Unit' })}
              />
            </div>

            {/* Postal Code */}
            <div className="space-y-2">
              <Label>{t('postalCode', { defaultValue: 'Postal Code' })} <span className="text-destructive">*</span></Label>
              <Input
               
                value={formData.postalCode}
                onChange={(e) => {
                  const maxLen = postalCodeLengthMap.get(formData.countryId);
                  const val = e.target.value.replace(/\s/g, '');
                  if (maxLen && val.length > maxLen) return;
                  setFormData((p) => ({ ...p, postalCode: val }));
                }}
                maxLength={postalCodeLengthMap.get(formData.countryId)}
                placeholder={postalCodeLengthMap.get(formData.countryId)
                  ? '0'.repeat(postalCodeLengthMap.get(formData.countryId)!)
                  : '1234567890'}
              />
              {formData.countryId > 0 && selectedPostalCodeLength && (
                <p className="text-xs text-muted-foreground">
                  {t('postalCodeLength', { defaultValue: `Postal code must be ${selectedPostalCodeLength} characters` })}
                </p>
              )}
            </div>

            {/* Is Primary */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="personAddressIsPrimary"
                checked={formData.isPrimary}
                onCheckedChange={(checked) => setFormData((p) => ({ ...p, isPrimary: checked === true }))}
              />
              <Label htmlFor="personAddressIsPrimary" className="cursor-pointer">
                {t('common:primary', { defaultValue: 'Primary' })}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common:cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!isFormValid}>
              {t('common:save', { defaultValue: 'Save' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
