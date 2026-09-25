import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Modal,
  ScrollView,
  Platform,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type TextInput as RNTextInput,
  type TextInputKeyPressEventData,
} from "react-native";
import { View, Text, Pressable, Column, TextInput, Icon, useTheme, useFormFactor, GlassSurface, alpha, FOCUS_RESET } from "@ionizeio/canvas";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { search } from "../core/data/search";
import type { SearchEntry } from "../core/data/types";
import { sans } from "../ui/fonts";

// The docs search modal. On desktop it is a centered command palette near the top of the
// screen (the cmd-K pattern: input on top, results below). On mobile web it opens from the
// rightmost bottom tab, so it docks as a bottom sheet with the input pinned at the bottom
// (thumb-reachable, where the tab was tapped) and the results growing upward above it.
// A TextInput drives a case-insensitive search over the docs core index; results group
// under uppercase category headers, each row navigates and closes. Keyboard up/down/enter/
// esc nav is wired through the web build (RN-Web surfaces the key via onKeyPress); on native
// the Modal's onRequestClose handles Android back / dismiss.
export function SearchModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { tokens } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<RNTextInput>(null);

  const results = useMemo(() => search(query), [query]);

  // Reset search state on opening. Modal owns focus containment and restoration:
  // its web trap records the previously focused opener when it mounts. Focusing
  // a child before that capture would make the disappearing input the return target.
  // onShow focuses the input once the native window or web transition is ready.
  useEffect(() => {
    if (visible) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [visible]);

  // Keep the selected index in range as results change.
  useEffect(() => {
    setSelectedIndex((i) => (i >= results.length ? 0 : i));
  }, [results.length]);

  const go = useCallback(
    (path: string) => {
      onClose();
      router.push(path as never);
    },
    [onClose, router],
  );

  // Web keyboard navigation. RN-Web reports the key on nativeEvent.key; native builds
  // never emit these arrow / enter events from the soft keyboard, so the guard keeps
  // behavior identical there (touch only). Cmd/ctrl-K must be handled HERE too: the
  // navbar's document-level toggle listener never sees keydowns from inside the input
  // (RN-Web's TextInput stops their propagation), and the input holds focus while open.
  const onKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (Platform.OS !== "web") return;
      const key = e.nativeEvent.key;
      const { metaKey, ctrlKey } = e.nativeEvent as unknown as { metaKey?: boolean; ctrlKey?: boolean };
      if ((metaKey || ctrlKey) && key.toLowerCase() === "k") {
        (e as unknown as { preventDefault?: () => void }).preventDefault?.();
        onClose();
      } else if (key === "Escape") {
        onClose();
      } else if (key === "ArrowDown") {
        (e as unknown as { preventDefault?: () => void }).preventDefault?.();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (key === "ArrowUp") {
        (e as unknown as { preventDefault?: () => void }).preventDefault?.();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (key === "Enter" && results[selectedIndex]) {
        go(results[selectedIndex].path);
      }
    },
    [results, selectedIndex, go, onClose],
  );

  // Group results by category, preserving first-seen category order.
  const grouped = useMemo(() => {
    const map = new Map<string, SearchEntry[]>();
    for (const r of results) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return [...map.entries()];
  }, [results]);

  // Below the desktop form factor the search is launched from the bottom tab bar, so it
  // reads as a bottom sheet rather than a top-anchored command palette. (Same line the
  // shell draws: desktop is width > 1024, so exactly 1024 now sheets like the mobile shell.)
  const mobile = useFormFactor() !== "desktop";
  const panelWidth = Math.min(560, width - 32);

  // The search field. On desktop it sits at the TOP of the panel; on mobile it docks at
  // the BOTTOM of the sheet, so its hairline separator flips to the top edge.
  const inputRow = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 16,
        height: 52,
        borderColor: tokens.border,
        ...(mobile ? { borderTopWidth: 1 } : { borderBottomWidth: 1 }),
      }}
    >
      <Icon search size={16} muted />
      <TextInput
        ref={inputRef}
        value={query}
        onChangeText={setQuery}
        onKeyPress={onKeyPress}
        placeholder="Search components..."
        placeholderTextColor={tokens["muted-foreground"]}
        accessibilityLabel="Search components"
        style={{
          flex: 1,
          fontFamily: sans("400"),
          fontSize: 14.5,
          color: tokens.foreground,
          // Strip the RN-Web default input outline; the panel border frames it.
          ...FOCUS_RESET,
        }}
      />
    </View>
  );

  // The "type to search" hint, the empty state, or the grouped results. On mobile it is
  // capped so the sheet stays in the lower half and grows upward from the input; on
  // desktop it fills the palette below the input.
  const resultsList = (
    <ScrollView
      ref={scrollRef}
      style={mobile ? { flexGrow: 0, maxHeight: Math.min(height * 0.5, 360) } : { flexGrow: 0 }}
      keyboardShouldPersistTaps="handled"
    >
      {!query ? (
        <Column flush alignCenter padLoose>
          <Text style={{ fontFamily: sans("400"), fontSize: 13, color: tokens["muted-foreground"], textAlign: "center" }}>
            Type to search components, tokens, and guides.
          </Text>
        </Column>
      ) : results.length === 0 ? (
        <Column flush alignCenter padLoose>
          <Text style={{ fontFamily: sans("400"), fontSize: 13, color: tokens["muted-foreground"] }}>No results found.</Text>
        </Column>
      ) : (
        <View style={{ paddingVertical: 6 }}>
          {grouped.map(([category, items]) => (
            <View key={category} style={{ paddingBottom: 4 }}>
              <Text
                style={{
                  fontFamily: sans("600"),
                  fontSize: 10.5,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  color: tokens["muted-foreground"],
                  paddingHorizontal: 16,
                  paddingTop: 10,
                  paddingBottom: 4,
                }}
              >
                {category}
              </Text>
              {items.map((item) => {
                const idx = results.indexOf(item);
                const active = idx === selectedIndex;
                return (
                  <Pressable
                    key={item.path}
                    onPress={() => go(item.path)}
                    onHoverIn={Platform.OS === "web" ? () => setSelectedIndex(idx) : undefined}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      marginHorizontal: 6,
                      borderRadius: 8,
                      backgroundColor: active ? alpha(tokens.muted, 0.6) : "transparent",
                    }}
                  >
                    <Text style={{ fontFamily: sans("500"), fontSize: 13.5, color: tokens.foreground }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text
                      style={{ fontFamily: sans("400"), fontSize: 12, color: tokens["muted-foreground"], marginTop: 1 }}
                      numberOfLines={1}
                    >
                      {item.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  return (
    <Modal visible={visible} transparent animationType={mobile ? "slide" : "fade"} onRequestClose={onClose}
      onShow={() => inputRef.current?.focus()}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          ...(mobile
            ? { justifyContent: "flex-end" }
            : { alignItems: "center", justifyContent: "flex-start", paddingTop: 96, paddingHorizontal: 16 }),
        }}
        onPress={onClose}
      >
        <Pressable style={mobile ? { width: "100%" } : { width: panelWidth, maxHeight: 480 }} onPress={() => {}}>
          <GlassSurface
            style={
              mobile
                ? {
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    borderTopWidth: 1,
                    borderColor: tokens.border,
                    backgroundColor: tokens.card,
                    paddingBottom: insets.bottom,
                  }
                : {
                    flex: 1,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: tokens.border,
                    backgroundColor: tokens.card,
                  }
            }
          >
            {/* Mobile docks the input at the bottom with results above; desktop is the
                classic top-down command palette. */}
            {mobile ? (
              <>
                {resultsList}
                {inputRow}
              </>
            ) : (
              <>
                {inputRow}
                {resultsList}
              </>
            )}
          </GlassSurface>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
