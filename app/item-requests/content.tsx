'use client';

import { useState, useMemo } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface ItemRequestRow {
  id: string;
  description: string;
  statusId: number;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
  isActive: boolean;
}

export function ItemRequestsContent() {
  const { t, i18n } = useTranslation('item-request');
  const locale = i18n.language === 'fa' ? 'fa-IR' : 'en-US';
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.roles?.includes('SuperAdmin') ?? false;

  const [description, setDescription] = useState('');

  // Reject dialog state (SuperAdmin admin section).
  const [rejectTarget, setRejectTarget] = useState<ItemRequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: myRequests = [], isLoading } = useQuery<ItemRequestRow[]>({
    queryKey: ['my-item-requests'],
    queryFn: async () => {
      const res = await fetch('/api/item-request', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ||
            t('table.loadError', { defaultValue: 'Failed to load requests.' }),
        );
      }
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (desc: string) => {
      const res = await fetch('/api/item-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ||
            t('request.error', { defaultValue: 'Failed to submit request.' }),
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-item-requests'] });
      toast.success(
        t('request.success', { defaultValue: 'Request submitted successfully.' }),
      );
      setDescription('');
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t('request.error', { defaultValue: 'Failed to submit request.' }),
      );
    },
  });

  // ─── SuperAdmin: All Requests ───
  const { data: allRequests = [], isLoading: isLoadingAll } = useQuery<
    ItemRequestRow[]
  >({
    queryKey: ['all-item-requests'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const res = await fetch('/system/api/item-request/all', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ||
            t('table.loadError', { defaultValue: 'Failed to load requests.' }),
        );
      }
      return res.json();
    },
  });

  // Resolve requester person-id (createdBy) → "Name (nationalId)". The import
  // service stores only the requester's id, so we fetch ONLY the ids shown in the
  // grid, batched, via POST /Api/Person/Names — no full directory load.
  const requesterIds = useMemo(
    () =>
      Array.from(
        new Set(
          allRequests.map((r) => r.createdBy?.toLowerCase()).filter(Boolean),
        ),
      ),
    [allRequests],
  );

  const { data: requesterNames = [] } = useQuery<
    Array<{ id: string; firstName: string; lastName: string; nationalId: string }>
  >({
    queryKey: ['person-names', requesterIds],
    enabled: isSuperAdmin && requesterIds.length > 0,
    queryFn: async () => {
      const res = await fetch('/api/person/names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: requesterIds, languageId: 12 }),
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const requesterById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of requesterNames) {
      const name = `${p.firstName} ${p.lastName}`.trim();
      map.set(
        p.id.toLowerCase(),
        name ? `${name} (${p.nationalId})` : p.nationalId || p.id,
      );
    }
    return map;
  }, [requesterNames]);

  const setStatusMutation = useMutation({
    mutationFn: async (vars: {
      id: string;
      statusId: number;
      reviewNote?: string | null;
    }) => {
      const res = await fetch('/system/api/item-request/review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ||
            t('request.error', { defaultValue: 'Failed to submit request.' }),
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-item-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-item-requests'] });
      toast.success(
        t('request.success', { defaultValue: 'Request submitted successfully.' }),
      );
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t('request.error', { defaultValue: 'Failed to submit request.' }),
      );
    },
  });

  const handleConfirmReject = () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setStatusMutation.mutate(
      { id: rejectTarget.id, statusId: 3, reviewNote: rejectReason.trim() },
      {
        onSuccess: () => {
          setRejectTarget(null);
          setRejectReason('');
        },
      },
    );
  };

  const handleSubmit = () => {
    if (!description.trim()) return;
    addMutation.mutate(description.trim());
  };

  const renderStatus = (statusId: number) => {
    // 3-status review workflow: 1=Pending, 2=Done, 3=Rejected.
    if (statusId === 2) {
      return (
        <Badge variant="success" appearance="light">
          {t('status.done', { defaultValue: 'Done' })}
        </Badge>
      );
    }
    if (statusId === 3) {
      return (
        <Badge variant="destructive" appearance="light">
          {t('status.rejected', { defaultValue: 'Rejected' })}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" appearance="light">
        {t('status.pending', { defaultValue: 'Pending' })}
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
        <Card className="bg-indigo-50! dark:bg-indigo-950/25! shadow-lg shadow-black/5">
          <CardContent className="py-5">
            <Toolbar>
              <ToolbarHeading>
                <ToolbarPageTitle
                  text={t('toolbar.title', { defaultValue: 'Item Requests' })}
                />
                <ToolbarDescription>
                  {t('toolbar.description', {
                    defaultValue:
                      'Request a new lookup item; an admin reviews and adds it',
                  })}
                </ToolbarDescription>
              </ToolbarHeading>
            </Toolbar>
          </CardContent>
        </Card>
      </div>

      {/* Indigo glass tint on every section Card. */}
      <div
        className={
          '[&_div.rounded-xl.bg-card]:bg-indigo-50! ' +
          '[&_div.rounded-xl.bg-card]:border-indigo-100! ' +
          'dark:[&_div.rounded-xl.bg-card]:bg-indigo-950/25! ' +
          'dark:[&_div.rounded-xl.bg-card]:border-indigo-900! ' +
          '[&_div.rounded-xl.bg-card]:shadow-lg ' +
          '[&_div.rounded-xl.bg-card]:shadow-black/5 ' +
          '[&_tr:has(td):hover]:bg-indigo-100! ' +
          'dark:[&_tr:has(td):hover]:bg-muted/50! ' +
          '[&_.text-muted-foreground]:text-card-foreground! ' +
          '[&_[data-slot="table-head"]]:text-muted-foreground! ' +
          '[&_.text-sm.text-muted-foreground.text-center]:text-muted-foreground! ' +
          '[&_[data-slot="card-description"]]:text-muted-foreground!'
        }
      >
        <div className="grid gap-5 lg:gap-7.5">
          {/* New request card */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t('request.title', { defaultValue: 'New Request' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-card-foreground">
                {t('request.description', {
                  defaultValue: 'Describe the item you want added',
                })}
              </p>
              <div className="space-y-3">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder={t('request.placeholder', {
                    defaultValue: 'Describe the item you want added…',
                  })}
                  disabled={addMutation.isPending}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    disabled={!description.trim() || addMutation.isPending}
                    onClick={handleSubmit}
                  >
                    <Send className="h-4 w-4" />
                    {t('request.button', { defaultValue: 'Submit' })}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My requests card */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t('table.title', { defaultValue: 'My Requests' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t('table.description', { defaultValue: 'Description' })}
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
                  {isLoading || myRequests.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-sm text-muted-foreground text-center py-4"
                      >
                        {t('table.empty', { defaultValue: 'No requests yet' })}
                      </TableCell>
                    </TableRow>
                  ) : (
                    myRequests.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell
                          className="max-w-[420px] truncate"
                          title={row.description}
                        >
                          {row.description}
                        </TableCell>
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

          {/* Admin: All Requests (SuperAdmin only) */}
          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t('admin.title', { defaultValue: 'All Requests' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t('table.description', { defaultValue: 'Description' })}
                      </TableHead>
                      <TableHead>
                        {t('admin.requestedBy', { defaultValue: 'Requested By' })}
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
                        {t('admin.actions.markDone', { defaultValue: 'Mark Done' })}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAll || allRequests.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-sm text-muted-foreground text-center py-4"
                        >
                          {t('admin.empty', { defaultValue: 'No requests' })}
                        </TableCell>
                      </TableRow>
                    ) : (
                      allRequests.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell
                            className="max-w-[420px] truncate"
                            title={row.description}
                          >
                            {row.description}
                          </TableCell>
                          <TableCell>
                            {requesterById.get(row.createdBy?.toLowerCase()) ??
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
              {t('admin.reject.title', { defaultValue: 'Reject request' })}
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
