import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

const FONTS = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semiBold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extraBold: "PlusJakartaSans_800ExtraBold",
};

/**
 * Returns the design tokens for the current color scheme.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette =
    scheme === "dark" && "dark" in colors
      ? (colors as any).dark
      : (colors as any).light;
  return { ...palette, radius: colors.radius, fonts: FONTS };
}
