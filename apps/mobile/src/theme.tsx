import { createContext, PropsWithChildren, useContext } from "react";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme } from "@moveinrange/design-tokens";

const ThemeContext = createContext(lightTheme);

export function ThemeProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme();
  return <ThemeContext.Provider value={scheme === "dark" ? darkTheme : lightTheme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
