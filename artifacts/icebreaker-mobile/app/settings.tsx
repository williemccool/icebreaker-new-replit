import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuthContext } from "@/context/AuthContext";
import * as Haptics from "expo-haptics";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuthContext();
  const [notifs, setNotifs] = React.useState(true);
  const [location, setLocation] = React.useState(true);

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await signOut();
    router.replace("/auth");
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ gap: 8, marginBottom: 16 }}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={{ gap: 1 }}>{children}</View>
    </View>
  );

  const Row = ({
    icon,
    label,
    onPress,
    right,
  }: {
    icon: string;
    label: string;
    onPress?: () => void;
    right?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={[styles.row, { borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
        <Feather name={icon as any} size={16} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      {right || <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        <Section title="ACCOUNT">
          <Row icon="user" label="Edit profile" onPress={() => router.push("/onboarding")} />
          <Row icon="shield" label="Trust & Safety" onPress={() => router.push("/safety")} />
        </Section>

        <Section title="PREFERENCES">
          <View style={[styles.row, { borderColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
              <Feather name="bell" size={16} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Notifications</Text>
            <Switch value={notifs} onValueChange={setNotifs} trackColor={{ false: "#252530", true: colors.primary + "60" }} thumbColor={notifs ? colors.primary : "#8A8FA8"} />
          </View>
          <View style={[styles.row, { borderColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
              <Feather name="map-pin" size={16} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Location sharing</Text>
            <Switch value={location} onValueChange={setLocation} trackColor={{ false: "#252530", true: colors.primary + "60" }} thumbColor={location ? colors.primary : "#8A8FA8"} />
          </View>
        </Section>

        <Section title="LEGAL">
          <Row icon="file-text" label="Terms of Service" />
          <Row icon="lock" label="Privacy Policy" />
          <Row icon="users" label="Community Guidelines" />
        </Section>

        <TouchableOpacity
          style={[styles.signOut, { borderColor: colors.destructive + "30" }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "PlusJakartaSans_800ExtraBold" },
  sectionTitle: { fontSize: 11, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 1.5, marginLeft: 4, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.02)" },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold" },
  signOut: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 8, alignSelf: "center" },
  signOutText: { fontSize: 14, fontFamily: "PlusJakartaSans_700Bold" },
});
