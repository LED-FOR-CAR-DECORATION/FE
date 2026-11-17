"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Conversation } from "../types";
import {
  belongsToCustomer,
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

  const { user } = useAuth();
  const userId = user?.role === "CUSTOMER" ? user.userId : undefined;
  const visibleConversations = selectFromHash
    ? conversations.filter((conversation) => belongsToCustomer(conversation, userId))
    : conversations;
  const activeConversation =
    visibleConversations.find((c) => c.id === activeConvId) ?? visibleConversations[0] ?? null;

  const updateActiveConversation = useCallback(
    (updater: (conv: Conversation) => Conversation) => {
      if (!activeConversation) return;
      const next = loadConversations().map((conv) =>
        conv.id === activeConversation.id && (!selectFromHash || belongsToCustomer(conv, userId))
          ? updater(conv)
          : conv
      );
      saveConversations(next);
      setConversations(next);
    },
    [activeConversation, selectFromHash, userId]
  );

  return {
    conversations: visibleConversations,
    activeConversation,
    activeConvId,
    setActiveConvId,
    updateActiveConversation,
  };
}
