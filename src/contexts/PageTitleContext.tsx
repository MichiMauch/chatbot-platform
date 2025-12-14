"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface ChatData {
  chatId: string;
  chatSlug: string;
  isPublic: boolean;
  allowPublicChats: boolean;
}

export interface HeaderAction {
  icon: "plus" | "settings" | "user-plus";
  href?: string;
  tooltip: string;
  disabled?: boolean;
}

interface PageTitleContextType {
  title: string;
  subtitle: string;
  chatData: ChatData | null;
  headerAction: HeaderAction | null;
  setPageTitle: (title: string, subtitle?: string) => void;
  setChatData: (data: ChatData | null) => void;
  setIsPublic: (value: boolean) => void;
  setHeaderAction: (action: HeaderAction | null) => void;
}

const PageTitleContext = createContext<PageTitleContextType>({
  title: "",
  subtitle: "",
  chatData: null,
  headerAction: null,
  setPageTitle: () => {},
  setChatData: () => {},
  setIsPublic: () => {},
  setHeaderAction: () => {},
});

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [chatData, setChatDataState] = useState<ChatData | null>(null);
  const [headerAction, setHeaderActionState] = useState<HeaderAction | null>(null);

  const setPageTitle = useCallback((newTitle: string, newSubtitle?: string) => {
    setTitle(newTitle);
    setSubtitle(newSubtitle || "");
  }, []);

  const setChatData = useCallback((data: ChatData | null) => {
    setChatDataState(data);
  }, []);

  const setIsPublic = useCallback((value: boolean) => {
    setChatDataState(prev => prev ? { ...prev, isPublic: value } : null);
  }, []);

  const setHeaderAction = useCallback((action: HeaderAction | null) => {
    setHeaderActionState(action);
  }, []);

  return (
    <PageTitleContext.Provider value={{ title, subtitle, chatData, headerAction, setPageTitle, setChatData, setIsPublic, setHeaderAction }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle() {
  return useContext(PageTitleContext);
}
