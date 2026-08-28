'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import type { Role } from '@/services/auth-api';
import type { Module, ModuleTranslation } from '@/services/common-api';

const ALL = '__all__';

export function RolesSection() {
  const { t, i18n } = useTranslation('system-security-roles');
  const uiLangId = i18n.language === 'fa' ? 12 : 10;

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await fetch('/api/auth/role');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load roles');
      }
      return res.json();
    },
  });

  const { data: modules = [] } = useQuery<Module[]>({
    queryKey: ['admin-modules'],
    queryFn: async () => {
      const res = await fetch('/api/common/module');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: moduleTranslations = [] } = useQuery<ModuleTranslation[]>({
    queryKey: ['admin-module-translations'],
    queryFn: async () => {
      const res = await fetch('/api/common/module-translation');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const moduleNameById = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return t('globalRole');
      const tr = moduleTranslations.find(
        (mt) => mt.moduleId === id && mt.languageId === uiLangId,
      );
      if (tr) return tr.name;
      return modules.find((m) => m.id === id)?.code ?? '—';
    },
    [modules, moduleTranslations, uiLangId, t],
  );

  const roleLocalById = useCallback(
    (id: string): { name: string; description: string } => {
      const r = roles.find((x) => x.id === id);
      if (!r) return { name: '—', description: '' };
      const tr = r.translations?.find((tt) => tt.languageId === uiLangId);
      return {
        name: tr?.name || r.code,
        description: tr?.description ?? '',
      };
    },
    [roles, uiLangId],
  );

  // Top toolbar filters
  const [filterModuleId, setFilterModuleId] = useState<string>(ALL);
  const [includeGlobal, setIncludeGlobal] = useState<boolean>(true);

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const isGlobal = !r.moduleId;
      if (filterModuleId === ALL) {
        return isGlobal ? includeGlobal : true;
      }
      if (isGlobal) return includeGlobal;
      return r.moduleId === filterModuleId;
    });
  }, [roles, filterModuleId, includeGlobal]);

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('roles')}</h2>
        </div>

        {/* Top filter toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t('module')}</Label>
            <Select
              value={filterModuleId}
              onValueChange={(v) => setFilterModuleId(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectModule')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('allModules')}</SelectItem>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {moduleNameById(m.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 self-end pb-1">
            <Switch
              checked={includeGlobal}
              onCheckedChange={(checked) => setIncludeGlobal(checked)}
            />
            <Label>{t('includeGlobalRoles')}</Label>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">…</p>
        ) : filteredRoles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">—</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{t('code')}</TableHead>
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('description')}</TableHead>
                <TableHead>{t('module')}</TableHead>
                <TableHead>{t('permissions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((r, idx) => {
                const loc = roleLocalById(r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <code className="font-mono text-xs">{r.code}</code>
                    </TableCell>
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell>{loc.description}</TableCell>
                    <TableCell>{moduleNameById(r.moduleId)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.permissions.length}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
