'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { ShieldCheck } from 'lucide-react';
import type { Permission, Role } from '@/services/auth-api';

export function Sidebar() {
  const { t } = useTranslation('system-security-role-permissions');

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

  const totalAssignments = roles.reduce(
    (acc, r) => acc + (r.permissions?.length ?? 0),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('pageTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>
          <p className="text-sm text-foreground font-medium">
            {t('rolePermissions')}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('roles')}
              </p>
              <p className="text-xs text-muted-foreground">{roles.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
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
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">∑</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('permissionsAssigned')}
              </p>
              <p className="text-xs text-muted-foreground">
                {totalAssignments}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
