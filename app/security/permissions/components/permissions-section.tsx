'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import type { Permission } from '@/services/auth-api';
import type {
  Module,
  Resource,
  ModuleTranslation,
  ResourceTranslation,
} from '@/services/common-api';

const ALL = '__all__';

export function PermissionsSection() {
  const { t, i18n } = useTranslation('system-security-permissions');
  const uiLangId = i18n.language === 'fa' ? 12 : 10;

  const { data: permissions = [], isLoading } = useQuery<Permission[]>({
    queryKey: ['admin-permissions'],
    queryFn: async () => {
      const res = await fetch('/api/auth/permission');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load permissions');
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

  const { data: resources = [] } = useQuery<Resource[]>({
    queryKey: ['admin-resources'],
    queryFn: async () => {
      const res = await fetch('/api/common/resource');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: resourceTranslations = [] } = useQuery<ResourceTranslation[]>({
    queryKey: ['admin-resource-translations'],
    queryFn: async () => {
      const res = await fetch('/api/common/resource-translation');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const moduleNameById = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return '—';
      const tr = moduleTranslations.find(
        (t) => t.moduleId === id && t.languageId === uiLangId,
      );
      if (tr) return tr.name;
      return modules.find((m) => m.id === id)?.code ?? '—';
    },
    [modules, moduleTranslations, uiLangId],
  );

  const resourceNameById = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return '—';
      const tr = resourceTranslations.find(
        (t) => t.resourceId === id && t.languageId === uiLangId,
      );
      if (tr) return tr.name;
      return resources.find((r) => r.id === id)?.code ?? '—';
    },
    [resources, resourceTranslations, uiLangId],
  );

  const permissionLocalById = useCallback(
    (id: string): { name: string; description: string } => {
      const p = permissions.find((x) => x.id === id);
      if (!p) return { name: '—', description: '' };
      const tr = p.translations?.find((t) => t.languageId === uiLangId);
      return {
        name: tr?.name || p.code,
        description: tr?.description ?? '',
      };
    },
    [permissions, uiLangId],
  );

  // Top toolbar filters
  const [filterModuleId, setFilterModuleId] = useState<string>(ALL);
  const [filterResourceId, setFilterResourceId] = useState<string>(ALL);

  const filterResourceOptions = useMemo(() => {
    if (filterModuleId === ALL) return resources;
    return resources.filter((r) => r.moduleId === filterModuleId);
  }, [resources, filterModuleId]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      if (filterResourceId !== ALL) {
        return p.resourceId === filterResourceId;
      }
      if (filterModuleId !== ALL) {
        const res = resources.find((r) => r.id === p.resourceId);
        return res?.moduleId === filterModuleId;
      }
      return true;
    });
  }, [permissions, filterModuleId, filterResourceId, resources]);

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('permissions')}</h2>
        </div>

        {/* Top filter toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t('module')}</Label>
            <Select
              value={filterModuleId}
              onValueChange={(v) => {
                setFilterModuleId(v);
                setFilterResourceId(ALL);
              }}
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
          <div className="space-y-1">
            <Label>{t('resource')}</Label>
            <Select
              value={filterResourceId}
              onValueChange={(v) => setFilterResourceId(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectResource')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('allResources')}</SelectItem>
                {filterResourceOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {resourceNameById(r.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">…</p>
        ) : filteredPermissions.length === 0 ? (
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
                <TableHead>{t('resource')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPermissions.map((p, idx) => {
                const loc = permissionLocalById(p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <code className="font-mono text-xs">{p.code}</code>
                    </TableCell>
                    <TableCell>{loc.name}</TableCell>
                    <TableCell>{loc.description}</TableCell>
                    <TableCell>{moduleNameById(p.moduleId)}</TableCell>
                    <TableCell>{resourceNameById(p.resourceId)}</TableCell>
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
