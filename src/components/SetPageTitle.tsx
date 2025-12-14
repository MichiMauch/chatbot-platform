"use client";

import { useEffect } from "react";
import { usePageTitle, type ChatData, type HeaderAction } from "@/contexts/PageTitleContext";

interface SetPageTitleProps {
  title: string;
  subtitle?: string;
  chatData?: ChatData;
  headerAction?: HeaderAction;
}

export function SetPageTitle({ title, subtitle, chatData, headerAction }: SetPageTitleProps) {
  const { setPageTitle, setChatData, setHeaderAction } = usePageTitle();

  useEffect(() => {
    setPageTitle(title, subtitle);
  }, [title, subtitle, setPageTitle]);

  useEffect(() => {
    setChatData(chatData || null);
    return () => setChatData(null);
  }, [chatData, setChatData]);

  useEffect(() => {
    setHeaderAction(headerAction || null);
    return () => setHeaderAction(null);
  }, [headerAction, setHeaderAction]);

  return null;
}
