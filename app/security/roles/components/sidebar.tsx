'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { Shield } from 'lucide-react';
import type { Role } from '@/services/auth-api';

export function Sidebar() {
  const { t } = useTranslation('system-security-roles');

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await fetch('/api/auth/role');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const totalRoles = roles.length;
  const globalRoles = roles.filter((r) => !r.moduleId).length;
  const scopedRoles = totalRoles - globalRoles;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('pageTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <p className="text-sm text-foreground font-medium">{t('roles')}</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">#</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('roles')}
              </p>
              <p className="text-xs text-muted-foreground">{totalRoles}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('globalRole')}
              </p>
              <p className="text-xs text-muted-foreground">{globalRoles}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('modules')}
              </p>
              <p className="text-xs text-muted-foreground">{scopedRoles}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
