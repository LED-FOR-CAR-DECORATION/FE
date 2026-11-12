import type { CommissionRequest, CommissionStatus, CommissionSubmission, DesignerCommissionStatus, SubmissionStatus } from "../types";

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

export function assignCommission(id: string, designerId: string, designerName: string) {
  writeRequests(readRequests().map((request) => request.id === id
    ? { ...request, assignedDesignerId: designerId, assignedDesignerName: designerName, assignmentDate: new Date().toISOString(), designerStatus: "ASSIGNED" as DesignerCommissionStatus }
    : request));
}

export function getAssignedCommissions(designerId: string) {
  return readRequests().filter((request) => request.assignedDesignerId === designerId);
}

export function updateDesignerStatus(id: string, designerStatus: DesignerCommissionStatus) {
  writeRequests(readRequests().map((request) => request.id === id ? { ...request, designerStatus } : request));
}

export function submitCommissionDesign(id: string, submission: CommissionSubmission) {
  writeRequests(readRequests().map((request) => {
    if (request.id !== id) return request;
    const submissions = [...(request.submissions ?? []), submission];
    return { ...request, submissions, designerStatus: "SUBMITTED_FOR_REVIEW" as DesignerCommissionStatus };
  }));
}

export function reviewCommissionSubmission(id: string, submissionId: string, status: SubmissionStatus, feedback: string) {
  writeRequests(readRequests().map((request) => {
    if (request.id !== id) return request;
    const submissions = (request.submissions ?? []).map((submission) => submission.id === submissionId
      ? { ...submission, status, feedback }
      : submission);
    const designerStatus: DesignerCommissionStatus = status === "APPROVED" ? "APPROVED" : status === "CHANGES_REQUESTED" ? "CHANGES_REQUESTED" : "SUBMITTED_FOR_REVIEW";
    return { ...request, submissions, designerStatus };
  }));
}
