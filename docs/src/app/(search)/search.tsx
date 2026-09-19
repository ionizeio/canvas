import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform, StyleSheet, type NativeSyntheticEvent, type TextInputFocusEventData } from "react-native";
import { Redirect, Stack, useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SearchBarCommands } from "react-native-screens";
import { View, Text, Pressable, GlassSurface, useTheme, alpha } from "@ionizeio/canvas";
import { search } from "../../core/data/search";
import type { SearchEntry } from "../../core/data/types";
import { sans } from "../../ui/fonts";
import { CanvasLattice } from "../../brand/canvas-lattice";

// The Search tab's screen. On native (iOS/Android) the rightmost bottom tab opens this and the
// nav bar hosts the system search field (a real UISearchController on iOS 26 / Material search on
// Android), auto-focused on open. On web the Search tab opens the cmd-K modal (see WebNav), so a
// /search deep link just redirects home.
//
// Results live in a Liquid Glass "bubble" anchored to the TOP of the search field: it stays
// hidden until you type, then rises above the bar with the matches. Matches are ranked so the
// CLOSEST one sits at the BOTTOM of the bubble, nearest the field (and bottom-aligned, so the
// bubble grows upward as more match). `obscureBackground:false` keeps iOS from dimming the
// screen over the bubble while searching.
export default function SearchScreen() {
  if (Platform.OS === "web") return <Redirect href="/" />;
  return <NativeSearch />;
}

// Rank matches so the closest sorts LAST (it renders at the bottom of the bubble, by the field):
// exact title > title prefix > title substring > weaker (description/keyword) match. Keep only
// the strongest few so the bubble stays a glance, not a full list.
function rankForBubble(query: string): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const score = (e: SearchEntry) => {
    const t = e.title.toLowerCase();
    return t === q ? 4 : t.startsWith(q) ? 3 : t.includes(q) ? 2 : 1;
  };
  return search(query)
    .slice()
    .sort((a, b) => score(a) - score(b) || b.title.localeCompare(a.title))
    .slice(-8);
}

function NativeSearch() {
  const router = useRouter();
  const { tokens, surface } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  // True while THIS screen is the focused one (the active search session). The aurora is tied to
  // this, not to whether results exist, so the wash is there the moment you enter search.
  const [active, setActive] = useState(false);
  const results = useMemo(() => rankForBubble(query), [query]);
  // In glass mode the bubble is translucent (real Liquid Glass on iOS 26, frost on fallback), so
  // it needs color behind it to refract. In solid mode the bubble is opaque, so the wash is skipped.
  const glass = surface === "glass";
  const showBubble = results.length > 0;
  const searchRef = useRef<SearchBarCommands>(null);

  // The soft keyboard's current height. The bubble is anchored near the screen bottom, so
  // while the keyboard is up (now the norm: the field auto-focuses) the bubble must lift
  // above it or the results render hidden behind the IME.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Mark the screen active (drives the aurora) while it's focused, and put the caret in the
  // system search field on every visit to the tab. Imperative focus is needed because
  // react-native-screens' `autoFocus` is Android-only AND only fires when the search view is
  // first created, so revisits to the kept-alive tab screen never refocus. The search view is
  // created a beat after the screen gains navigation focus and exposes no ready callback, so
  // fire twice across the transition window; focus() is idempotent. Verified working on
  // Android (first visit + revisits). KNOWN GAP: on iOS 26 the integrated-placement field
  // ignores becomeFirstResponder (focus() is a no-op); the only system hook is
  // UISearchTab.automaticallyActivatesSearch, which needs the UITab API that
  // react-native-screens (<= 4.26) doesn't use, so iOS stays tap-to-focus until upstream
  // adopts it. These focus() calls are correct and will light up on iOS when that lands.
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      const early = setTimeout(() => searchRef.current?.focus(), 80);
      const late = setTimeout(() => searchRef.current?.focus(), 400);
      return () => {
        clearTimeout(early);
        clearTimeout(late);
        setActive(false);
      };
    }, []),
  );

  const go = (path: string) => {
    setQuery("");
    searchRef.current?.setText("");
    router.push(path as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background }}>
      <Stack.Screen
        options={{
          headerTitle: "Search",
          headerSearchBarOptions: {
            ref: searchRef,
            autoFocus: true,
            placeholder: "Search components...",
            hideWhenScrolling: false,
            // Don't dim the screen while searching, or the dimming sheet would cover the bubble.
            obscureBackground: false,
            ...(Platform.OS === "ios" ? { placement: "integrated" as const } : {}),
            onChangeText: (e: NativeSyntheticEvent<TextInputFocusEventData>) => setQuery(e.nativeEvent.text),
            onCancelButtonPress: () => setQuery(""),
            // Hide iOS's separate Cancel pill so the field reads as one control.
            onFocus: () => searchRef.current?.toggleCancelButton(false),
          },
        }}
      />
      {/* The Canvas Lattice fills the screen for the whole search session (while this
          screen is focused), phase-continuous with every other screen's sky, so the
          clear Liquid Glass bubble has real color and motion to refract the moment you
          enter search. It clears when you leave. */}
      {glass && active ? <CanvasLattice /> : null}
      {/* The Liquid Glass results bubble: anchored just above the field, grows upward, closest
          match at the bottom. box-none lets taps outside the bubble reach the field/content. */}
      {showBubble ? (
        <View
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            top: insets.top + 8,
            // At rest, clear the bottom bar (inset + bar height); with the keyboard up, clear
            // the keyboard plus the search bar riding above it.
            bottom: (keyboardHeight > 0 ? keyboardHeight : insets.bottom) + 60,
            pointerEvents: "box-none",
          }}
        >
          {/* The bubble is a content-sized rounded box (the rows size it); GlassSurface fills
              BEHIND them as an absolute background, since a content-sized GlassSurface would
              collapse (its core puts flex:1 on the clip box). The list is capped so it fits. */}
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <View style={{ borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: alpha(tokens.border, 0.7) }}>
              <GlassSurface style={StyleSheet.absoluteFill} pointerEvents="none" />
              <View style={{ paddingVertical: 6 }}>
                {results.map((item, i) => {
                  const closest = i === results.length - 1;
                  return (
                    <Pressable
                      key={item.path}
                      onPress={() => go(item.path)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 16,
                        paddingVertical: 9,
                        backgroundColor: pressed ? alpha(tokens.foreground, 0.06) : "transparent",
                      })}
                    >
                      <Text numberOfLines={1} style={{ fontFamily: sans(closest ? "600" : "500"), fontSize: 14, color: tokens.foreground }}>
                        {item.title}
                      </Text>
                      <Text numberOfLines={1} style={{ fontFamily: sans("400"), fontSize: 12, color: tokens["muted-foreground"], marginTop: 1 }}>
                        {item.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
