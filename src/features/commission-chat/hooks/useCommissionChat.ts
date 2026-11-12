"use client";

import { useState, useEffect, useCallback } from "react";
import type { Conversation } from "../types";
import {
  INITIAL_CONVERSATIONS,
  loadConversations,
  saveConversations,
} from "../services/commission-chat.service";

export function useCommissionChat() {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string>("conv-1");

  useEffect(() => {
    setConversations(loadConversations());

    const syncHandler = () => {
      setConversations(loadConversations());
    };
    window.addEventListener("mirage-commission-chat-updated", syncHandler);
    window.addEventListener("storage", syncHandler);
    return () => {
      window.removeEventListener("mirage-commission-chat-updated", syncHandler);
      window.removeEventListener("storage", syncHandler);
    };
  }, []);

  const activeConversation =
    conversations.find((c) => c.id === activeConvId) ?? conversations[0];

  const updateActiveConversation = useCallback(
    (updater: (conv: Conversation) => Conversation) => {
      setConversations((prev) => {
        const next = prev.map((conv) =>
          conv.id === activeConversation.id ? updater(conv) : conv
        );
        saveConversations(next);
        return next;
      });
    },
    [activeConversation.id]
  );

  return {
    conversations,
    activeConversation,
    activeConvId,
    setActiveConvId,
    updateActiveConversation,
  };
}

