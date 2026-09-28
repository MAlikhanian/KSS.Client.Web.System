'use client';

import { useState, useMemo } from 'react';
import { Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { useTranslation } from '@/hooks/useTranslation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDateTime } from '@/app/components/person/components/format-utils';

interface ImportUploadRow {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  storageInstanceId: number;
  statusId: number;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
  isActive: boolean;
}

export function ImportPersonContent() {
  const { t, i18n } = useTranslation('person-import');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.roles?.includes('SuperAdmin') ?? false;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  // Reject dialog state (SuperAdmin admin section).
  const [rejectTarget, setRejectTarget] = useState<ImportUploadRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: uploads = [], isLoading } = useQuery<ImportUploadRow[]>({
    queryKey: ['my-import-uploads'],
    queryFn: async () => {
      const res = await fetch('/api/import', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ||
            t('table.loadError', { defaultValue: 'Failed to load uploads.' }),
        );
      }
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ||
            t('upload.error', { defaultValue: 'Upload failed.' }),
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-import-uploads'] });
      toast.success(
        t('upload.success', { defaultValue: 'File uploaded successfully.' }),
      );
      setSelectedFile(null);
      setFileInputKey((k) => k + 1);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t('upload.error', { defaultValue: 'Upload failed.' }),
      );
    },
  });

  // ─── SuperAdmin: All Uploads ───
  const { data: allUploads = [], isLoading: isLoadingAll } = useQuery<
    ImportUploadRow[]
  >({
    queryKey: ['all-import-uploads'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const res = await fetch('/system/api/import/all', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ||
            t('table.loadError', { defaultValue: 'Failed to load uploads.' }),
        );
      }
      return res.json();
    },
  });

  // Resolve uploader person-id (createdBy) → "Name (nationalId)". The import
  // service stores only the uploader's id, so we fetch ONLY the ids shown in the
  // grid, batched, via POST /Api/Person/Names — no full directory load.
  const uploaderIds = useMemo(
    () =>
      Array.from(
        new Set(
          allUploads.map((r) => r.createdBy?.toLowerCase()).filter(Boolean),
        ),
      ),
    [allUploads],
  );

  const { data: uploaderNames = [] } = useQuery<
    Array<{ id: string; firstName: string; lastName: string; nationalId: string }>
  >({
    queryKey: ['person-names', uploaderIds],
    enabled: isSuperAdmin && uploaderIds.length > 0,
    queryFn: async () => {
      const res = await fetch('/api/person/names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: uploaderIds, languageId: 12 }),
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const uploaderById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of uploaderNames) {
      const name = `${p.firstName} ${p.lastName}`.trim();
      map.set(
        p.id.toLowerCase(),
        name ? `${name} (${p.nationalId})` : p.nationalId || p.id,
      );
    }
    return map;
  }, [uploaderNames]);

  const setStatusMutation = useMutation({
    mutationFn: async (vars: {
      id: string;
      statusId: number;
      reviewNote?: string | null;
    }) => {
      const res = await fetch('/system/api/import/review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ||
            t('upload.error', { defaultValue: 'Upload failed.' }),
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-import-uploads'] });
      queryClient.invalidateQueries({ queryKey: ['my-import-uploads'] });
      toast.success(
        t('upload.success', { defaultValue: 'File uploaded successfully.' }),
      );
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t('upload.error', { defaultValue: 'Upload failed.' }),
      );
    },
  });

  const handleConfirmReject = () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setStatusMutation.mutate(
      { id: rejectTarget.id, statusId: 4, reviewNote: rejectReason.trim() },
      {
        onSuccess: () => {
          setRejectTarget(null);
          setRejectReason('');
        },
      },
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const renderStatus = (statusId: number) => {
    // 4-status review workflow: 1=Uploaded, 2=Processing, 3=Done, 4=Rejected.
    if (statusId === 2) {
      return (
        <Badge variant="warning" appearance="light">
          {t('status.processing', { defaultValue: 'Processing' })}
        </Badge>
      );
    }
    if (statusId === 3) {
      return (
        <Badge variant="success" appearance="light">
          {t('status.done', { defaultValue: 'Done' })}
        </Badge>
      );
    }
    if (statusId === 4) {
      return (
        <Badge variant="destructive" appearance="light">
          {t('status.rejected', { defaultValue: 'Rejected' })}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" appearance="light">
        {t('status.uploaded', { defaultValue: 'Uploaded' })}
      </Badge>
    );
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/*
        Title Card lives OUTSIDE the descendant-tint wrapper below so its color
        override actually wins (descendant selectors beat Card-level classes on
        specificity even with `!`).
      */}
      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card className="bg-teal-50! dark:bg-teal-950/25! shadow-lg shadow-black/5">
          <CardContent className="py-5">
            <Toolbar>
              <ToolbarHeading>
                <ToolbarPageTitle
                  text={t('toolbar.title', { defaultValue: 'Data Upload' })}
                />
                <ToolbarDescription>
                  {t('toolbar.description', {
                    defaultValue: 'Bulk-import members from an Excel file',
                  })}
                </ToolbarDescription>
              </ToolbarHeading>
            </Toolbar>
          </CardContent>
        </Card>
      </div>

      {/* Teal glass tint on every section Card. */}
      <div
        className={
          '[&_div.rounded-xl.bg-card]:bg-teal-50! ' +
          '[&_div.rounded-xl.bg-card]:border-teal-100! ' +
          'dark:[&_div.rounded-xl.bg-card]:bg-teal-950/25! ' +
          'dark:[&_div.rounded-xl.bg-card]:border-teal-900! ' +
          '[&_div.rounded-xl.bg-card]:shadow-lg ' +
          '[&_div.rounded-xl.bg-card]:shadow-black/5 ' +
          '[&_tr:has(td):hover]:bg-teal-100! ' +
          'dark:[&_tr:has(td):hover]:bg-muted/50! ' +
          '[&_.text-muted-foreground]:text-card-foreground! ' +
          '[&_[data-slot="table-head"]]:text-muted-foreground! ' +
          '[&_.text-sm.text-muted-foreground.text-center]:text-muted-foreground! ' +
          '[&_[data-slot="card-description"]]:text-muted-foreground!'
        }
      >
        <div className="grid gap-5 lg:gap-7.5">
          {/* Upload card */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t('upload.title', { defaultValue: 'Upload Excel File' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-card-foreground">
                {t('upload.description', {
                  defaultValue:
                    'Select the completed Excel file and upload it.',
                })}
              </p>
              <div className="space-y-3">
                <Input
                  key={fileInputKey}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  disabled={uploadMutation.isPending}
                />
                {selectedFile && (
                  <p className="text-sm text-card-foreground">
                    {selectedFile.name}
                  </p>
                )}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    disabled={!selectedFile || uploadMutation.isPending}
                    onClick={handleUpload}
                  >
                    <Upload className="h-4 w-4" />
                    {t('upload.button', { defaultValue: 'Upload' })}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My uploads card */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t('table.title', { defaultValue: 'My Uploads' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t('table.file', { defaultValue: 'File' })}
                    </TableHead>
                    <TableHead>
                      {t('table.date', { defaultValue: 'Date' })}
                    </TableHead>
                    <TableHead>
                      {t('table.status', { defaultValue: 'Status' })}
                    </TableHead>
                    <TableHead>
                      {t('table.note', { defaultValue: 'Note' })}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading || uploads.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-sm text-muted-foreground text-center py-4"
                      >
                        {t('table.empty', { defaultValue: 'No uploads yet' })}
                      </TableCell>
                    </TableRow>
                  ) : (
                    uploads.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.fileName}</TableCell>
                        <TableCell>
                          {formatDateTime(row.createdAt, locale)}
                        </TableCell>
                        <TableCell>{renderStatus(row.statusId)}</TableCell>
                        <TableCell>{row.reviewNote || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Admin: All Uploads (SuperAdmin only) */}
          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t('admin.title', { defaultValue: 'All Uploads' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t('table.file', { defaultValue: 'File' })}
                      </TableHead>
                      <TableHead>
                        {t('admin.uploadedBy', { defaultValue: 'Uploaded By' })}
                      </TableHead>
                      <TableHead>
                        {t('table.date', { defaultValue: 'Date' })}
                      </TableHead>
                      <TableHead>
                        {t('table.status', { defaultValue: 'Status' })}
                      </TableHead>
                      <TableHead>
                        {t('table.note', { defaultValue: 'Note' })}
                      </TableHead>
                      <TableHead className="text-end">
                        {t('admin.actions.download', { defaultValue: 'Download' })}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAll || allUploads.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-sm text-muted-foreground text-center py-4"
                        >
                          {t('admin.empty', { defaultValue: 'No uploads' })}
                        </TableCell>
                      </TableRow>
                    ) : (
                      allUploads.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.fileName}</TableCell>
                          <TableCell>
                            {uploaderById.get(row.createdBy?.toLowerCase()) ??
                              row.createdBy}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(row.createdAt, locale)}
                          </TableCell>
                          <TableCell>{renderStatus(row.statusId)}</TableCell>
                          <TableCell>{row.reviewNote || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              {row.statusId === 1 && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={setStatusMutation.isPending}
                                    onClick={() =>
                                      setStatusMutation.mutate({
                                        id: row.id,
                                        statusId: 2,
                                      })
                                    }
                                  >
                                    {t('admin.actions.startProcessing', {
                                      defaultValue: 'Start Processing',
                                    })}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={setStatusMutation.isPending}
                                    onClick={() => {
                                      setRejectReason('');
                                      setRejectTarget(row);
                                    }}
                                  >
                                    {t('admin.actions.reject', {
                                      defaultValue: 'Reject',
                                    })}
                                  </Button>
                                </>
                              )}
                              {row.statusId === 2 && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={setStatusMutation.isPending}
                                    onClick={() =>
                                      setStatusMutation.mutate({
                                        id: row.id,
                                        statusId: 3,
                                      })
                                    }
                                  >
                                    {t('admin.actions.markDone', {
                                      defaultValue: 'Mark Done',
                                    })}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={setStatusMutation.isPending}
                                    onClick={() => {
                                      setRejectReason('');
                                      setRejectTarget(row);
                                    }}
                                  >
                                    {t('admin.actions.reject', {
                                      defaultValue: 'Reject',
                                    })}
                                  </Button>
                                </>
                              )}
                              <Button asChild size="sm" variant="ghost">
                                <a
                                  href={`/api/import/${row.id}/file`}
                                  download
                                >
                                  <Download className="h-4 w-4" />
                                  {t('admin.actions.download', {
                                    defaultValue: 'Download',
                                  })}
                                </a>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Reject reason dialog */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('admin.reject.title', { defaultValue: 'Reject upload' })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <label className="mb-2 block text-sm font-medium">
              {t('admin.reject.reasonLabel', { defaultValue: 'Reason' })}
            </label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
            >
              {t('admin.reject.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || setStatusMutation.isPending}
              onClick={handleConfirmReject}
            >
              {t('admin.reject.confirm', { defaultValue: 'Reject' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
