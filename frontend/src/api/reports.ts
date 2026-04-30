import keycloak from '../auth/keycloak';
import { API_BASE_URL } from '../config';
import type { ReportRecord, ReportStatus } from '../types';

function buildHeaders(contentType = false): HeadersInit {
  const headers: HeadersInit = {};

  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (keycloak.authenticated && keycloak.token) {
    headers.Authorization = `Bearer ${keycloak.token}`;
  }

  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T | { detail?: string };

  if (!response.ok) {
    const detail =
      typeof data === 'object' && data !== null && 'detail' in data
        ? data.detail
        : null;

    throw new Error(detail || `Erreur API: ${response.status} ${response.statusText}`);
  }

  return data as T;
}

export function toAbsoluteReportUrl(reportUrl: string): string {
  if (reportUrl.startsWith('http://') || reportUrl.startsWith('https://')) {
    return reportUrl;
  }

  return `${API_BASE_URL}${reportUrl.startsWith('/') ? reportUrl : `/${reportUrl}`}`;
}

export async function fetchMyReports(): Promise<ReportRecord[]> {
  const response = await fetch(`${API_BASE_URL}/reports/me`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  return parseResponse<ReportRecord[]>(response);
}

export async function fetchAllReports(): Promise<ReportRecord[]> {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  return parseResponse<ReportRecord[]>(response);
}

export async function updateReportStatus(
  reportId: string,
  status: Extract<ReportStatus, 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES'>,
  comment?: string
): Promise<ReportRecord> {
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: buildHeaders(true),
    body: JSON.stringify({
      status,
      comment: comment?.trim() || null,
    }),
  });

  return parseResponse<ReportRecord>(response);
}
