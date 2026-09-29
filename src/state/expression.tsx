import React, { createContext, useContext, useState } from "react";

interface ExpressionState {
  expression: string;
  setExpression: (value: string) => void;
}

const ExpressionContext = createContext<ExpressionState>({
  expression: "",
  setExpression: () => {},
});

export function ExpressionProvider({ children }: { children: React.ReactNode }) {
  const [expression, setExpression] = useState("");
  return (
    <ExpressionContext.Provider value={{ expression, setExpression }}>
      {children}
    </ExpressionContext.Provider>
  );
}

export function useExpression(): ExpressionState {
  return useContext(ExpressionContext);
}
