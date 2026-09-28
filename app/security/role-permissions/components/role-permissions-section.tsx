'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiCheckboxCircleFill, RiCloseCircleFill } from '@remixicon/react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import type { Permission, Role } from '@/services/auth-api';
import type {
  Module,
  Resource,
  ModuleTranslation,
  ResourceTranslation,
} from '@/services/common-api';

const ALL = '__all__';

export function RolePermissionsSection() {
  const { t, i18n } = useTranslation('system-security-role-permissions');
  const uiLangId = i18n.language === 'fa' ? 12 : 10;

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await fetch('/api/auth/role');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: permissions = [] } = useQuery<Permission[]>({
    queryKey: ['admin-permissions'],
    queryFn: async () => {
      const res = await fetch('/api/auth/permission');
      if (!res.ok) return [];
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
        (mt) => mt.moduleId === id && mt.languageId === uiLangId,
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
        (rt) => rt.resourceId === id && rt.languageId === uiLangId,
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
      const tr = p.translations?.find((tt) => tt.languageId === uiLangId);
      return {
        name: tr?.name || p.code,
        description: tr?.description ?? '',
      };
    },
    [permissions, uiLangId],
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

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [filterModuleId, setFilterModuleId] = useState<string>(ALL);
  const [filterResourceId, setFilterResourceId] = useState<string>(ALL);

  // Resource options scoped by selected module filter.
  const filterResourceOptions = useMemo(() => {
    if (filterModuleId === ALL) return resources;
    return resources.filter((r) => r.moduleId === filterModuleId);
  }, [resources, filterModuleId]);

  // The set of permission codes assigned to the selected role.
  const assignedCodes = useMemo<Set<string>>(() => {
    if (!selectedRoleId) return new Set();
    const role = roles.find((r) => r.id === selectedRoleId);
    if (!role) return new Set();
    return new Set(role.permissions);
  }, [selectedRoleId, roles]);

  // Build the visible-permission list using the Module/Resource filters.
  const visiblePermissions = useMemo(() => {
    return permissions.filter((p) => {
      if (filterResourceId !== ALL) return p.resourceId === filterResourceId;
      if (filterModuleId !== ALL) {
        const res = resources.find((r) => r.id === p.resourceId);
        return res?.moduleId === filterModuleId;
      }
      return true;
    });
  }, [permissions, filterModuleId, filterResourceId, resources]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    visiblePermissions.forEach((p) => {
      const key = moduleNameById(p.moduleId) || '—';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });
    return Array.from(groups.entries());
  }, [visiblePermissions, moduleNameById]);

  // Acknowledge resourceNameById is used in the resource-filter dropdown below.
  void resourceNameById;

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>{t('selectRole')}</Label>
            <Select
              value={selectedRoleId ?? ''}
              onValueChange={(v) => setSelectedRoleId(v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectRole')} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {roleLocalById(r.id).name || r.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
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
          <div className="space-y-2">
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

        {!selectedRoleId ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t('noRoleSelected')}
          </p>
        ) : (
          <div className="space-y-4 border rounded-md p-3 max-h-[28rem] overflow-y-auto">
            {groupedPermissions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">—</p>
            ) : (
              groupedPermissions.map(([groupName, perms]) => (
                <div key={groupName} className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                    {groupName}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {perms.map((p) => {
                      const loc = permissionLocalById(p.id);
                      const has = assignedCodes.has(p.code);
                      return (
                        <div
                          key={p.id}
                          className="flex items-start gap-2 text-sm"
                        >
                          {has ? (
                            <RiCheckboxCircleFill className="h-4 w-4 mt-0.5 text-green-600 dark:text-green-500 shrink-0" />
                          ) : (
                            <RiCloseCircleFill className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          )}
                          <span>
                            <span className="font-mono text-xs">{p.code}</span>
                            <span className="text-muted-foreground ms-2">
                              {loc.name}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
