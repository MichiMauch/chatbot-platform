"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface SettingsSaveContextType {
  saveButton: ReactNode;
  setSaveButton: (button: ReactNode) => void;
}

const SettingsSaveContext = createContext<SettingsSaveContextType>({
  saveButton: null,
  setSaveButton: () => {},
});

export function SettingsSaveProvider({ children }: { children: ReactNode }) {
  const [saveButton, setSaveButton] = useState<ReactNode>(null);
  return (
    <SettingsSaveContext.Provider value={{ saveButton, setSaveButton }}>
      {children}
    </SettingsSaveContext.Provider>
  );
}

export function useSettingsSave() {
  return useContext(SettingsSaveContext);
}
