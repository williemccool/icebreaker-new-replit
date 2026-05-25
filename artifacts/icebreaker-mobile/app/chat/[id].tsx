import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuthContext } from "@/context/AuthContext";
import { get, post } from "@/lib/api";
import * as Haptics from "expo-haptics";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const matchId = Number(id);
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");

  const { data: matchData, isLoading: matchLoading } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => get(`/api/matches/${matchId}`),
    enabled: !!matchId,
  });

  const { data: messagesData } = useQuery({
    queryKey: ["messages", matchId],
    queryFn: () => get(`/api/matches/${matchId}/messages`),
    enabled: !!matchId,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => post(`/api/matches/${matchId}/messages`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages", matchId] }),
  });

  const otherUser = matchData?.otherUser;
  const icebreakerCompleted = matchData?.match?.icebreakerCompleted ?? false;
  const messages = Array.isArray(messagesData) ? messagesData : [];

  const handleSend = useCallback(() => {
    const text = message.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMutation.mutate(text);
    setMessage("");
  }, [message]);

  if (matchLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!icebreakerCompleted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{otherUser?.name || "Match"}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.lockBody}>
          <View style={[styles.lockAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.lockAvatarText}>{otherUser?.name?.[0]?.toUpperCase() || "?"}</Text>
          </View>
          <Text style={[styles.lockTitle, { color: colors.foreground }]}>
            It is a match with {otherUser?.name?.split(" ")[0] || "them"}!
          </Text>
          <Text style={[styles.lockSub, { color: colors.mutedForeground }]}>
            Chat unlocks after you both play a quick 3-round icebreaker.
          </Text>
          <TouchableOpacity
            style={[styles.lockBtn, { backgroundColor: colors.primary }]}            
            onPress={() => router.push(`/game/${matchId}`)}
            activeOpacity={0.8}
          >
            <Feather name="star" size={16} color="#FFF" />
            <Text style={styles.lockBtnText}>Start Icebreaker</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}      
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.headerAvatarText}>{otherUser?.name?.[0]?.toUpperCase() || "?"}</Text>
          </View>
          <View>
            <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>
              {otherUser?.name || "Match"}
            </Text>
            <View style={styles.onlineRow}>
              <View style={[styles.onlineDot, { backgroundColor: "#4ade80" }]} />
              <Text style={[styles.onlineText, { color: "#4ade80" }]}>Online</Text>
            </View>
          </View>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Ice broken banner */}
      <View style={[styles.banner, { borderColor: colors.primary + "30" }]}>
        <Feather name="star" size={14} color={colors.primary} />
        <Text style={[styles.bannerText, { color: colors.primary }]}>ICE BROKEN</Text>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 8, gap: 8 }}
        showsVerticalScrollIndicator={false}
        inverted={false}
        renderItem={({ item }: { item: any }) => {
          const isMe = item.senderId === user?.id;
          return (
            <View style={[styles.msgRow, isMe ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" }]}>
              {!isMe && (
                <View style={[styles.msgAvatar, { backgroundColor: colors.secondary }]}>
                  <Text style={styles.msgAvatarText}>{otherUser?.name?.[0]?.toUpperCase() || "?"}</Text>
                </View>
              )}
              <View
                style={[
                  styles.msgBubble,
                  isMe
                    ? { backgroundColor: colors.primary, borderBottomRightRadius: 6 }
                    : { backgroundColor: "rgba(255,255,255,0.07)", borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.msgText, { color: isMe ? "#FFF" : colors.foreground }]}>{item.body}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <View style={[styles.emptyIcon, { borderColor: colors.primary + "20" }]}>
              <Feather name="star" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Ice is broken! Say something...</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={[styles.inputWrap, { paddingBottom: insets.bottom + 8, borderTopColor: colors.border }]}>
        <TouchableOpacity onPress={() => {}}>
          <Feather name="calendar" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.mutedForeground}
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: message.trim() ? colors.primary : "rgba(255,255,255,0.08)" }]}          
          onPress={handleSend}
          disabled={!message.trim() || sendMutation.isPending}
        >
          <Feather name="send" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "800" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerAvatarText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  headerName: { fontSize: 14, fontWeight: "800" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  onlineDot: { width: 5, height: 5, borderRadius: 2.5 },
  onlineText: { fontSize: 10, fontWeight: "700" },
  banner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginHorizontal: 16, marginTop: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1, backgroundColor: "rgba(255,27,141,0.08)" },
  bannerText: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  msgAvatarText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  msgBubble: { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  msgText: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
  emptyChat: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 13, fontWeight: "600" },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontWeight: "500", maxHeight: 100 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  lockBody: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 16 },
  lockAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  lockAvatarText: { color: "#FFF", fontSize: 30, fontWeight: "800" },
  lockTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  lockSub: { fontSize: 13, fontWeight: "500", textAlign: "center", paddingHorizontal: 20 },
  lockBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, marginTop: 8 },
  lockBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
