import type { UpdaterFunction } from "@/types/types";
import { createContext, useState, useContext, type ReactNode } from "react";

type ContextType = {
  Display3DModels: boolean;
  setDisplay3DModels: UpdaterFunction<boolean>;
};

const initialContext: ContextType = {
  Display3DModels: false,
  setDisplay3DModels: () => {},
};

const Display3DModelsContext = createContext<ContextType>(initialContext);

export const useDisplay3DModelsContext = () =>
  useContext(Display3DModelsContext);

export const Display3DModelsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [Display3DModels, setDisplay3DModels] = useState<boolean>(false);

  const value = {
    Display3DModels,
    setDisplay3DModels,
  };

  return (
    <Display3DModelsContext.Provider value={value}>
      {children}
    </Display3DModelsContext.Provider>
  );
};
