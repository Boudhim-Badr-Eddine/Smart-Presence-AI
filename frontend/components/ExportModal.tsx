'use client';

import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Table } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

type ExportFormat = 'pdf' | 'excel' | 'csv';

interface ExportModalProps {
  title?: string;
  endpoint: string;
  filters?: {
    class_name?: boolean;
    student_id?: boolean;
    date_range?: boolean;
  };
}

export function ExportModal({ title = 'Export Report', endpoint, filters = {} }: ExportModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [className, setClassName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.class_name && className) params.append('class_name', className);
      if (filters.date_range && startDate) params.append('start_date', startDate);
      if (filters.date_range && endDate) params.append('end_date', endDate);

      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}/${format}?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from content-disposition header or generate one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `report-${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;

      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Choose export format and apply filters</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={format === 'pdf' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('pdf')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button
                variant={format === 'excel' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('excel')}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button
                variant={format === 'csv' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('csv')}
                className="flex items-center gap-2"
              >
                <Table className="h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>

          {/* Class Filter */}
          {filters.class_name && (
            <div className="space-y-2">
              <Label htmlFor="class-name">Class (Optional)</Label>
              <Input
                id="class-name"
                placeholder="e.g., DEV201"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
            </div>
          )}

          {/* Date Range Filter */}
          {filters.date_range && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && <Alert variant="destructive" description={error} />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
