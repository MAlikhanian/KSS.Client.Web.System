'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { Key } from 'lucide-react';
import type { Permission } from '@/services/auth-api';
import type { Module, Resource } from '@/services/common-api';

export function Sidebar() {
  const { t } = useTranslation('system-security-permissions');

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

  const { data: resources = [] } = useQuery<Resource[]>({
    queryKey: ['admin-resources'],
    queryFn: async () => {
      const res = await fetch('/api/common/resource');
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('pageTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
            <Key className="w-9 h-9 text-white" />
          </div>
          <p className="text-sm text-foreground font-medium">
            {t('permissions')}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">#</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('permissions')}
              </p>
              <p className="text-xs text-muted-foreground">
                {permissions.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('modules')}
              </p>
              <p className="text-xs text-muted-foreground">{modules.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('resources')}
              </p>
              <p className="text-xs text-muted-foreground">{resources.length}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
