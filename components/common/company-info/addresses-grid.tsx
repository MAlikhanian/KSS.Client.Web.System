'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Star, StarOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatDateTime } from '@/lib/format-utils';

interface AddressItem {
  id: string;
  labelId: number;
  labelName: string;
  countryId: number;
  regionId: number;
  cityId: number;
  countryName?: string;
  regionName?: string;
  cityName?: string;
  postalCode: string;
  street1: string;
  street2: string | null;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string | null;
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

interface AddressesGridProps {
  addresses: AddressItem[];
  onAdd: (data: AddressFormData) => void;
  onEdit: (id: string, data: AddressFormData) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
  /** Hide add / edit / delete affordances entirely (view-only). */
  readOnly?: boolean;
  /** Label dropdown options — pass from the Common service (`useData('address-labels')`). */
  labelOptions?: { id: number; name: string }[];
  /** Override the section header. Defaults to the built-in "addresses" label. */
  title?: string;
  /** Show the count badge next to the section title. Defaults to true. */
  showCountBadge?: boolean;
  /** Show the colored section-number circle before the title. Defaults to true. */
  showSectionNumber?: boolean;
}

interface LookupItem {
  id: number;
  name: string;
  code?: string;
  postalCodeLength?: number;
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

const ADDRESS_LABEL_KEYS: { id: number; key: string; en: string }[] = [
  { id: 1, key: 'labels.address.headOffice', en: 'Head Office' },
  { id: 2, key: 'labels.address.branch', en: 'Branch' },
  { id: 3, key: 'labels.address.warehouse', en: 'Warehouse' },
  { id: 4, key: 'labels.address.factory', en: 'Factory' },
  { id: 5, key: 'labels.address.other', en: 'Other' },
];

export function AddressesGrid({ addresses, onAdd, onEdit, onDelete, disabled, readOnly = false, labelOptions, title, showCountBadge = true, showSectionNumber = true }: AddressesGridProps) {
  const { t, i18n } = useTranslation('company-information');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const defaultLabels = ADDRESS_LABEL_KEYS.map((l) => ({ id: l.id, name: t(l.key, { defaultValue: l.en }) }));
  const labels = labelOptions ?? defaultLabels;
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

  // Lookup maps for displaying names in the table
  const [countryMap, setCountryMap] = useState<Map<number, string>>(new Map());
  const [regionMap, setRegionMap] = useState<Map<number, string>>(new Map());
  const [cityMap, setCityMap] = useState<Map<number, string>>(new Map());
  const [postalCodeLengthMap, setPostalCodeLengthMap] = useState<Map<number, number>>(new Map());

  // Fetch countries on mount
  useEffect(() => {
    fetchCountries();
  }, []);

  // When addresses are loaded, fetch region/city names for display
  useEffect(() => {
    if (addresses.length === 0) return;

    const countryIds = Array.from(new Set(addresses.map((a) => a.countryId).filter(Boolean)));
    const regionIds = Array.from(new Set(addresses.map((a) => a.regionId).filter(Boolean)));

    countryIds.forEach(async (countryId) => {
      try {
        const res = await apiClientFetch(`/api/common/regions?countryId=${countryId}&languageId=12`);
        if (res.ok) {
          const data: LookupItem[] = await res.json();
          setRegionMap((prev) => {
            const map = new Map(prev);
            data.forEach((r) => map.set(r.id, r.name));
            return map;
          });
        }
      } catch (err) {
        console.error('Failed to fetch regions for countryId:', countryId, err);
      }
    });

    regionIds.forEach(async (regionId) => {
      try {
        const res = await apiClientFetch(`/api/common/cities?regionId=${regionId}&languageId=12`);
        if (res.ok) {
          const data: LookupItem[] = await res.json();
          setCityMap((prev) => {
            const map = new Map(prev);
            data.forEach((c) => map.set(c.id, c.name));
            return map;
          });
        }
      } catch (err) {
        console.error('Failed to fetch cities for regionId:', regionId, err);
      }
    });
  }, [addresses]);

  const fetchCountries = async () => {
    setLoadingCountries(true);
    try {
      const res = await apiClientFetch('/api/common/countries?languageId=12');
      if (res.ok) {
        const data: LookupItem[] = await res.json();
        setCountries(data);
        const map = new Map(data.map((c) => [c.id, c.name]));
        setCountryMap(map);
        const plMap = new Map<number, number>();
        data.forEach((c) => { if (c.postalCodeLength) plMap.set(c.id, c.postalCodeLength); });
        setPostalCodeLengthMap(plMap);
      }
    } catch (err) {
      console.error('Failed to fetch countries:', err);
    } finally {
      setLoadingCountries(false);
    }
  };

  const fetchRegions = useCallback(async (countryId: number) => {
    if (!countryId) {
      setRegions([]);
      setCities([]);
      return;
    }
    setLoadingRegions(true);
    try {
      const res = await apiClientFetch(`/api/common/regions?countryId=${countryId}&languageId=12`);
      if (res.ok) {
        const data: LookupItem[] = await res.json();
        setRegions(data);
        setRegionMap((prev) => {
          const map = new Map(prev);
          data.forEach((r) => map.set(r.id, r.name));
          return map;
        });
      }
    } catch (err) {
      console.error('Failed to fetch regions:', err);
    } finally {
      setLoadingRegions(false);
    }
  }, []);

  const fetchCities = useCallback(async (regionId: number) => {
    if (!regionId) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    try {
      const res = await apiClientFetch(`/api/common/cities?regionId=${regionId}&languageId=12`);
      if (res.ok) {
        const data: LookupItem[] = await res.json();
        setCities(data);
        setCityMap((prev) => {
          const map = new Map(prev);
          data.forEach((c) => map.set(c.id, c.name));
          return map;
        });
      }
    } catch (err) {
      console.error('Failed to fetch cities:', err);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  const handleCountryChange = (value: string) => {
    const countryId = parseInt(value);
    setFormData((p) => ({ ...p, countryId, regionId: 0, cityId: 0, postalCode: '' }));
    setRegions([]);
    setCities([]);
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
    setFormData({ ...emptyFormData });
    setRegions([]);
    setCities([]);
    setDialogOpen(true);
  };

  const handleOpenEdit = async (addr: AddressItem) => {
    setEditingId(addr.id);
    setFormData({
      labelId: addr.labelId,
      countryId: addr.countryId,
      regionId: addr.regionId,
      cityId: addr.cityId,
      postalCode: addr.postalCode,
      street1: addr.street1,
      street2: addr.street2 || '',
      isPrimary: addr.isPrimary,
    });
    // Load regions and cities for the editing address
    if (addr.countryId) {
      await fetchRegions(addr.countryId);
    }
    if (addr.regionId) {
      await fetchCities(addr.regionId);
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.street1.trim() || !formData.postalCode.trim() || !formData.countryId || !formData.regionId || !formData.cityId) return;
    if (editingId) {
      onEdit(editingId, formData);
    } else {
      onAdd(formData);
    }
    setFormData({ ...emptyFormData });
    setRegions([]);
    setCities([]);
    setEditingId(null);
    setDialogOpen(false);
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          {showSectionNumber && <span className="w-8 h-8 bg-slate-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">5</span>}
          {title ?? t('form.fields.headOfficeAddress', { defaultValue: 'Head Office Address' })}
          {!readOnly && showCountBadge && <Badge variant="secondary">{addresses.length}</Badge>}
        </CardTitle>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenAdd}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 ml-1" />
            {t('common.add', { defaultValue: 'Add' })}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('form.placeholders.noAddresses', { defaultValue: 'No addresses recorded' })}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.label', { defaultValue: 'Label' })}</TableHead>
                <TableHead>{t('form.fields.locationColumn', { defaultValue: 'Country / Province / City' })}</TableHead>
                <TableHead>{t('form.fields.headOfficeAddress', { defaultValue: 'Head Office Address' })}</TableHead>
                <TableHead>{t('form.fields.postalCode', { defaultValue: 'Postal Code' })}</TableHead>
                <TableHead className="w-16 text-center">{t('common.primary', { defaultValue: 'Primary' })}</TableHead>
                <TableHead className="w-24 text-center whitespace-nowrap">{t('common.verified', { defaultValue: 'Verified' })}</TableHead>
                <TableHead className="w-32">{t('common:createdAt', { defaultValue: 'Created At' })}</TableHead>
                <TableHead className="w-32">{t('common:updatedAt', { defaultValue: 'Last Modified' })}</TableHead>
                {!readOnly && <TableHead className="w-24">{t('common:actions', { defaultValue: 'Actions' })}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {addresses.map((addr) => (
                <TableRow key={addr.id}>
                  <TableCell>{addr.labelName || labels.find(l => l.id === addr.labelId)?.name}</TableCell>
                  <TableCell>
                    <span className="text-sm whitespace-nowrap">
                      {[
                        addr.countryName || getCountryName(addr.countryId),
                        addr.regionName || getRegionName(addr.regionId),
                        addr.cityName || getCityName(addr.cityId),
                      ].filter(Boolean).join(' / ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>{addr.street1}</div>
                    {addr.street2 && <div className="text-muted-foreground text-xs">{addr.street2}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-sm" dir="ltr">
                    {addr.postalCode?.length === 10
                      ? `${addr.postalCode.slice(0, 5)}-${addr.postalCode.slice(5)}`
                      : addr.postalCode}
                  </TableCell>
                  <TableCell className="text-center">
                    {addr.isPrimary
                      ? <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />
                      : <StarOff className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-center">
                    {addr.isVerified
                      ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                      : <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-sm" style={{ unicodeBidi: 'plaintext' }}>{formatDateTime(addr.createdAt, locale)}</TableCell>
                  <TableCell className="text-sm" style={{ unicodeBidi: 'plaintext' }}>{formatDateTime(addr.updatedAt, locale)}</TableCell>
                  {!readOnly && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(addr)}
                          disabled={disabled}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => onDelete(addr.id)}
                          disabled={disabled}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg border-white! dark:border-white!">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t('form.editAddress', { defaultValue: 'Edit Address' })
                : t('form.addAddress', { defaultValue: 'Add Address' })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Label */}
            <div className="space-y-2">
              <Label>{t('common.label', { defaultValue: 'Label' })}</Label>
              <Select
                value={formData.labelId.toString()}
                onValueChange={(v) => setFormData((p) => ({ ...p, labelId: parseInt(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {labels.map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label>{t('form.fields.country', { defaultValue: 'Country' })} <span className="text-destructive">*</span></Label>
              {loadingCountries ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading', { defaultValue: 'Loading...' })}
                </div>
              ) : (
                <Select
                  value={formData.countryId ? formData.countryId.toString() : ''}
                  onValueChange={handleCountryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.placeholders.selectCountry', { defaultValue: 'Select country' })} />
                  </SelectTrigger>
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
              <Label>{t('form.fields.province', { defaultValue: 'Province' })} <span className="text-destructive">*</span></Label>
              {loadingRegions ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading', { defaultValue: 'Loading...' })}
                </div>
              ) : (
                <Select
                  value={formData.regionId ? formData.regionId.toString() : ''}
                  onValueChange={handleRegionChange}
                  disabled={!formData.countryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.countryId ? t('form.placeholders.selectProvince', { defaultValue: 'Select province' }) : t('common.selectCountryFirst', { defaultValue: 'Select a country first' })} />
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
              <Label>{t('form.fields.city', { defaultValue: 'City' })} <span className="text-destructive">*</span></Label>
              {loadingCities ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading', { defaultValue: 'Loading...' })}
                </div>
              ) : (
                <Select
                  value={formData.cityId ? formData.cityId.toString() : ''}
                  onValueChange={handleCityChange}
                  disabled={!formData.regionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.regionId ? t('form.placeholders.selectCity', { defaultValue: 'Select city' }) : t('common.selectProvinceFirst', { defaultValue: 'Select a province first' })} />
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
              <Label>{t('form.fields.street1', { defaultValue: 'Address (Street 1)' })} <span className="text-destructive">*</span></Label>
              <Input
                value={formData.street1}
                onChange={(e) => setFormData((p) => ({ ...p, street1: e.target.value }))}
                placeholder={t('form.placeholders.street1', { defaultValue: 'Main street' })}
              />
            </div>

            {/* Street 2 */}
            <div className="space-y-2">
              <Label>{t('form.fields.street2', { defaultValue: 'Address (Street 2)' })}</Label>
              <Input
                value={formData.street2}
                onChange={(e) => setFormData((p) => ({ ...p, street2: e.target.value }))}
                placeholder={t('form.placeholders.street2', { defaultValue: 'No., floor, unit' })}
              />
            </div>

            {/* Postal Code */}
            <div className="space-y-2">
              <Label>{t('form.fields.postalCode', { defaultValue: 'Postal Code' })} <span className="text-destructive">*</span></Label>
              <Input
                dir="ltr"
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
              {formData.countryId > 0 && postalCodeLengthMap.get(formData.countryId) && (
                <p className="text-xs text-muted-foreground">
                  {t('form.placeholders.postalCodeLength', { count: postalCodeLengthMap.get(formData.countryId), defaultValue: 'Postal code must be {{count}} characters' })}
                </p>
              )}
            </div>

            {/* Is Primary */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="addressIsPrimary"
                checked={formData.isPrimary}
                onCheckedChange={(checked) => setFormData((p) => ({ ...p, isPrimary: checked === true }))}
              />
              <Label htmlFor="addressIsPrimary" className="cursor-pointer">
                {t('common.primary', { defaultValue: 'Primary' })}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!isFormValid}>
              {editingId
                ? t('common.save', { defaultValue: 'Save' })
                : t('common.add', { defaultValue: 'Add' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
