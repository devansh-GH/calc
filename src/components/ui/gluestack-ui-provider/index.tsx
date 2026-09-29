import React, { useEffect } from "react";
import { Appearance, ColorSchemeName, View, ViewProps } from "react-native";
import { OverlayProvider } from "@gluestack-ui/core/overlay/creator";
import { ToastProvider } from "@gluestack-ui/core/toast/creator";

export type ModeType = "light" | "dark" | "system";

export function GluestackUIProvider({
  mode = "dark",
  ...props
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps["style"];
}) {
  useEffect(() => {
    const appearance = Appearance as unknown as {
      setColorScheme?: (scheme: ColorSchemeName | null) => void;
    };
    if (typeof appearance.setColorScheme === "function") {
      appearance.setColorScheme(mode === "system" ? null : (mode as ColorSchemeName));
    }
  }, [mode]);

  return (
    <View
      style={[
        {
          flex: 1,
          height: "100%",
          width: "100%",
          backgroundColor: mode === "light" ? "#f8fafc" : "#0b0e14",
        },
        props.style,
      ]}
      className="flex-1 bg-background dark:bg-background"
    >
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
