"use client";

import { useCallback, useEffect, useState } from "react";

export type ProjectStatus = "NEW_REQUEST" | "PENDING_PAYMENT" | "IN_PROGRESS" | "REVIEWING" | "COMPLETED";
export type SenderType = "CUSTOMER" | "STAFF" | "SYSTEM";
export type MessageType = "TEXT" | "NEW_REQUEST_CARD" | "QUOTE_CARD" | "DELIVERY_CARD";

export type Project = {
  id: string;
  title: string;
  customerName: string;
  status: ProjectStatus;
  basePrice: number;
};

export type Message = {
  id: string;
  projectId: string;
  senderType: SenderType;
  messageType: MessageType;
  content: string;
  timestamp: string;
};

type Store = { projects: Project[]; messages: Message[] };

const STORAGE_KEY = "pixel-hub-commission-chat";
const CHANGE_EVENT = "pixel-hub-commission-chat-changed";

const initialStore: Store = {
  projects: [],
  messages: [],
};

function readStore(): Store {
  if (typeof window === "undefined") return initialStore;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialStore;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "projects" in parsed && "messages" in parsed) return parsed as Store;
  } catch {
    return initialStore;
  }
  return initialStore;
}

function writeStore(store: Store) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useCommissionChatStore() {
  const [store, setStore] = useState<Store>(initialStore);
  const refresh = useCallback(() => setStore(readStore()), []);

  useEffect(() => {
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const update = useCallback((change: (current: Store) => Store) => {
    const next = change(readStore());
    writeStore(next);
    setStore(next);
  }, []);

  return {
    ...store,
    addProject: (project: Project, firstMessage: Message) => update((current) => ({ projects: [project, ...current.projects], messages: [...current.messages, firstMessage] })),
    addMessage: (message: Message) => update((current) => ({ ...current, messages: [...current.messages, message] })),
    updateProject: (id: string, patch: Partial<Project>) => update((current) => ({ ...current, projects: current.projects.map((project) => project.id === id ? { ...project, ...patch } : project) })),
  };
}

export const money = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
