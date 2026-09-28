'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { User } from 'lucide-react';

interface SidebarProps {
  personId?: string;
}

const PROFILE_PHOTO_TYPE_ID = 8;

export function Sidebar({ personId }: SidebarProps) {
  const { t } = useTranslation('person-sidebar');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const loadProfilePhoto = useCallback(async () => {
    if (!personId) {
      setProfilePhotoUrl(null);
      return;
    }

    try {
      // Get documents for this person
      const response = await fetch(`/api/person/document?personId=${personId}`);
      if (!response.ok) return;
      const docs = await response.json();

      // Find profile photo document
      const profileDoc = Array.isArray(docs)
        ? docs.find((d: { documentTypeId: number }) => d.documentTypeId === PROFILE_PHOTO_TYPE_ID)
        : null;

      if (!profileDoc) {
        setProfilePhotoUrl(null);
        return;
      }

      // Fetch the image through orchestrator
      const fileResponse = await fetch(`/api/person/document/${profileDoc.id}/file?personId=${personId}`);
      if (!fileResponse.ok) {
        setProfilePhotoUrl(null);
        return;
      }

      const blob = await fileResponse.blob();
      const url = URL.createObjectURL(blob);
      setProfilePhotoUrl(url);
    } catch {
      setProfilePhotoUrl(null);
    }
  }, [personId]);

  useEffect(() => {
    loadProfilePhoto();
  }, [loadProfilePhoto]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (profilePhotoUrl) URL.revokeObjectURL(profilePhotoUrl);
    };
  }, [profilePhotoUrl]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('title', { defaultValue: 'Person Cardex' })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Profile Photo */}
        <div className="mb-6 text-center">
          <div className="w-24 h-24 rounded-full mx-auto mb-3 overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt={t('profile', { defaultValue: 'Person Profile' })}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-white" />
            )}
          </div>
          <p className="text-sm text-foreground font-medium">
            {t('profile', { defaultValue: 'Person Profile' })}
          </p>
          {!personId && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('profileDescription', { defaultValue: 'Select a person to view profile' })}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">📊</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('completionRate', { defaultValue: 'Completion Rate' })}
              </p>
              <p className="text-xs text-muted-foreground">0%</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">✅</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('verifiedInfo', { defaultValue: 'Verified Information' })}
              </p>
              <p className="text-xs text-muted-foreground">0</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">⏱️</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('lastUpdated', { defaultValue: 'Last Updated' })}
              </p>
              <p className="text-xs text-muted-foreground">-</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">📈</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('status', { defaultValue: 'Status' })}
              </p>
              <p className="text-xs text-muted-foreground">-</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
