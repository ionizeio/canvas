import { useState } from "react";
import { Button, Carousel, Column, Input, Typography } from "@ionizeio/canvas";
import { Page } from "../../../ui/page";

const items = Array.from({ length: 6 }, (_, index) => ({
  key: String(index),
  content: (
    <Column relaxed testID={`slide-${index + 1}`}>
      <Typography h3>Slide {index + 1}</Typography>
      <Typography>Read this page, then navigate to another slide.</Typography>
      <Input label={`Notes for slide ${index + 1}`} />
    </Column>
  ),
}));

export default function CarouselFixture() {
  const [changes, setChanges] = useState<number[]>([]);
  const [controlledChanges, setControlledChanges] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [accept, setAccept] = useState(false);
  const [single, setSingle] = useState(false);
  return (
    <Page>
      <Typography h1>Carousel navigation</Typography>
      <Column relaxed>
        <Typography h2>Uncontrolled pages</Typography>
        <Button testID="before-carousel">Before carousel</Button>
        <Carousel testID="carousel-uncontrolled" items={single ? items.slice(0, 1) : items} showArrows showDots onIndexChange={(value) => setChanges((previous) => [...previous, value])} />
        <Typography testID="carousel-changes">Changes: {changes.join(",") || "none"}</Typography>
        <Button onPress={() => setSingle((value) => !value)}>{single ? "Restore slides" : "Use one slide"}</Button>
        <Typography h2>Controlled pages</Typography>
        <Button testID="before-controlled">Before controlled carousel</Button>
        <Carousel testID="carousel-controlled" items={items} index={index} showArrows showDots onIndexChange={(value) => {
          setControlledChanges((previous) => [...previous, value]);
          if (accept) setIndex(value);
        }} />
        <Typography testID="carousel-controlled-changes">Requests: {controlledChanges.join(",") || "none"}</Typography>
        <Typography testID="carousel-controlled-index">Owned index: {index}</Typography>
        <Button onPress={() => setAccept((value) => !value)}>{accept ? "Reject changes" : "Accept changes"}</Button>
        <Button onPress={() => setIndex(4)}>Set external index</Button>
      </Column>
    </Page>
  );
}

