import { useCallback, useMemo, useRef, useState } from "react";
import { Dimensions, I18nManager, PixelRatio, Platform, View } from "react-native";
import { Button, Card, Carousel, Column, Typography } from "@nannier-com/canvas";

type Measurement = { generation: number; status: "idle" | "pending" } | {
  generation: number; status: "ready"; index: number; page: number;
  x: number; y: number; width: number; height: number;
  screenWidth: number; screenHeight: number; pixelRatio: number;
  platform: string; rtl: boolean;
};

export function CarouselBody() {
  const [current, setCurrent] = useState(1);
  const [changes, setChanges] = useState(0);
  const currentRef = useRef(current);
  const generation = useRef(0);
  const cards = useRef<(View | null)[]>([]);
  const [measurement, setMeasurement] = useState<Measurement>({ generation: 0, status: "idle" });
  const refs = useMemo(() => Array.from({ length: 6 }, (_, index) =>
    (node: View | null) => { cards.current[index] = node; }), []);
  const items = useMemo(() => Array.from({ length: 6 }, (_, index) => ({
    key: `page-${index + 1}`,
    content: (
      // Measure the actual card, never the larger slide or paging cell around it.
      <View collapsable={false} ref={refs[index]}>
        <Card testID={`carousel-slide-${index + 1}`}>
          <Column loose>
            <Typography h3 testID={`carousel-page-${index + 1}`}>Page {index + 1}</Typography>
            <Typography>Swipe this card to turn the page.</Typography>
            <Typography muted>The page picker can jump directly to another card.</Typography>
          </Column>
        </Card>
      </View>
    ),
  })), [refs]);
  const changeIndex = useCallback((next: number) => {
    currentRef.current = next;
    setCurrent(next);
    setChanges((count) => count + 1);
    setMeasurement({ generation: generation.current, status: "idle" });
  }, []);
  const measureCurrent = useCallback(() => {
    const request = ++generation.current;
    const index = currentRef.current;
    const card = cards.current[index];
    setMeasurement({ generation: request, status: "pending" });
    // An explicit press requests fresh window coordinates after native paging.
    // onLayout alone can retain the position from before the scroll to the starting card.
    card?.measureInWindow((x, y, width, height) => {
      if (request !== generation.current || index !== currentRef.current || card !== cards.current[index]) return;
      const screen = Dimensions.get("screen");
      setMeasurement({ generation: request, status: "ready", index, page: index + 1,
        x, y, width, height, screenWidth: screen.width, screenHeight: screen.height,
        pixelRatio: PixelRatio.get(), platform: Platform.OS, rtl: I18nManager.isRTL });
    });
  }, []);
  return (
    <Column loose>
      <Carousel testID="native-carousel" items={items} defaultIndex={1} showDots showArrows={false}
        onIndexChange={changeIndex} />
      <Typography testID="carousel-current">Current page: {current + 1}</Typography>
      <Typography testID="carousel-changes">Page changes: {changes}</Typography>
      <Button onPress={measureCurrent}>Measure current slide</Button>
      <Typography small muted testID="carousel-measurement">{JSON.stringify(measurement)}</Typography>
    </Column>
  );
}
