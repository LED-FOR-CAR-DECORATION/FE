import type { CommissionRequest, CommissionStatus } from "../types";

const STORAGE_KEY = "mirage-commission-requests";

function readRequests(): CommissionRequest[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as CommissionRequest[] : [];
  } catch {
    return [];
  }
}

function writeRequests(requests: CommissionRequest[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new Event("commission-requests-changed"));
}

export function getCommissionRequests() {
  return readRequests();
}

export function saveCommissionRequest(request: CommissionRequest) {
  writeRequests([request, ...readRequests()]);
}

export function updateCommissionStatus(id: string, status: CommissionStatus) {
  writeRequests(readRequests().map((request) => request.id === id ? { ...request, status } : request));
}
