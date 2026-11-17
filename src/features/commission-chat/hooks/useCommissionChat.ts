"use client";

import { useState, useEffect, useCallback } from "react";
import type { Conversation } from "../types";
import {
  INITIAL_CONVERSATIONS,
  loadConversations,
  saveConversations,
} from "../services/commission-chat.service";

export function useCommissionChat(selectFromHash = false) {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string>("conv-1");

  useEffect(() => {
    setConversations(loadConversations());

    if (selectFromHash) setActiveConvId(window.location.hash.slice(1) || "conv-1");

    const syncHandler = () => {
      setConversations(loadConversations());
    };
    window.addEventListener("mirage-commission-chat-updated", syncHandler);
    window.addEventListener("storage", syncHandler);
    return () => {
      window.removeEventListener("mirage-commission-chat-updated", syncHandler);
      window.removeEventListener("storage", syncHandler);
    };
  }, [selectFromHash]);

  const activeConversation =
    conversations.find((c) => c.id === activeConvId) ?? conversations[0] ?? null;

  const updateActiveConversation = useCallback(
    (updater: (conv: Conversation) => Conversation) => {
      if (!activeConversation) return;
      setConversations((prev) => {
        const next = prev.map((conv) =>
          conv.id === activeConversation.id ? updater(conv) : conv
        );
        saveConversations(next);
        return next;
      });
    },
    [activeConversation?.id]
  );

  return {
    conversations,
    activeConversation,
    activeConvId,
    setActiveConvId,
    updateActiveConversation,
  };
}
