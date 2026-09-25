import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AccessibilityInfo } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Video } from "../src/atoms/video/video.tsx";
import { Video as IOSVideo } from "../src/atoms/video/video.ios.tsx";
import { Video as AndroidVideo } from "../src/atoms/video/video.android.tsx";
import { clock } from "../src/atoms/video/video.controls.tsx";

// The expo-video stub in tools/rnw-preload.ts keeps every player it makes here.
interface FakePlayer {
  source: unknown;
  loop: boolean;
  muted: boolean;
  playing: boolean;
  currentTime: number;
  duration: number;
  status: string;
  timeUpdateEventInterval: number;
  fullscreenRequests: number;
  viewProps: Record<string, unknown>;
  emit(event: string, payload?: unknown): void;
}
const players = () => (globalThis as unknown as { __expoVideoPlayers: FakePlayer[] }).__expoVideoPlayers;
const current = () => {
  const player = players().at(-1);
  if (!player) throw new Error("no player was created");
  return player;
};

function emit(event: string, payload?: unknown, player = current()) {
  act(() => player.emit(event, payload));
}
// The web player announces readiness and exposes `duration`; it sends no sourceLoad.
function ready(player = current(), duration = 12) {
  act(() => {
    player.duration = duration;
    player.status = "readyToPlay";
    player.emit("statusChange", { status: "readyToPlay" });
  });
}

const clip = { uri: "https://example.com/harbour.mp4" };
const still = { uri: "https://example.com/harbour.jpg" };

beforeEach(() => {
  players().length = 0;
});
afterEach(cleanup);

describe("Video inline", () => {
  it("is one play/pause control named after the clip", () => {
    const changes: boolean[] = [];
    render(
      <ThemeProvider>
        <Video source={clip} accessibilityLabel="Harbour at dusk" onPlayingChange={(p) => changes.push(p)} />
      </ThemeProvider>,
    );
    ready();
    fireEvent.click(screen.getByRole("button", { name: "Play Harbour at dusk" }));
    expect(current().playing).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Pause Harbour at dusk" }));
    expect(current().playing).toBe(false);
    expect(changes).toEqual([true, false]);
  });

  it("hands the player the clip, loop and mute, and keeps them in step with the props", () => {
    const view = render(<ThemeProvider><Video source={clip} loop /></ThemeProvider>);
    const player = current();
    expect(player.source).toEqual(clip);
    expect([player.loop, player.muted]).toEqual([true, false]);
    view.rerender(<ThemeProvider><Video source={clip} muted /></ThemeProvider>);
    expect([player.loop, player.muted]).toEqual([false, true]);
  });

  it("fits the picture with first-match precedence, contain by default", () => {
    const fits: unknown[] = [];
    for (const props of [{}, { cover: true }, { stretch: true }, { cover: true, contain: true }]) {
      const view = render(<ThemeProvider><Video source={clip} {...props} /></ThemeProvider>);
      fits.push(current().viewProps.contentFit);
      view.unmount();
    }
    expect(fits).toEqual(["contain", "cover", "fill", "contain"]);
  });

  it("sizes the video surface to the picture instead of pinning its edges", () => {
    render(<ThemeProvider><Video source={clip} /></ThemeProvider>);
    // On the web the surface is a <video>: pinned edges alone leave it at the clip's own size.
    expect(current().viewProps.style).toMatchObject({ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" });
  });

  it("shows the poster until the first frame is on screen", () => {
    render(<ThemeProvider><Video source={clip} poster={still} testID="clip" /></ThemeProvider>);
    const posterCount = () => screen.getByTestId("clip").querySelectorAll("img").length;
    expect(posterCount()).toBe(1);
    act(() => (current().viewProps.onFirstFrameRender as () => void)());
    expect(posterCount()).toBe(0);
  });

  it("autoplays once the clip is ready", () => {
    render(<ThemeProvider><Video source={clip} autoplay muted /></ThemeProvider>);
    expect(current().playing).toBe(false);
    ready();
    expect(current().playing).toBe(true);
  });

  it("does not autoplay when the system asks to reduce motion", async () => {
    const spy = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(Promise.resolve(true));
    try {
      render(<ThemeProvider><Video source={clip} autoplay muted accessibilityLabel="Harbour" /></ThemeProvider>);
      await act(async () => {});
      ready();
      await waitFor(() => expect(screen.getByRole("button", { name: "Play Harbour" })).toBeTruthy());
      expect(current().playing).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it("names a failed clip and stops offering to play it", () => {
    render(<ThemeProvider><Video source={clip} accessibilityLabel="Harbour" /></ThemeProvider>);
    act(() => {
      current().status = "error";
      current().emit("statusChange", { status: "error" });
    });
    const control = screen.getByRole("button", { name: "Harbour cannot be played" });
    fireEvent.click(control);
    expect(current().playing).toBe(false);
  });

  it("reports the end of the clip", () => {
    let ended = 0;
    render(<ThemeProvider><Video source={clip} onEnd={() => (ended += 1)} /></ThemeProvider>);
    emit("playToEnd");
    expect(ended).toBe(1);
  });
});

describe("Video controls on the web", () => {
  it("draws the kit's bar instead of the browser's controls", () => {
    render(<ThemeProvider><Video source={clip} controls accessibilityLabel="Harbour" /></ThemeProvider>);
    ready();
    expect(current().viewProps.nativeControls).toBe(false);
    for (const name of ["Play Harbour", "Seek Harbour", "Mute Harbour", "Show Harbour full screen"]) {
      expect(screen.getAllByLabelText(name).length).toBeGreaterThan(0);
    }
    // The picture's own tap target stays a pointer convenience: one named play control.
    expect(screen.getAllByRole("button", { name: "Play Harbour" })).toHaveLength(1);
  });

  it("keeps the picture's hidden tap target out of the tab order", () => {
    const { container } = render(<ThemeProvider><Video source={clip} controls accessibilityLabel="Harbour" /></ThemeProvider>);
    ready();
    // Every node Tab would stop on, by role and name, so a failure prints readably.
    const stops = (Array.from(container.querySelectorAll("*")) as HTMLElement[]).filter((node) => node.tabIndex >= 0);
    const named = (nodes: HTMLElement[]) => nodes.map((node) => `${node.getAttribute("role") ?? node.tagName.toLowerCase()} ${node.getAttribute("aria-label")}`);
    // Beside the bar the picture is hidden from assistive technology, so a tab stop there
    // would focus something a screen reader cannot name (axe's aria-hidden-focus). Tab
    // crosses the bar's controls and nothing else.
    expect(named(stops.filter((node) => node.closest('[aria-hidden="true"]')))).toEqual([]);
    expect(named(stops)).toEqual(["button Play Harbour", "slider Seek Harbour", "button Mute Harbour", "button Show Harbour full screen"]);
  });

  it("plays, pauses, mutes and goes full screen from the bar", () => {
    render(<ThemeProvider><Video source={clip} controls accessibilityLabel="Harbour" /></ThemeProvider>);
    ready();
    fireEvent.click(screen.getByRole("button", { name: "Play Harbour" }));
    expect(current().playing).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Pause Harbour" }));
    expect(current().playing).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Mute Harbour" }));
    expect(current().muted).toBe(true);
    expect(screen.getByRole("button", { name: "Unmute Harbour" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show Harbour full screen" }));
    expect(current().fullscreenRequests).toBe(1);
  });

  it("shows elapsed time and length, and asks for time updates only with the bar", () => {
    render(<ThemeProvider><Video source={clip} controls /></ThemeProvider>);
    expect(current().timeUpdateEventInterval).toBe(0.25);
    ready(current(), 75);
    emit("timeUpdate", { currentTime: 9.6 });
    expect(screen.getByText("0:09")).toBeTruthy();
    expect(screen.getByText("1:15")).toBeTruthy();
    cleanup();
    render(<ThemeProvider><Video source={clip} /></ThemeProvider>);
    expect(current().timeUpdateEventInterval).toBe(0);
  });

  it("takes the length from sourceLoad where the player sends it (iOS, Android)", () => {
    render(<ThemeProvider><Video source={clip} controls /></ThemeProvider>);
    emit("sourceLoad", { duration: 125 });
    expect(screen.getByText("2:05")).toBeTruthy();
  });

  it("formats clock times as m:ss", () => {
    expect([clock(0), clock(9.9), clock(61), clock(600), clock(-3)]).toEqual(["0:00", "0:09", "1:01", "10:00", "0:00"]);
  });
});

describe("Video controls on iOS and Android", () => {
  for (const [platform, PlatformVideo] of [["iOS", IOSVideo], ["Android", AndroidVideo]] as const) {
    it(`hands ${platform}'s frame to the platform's own player controls`, () => {
      render(<ThemeProvider><PlatformVideo source={clip} controls accessibilityLabel="Harbour" /></ThemeProvider>);
      ready();
      expect(current().viewProps.nativeControls).toBe(true);
      expect(screen.queryByLabelText("Seek Harbour")).toBeNull();
      expect(screen.queryByRole("button", { name: "Play Harbour" })).toBeNull();
    });

    it(`keeps the inline play control on ${platform} without controls`, () => {
      render(<ThemeProvider><PlatformVideo source={clip} accessibilityLabel="Harbour" /></ThemeProvider>);
      ready();
      expect(current().viewProps.nativeControls).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "Play Harbour" }));
      expect(current().playing).toBe(true);
    });
  }
});
