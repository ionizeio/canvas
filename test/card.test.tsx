import { describe, it, expect, afterEach } from "bun:test";
import { render, cleanup } from "@testing-library/react";
import { type ReactNode } from "react";
import { Text } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Card, CardMedia, CardContent } from "../src/molecules/card/card.tsx";

afterEach(cleanup);
const ui = (node: ReactNode) => render(<ThemeProvider>{node}</ThemeProvider>);

// The web skin's surface insets (see card.styles.ts): the default density (the
// standard padded surface plus the card's flat-child gap) and the density steps.
// The tests pin the padding CONTRACT, not the exact pixel values, but reading them
// from one place keeps the two in sync if the skin ever moves.
const PADDED = "24px";
const GAP = "16px";
const COMPACT = "16px";

describe("Card surface padding", () => {
  it("pads raw children by default and spaces them (the surface owns the rhythm)", () => {
    const { getByTestId } = ui(
      <Card testID="c">
        <Text>one</Text>
        <Text>two</Text>
        <Text>three</Text>
      </Card>,
    );
    const el = getByTestId("c");
    expect(el.style.padding).toBe(PADDED);
    expect(el.style.gap).toBe(GAP);
  });

  it("`padded` (the explicit form of the default) pads and gaps the same", () => {
    const { getByTestId } = ui(<Card padded testID="c"><Text>content</Text></Card>);
    const el = getByTestId("c");
    expect(el.style.padding).toBe(PADDED);
    expect(el.style.gap).toBe(GAP);
  });

  it("`flush` removes the inset AND the gap for edge-to-edge children", () => {
    const { getByTestId } = ui(<Card flush testID="c"><Text>content</Text></Card>);
    const el = getByTestId("c");
    expect(el.style.padding).toBe("");
    expect(el.style.gap).toBe("");
  });

  it("a density boolean retunes the inset and gap on the children path", () => {
    const { getByTestId } = ui(<Card compact testID="c"><Text>content</Text></Card>);
    const el = getByTestId("c");
    expect(el.style.padding).toBe(COMPACT);
    expect(el.style.gap).toBe("12px");
  });

  it("the string path pads through its sections, never the surface", () => {
    const { getByTestId } = ui(<Card title="Title" body="Body" testID="c" />);
    expect(getByTestId("c").style.padding).toBe("");
  });

  it("`padded` on the string path never double-pads the self-padding sections", () => {
    const { getByTestId } = ui(<Card padded title="Title" body="Body" testID="c" />);
    expect(getByTestId("c").style.padding).toBe("");
  });

  it("a density boolean on the string path adds neither inset nor gap", () => {
    const { getByTestId } = ui(<Card compact title="Title" body="Body" testID="c" />);
    const el = getByTestId("c");
    expect(el.style.padding).toBe("");
    expect(el.style.gap).toBe("");
  });

  it("a pressable string-path card keeps the surface bare too", () => {
    const { getByTestId } = ui(
      <Card padded onPress={() => {}} title="Title" body="Body" testID="c" />,
    );
    expect(getByTestId("c").style.padding).toBe("");
  });
});

describe("CardContent", () => {
  it("spaces its flat children with the standard card rhythm", () => {
    const { getByText } = ui(
      <CardContent>
        <Text>inside</Text>
      </CardContent>,
    );
    // The Text renders as a leaf div; its parent is CardContent's own View.
    expect((getByText("inside").parentElement as HTMLElement).style.gap).toBe(GAP);
  });
});

describe("CardMedia", () => {
  it("spans the card edge to edge with nested top corners and a flat bottom", () => {
    const { getByTestId } = ui(
      <Card flush testID="c">
        <CardMedia src="/kira-tanaka.jpg" height={180} alt="Portrait" testID="m" />
        <CardContent>
          <Text>Below the fold</Text>
        </CardContent>
      </Card>,
    );
    const media = getByTestId("m");
    // Full bleed: the image fills the card's width and the given band height.
    expect(media.style.width).toBe("100%");
    expect(media.style.height).toBe("180px");
    // The top corners nest inside the web card's 20px corner + 1px border...
    expect(media.style.borderTopLeftRadius).toBe("19px");
    expect(media.style.borderTopRightRadius).toBe("19px");
    // ...and the bottom edge stays flat where the content continues.
    expect(media.style.borderBottomLeftRadius).toBe("");
    expect(media.style.borderBottomRightRadius).toBe("");
  });
});

describe("Card header slots", () => {
	it("renders an icon before the title", () => {
		const { getByText } = ui(<Card title="Identity" icon={<Text>ICON</Text>} />);
		expect(getByText("ICON")).toBeTruthy();
		expect(getByText("Identity")).toBeTruthy();
	});

	it("renders trailing header actions", () => {
		const { getByText } = ui(<Card title="Identity" actions={<Text>ACTION</Text>} />);
		expect(getByText("ACTION")).toBeTruthy();
	});

	// A card given only an icon or only actions still needs the header row, or the
	// slot would render nothing at all.
	it("renders a header for an icon alone", () => {
		const { getByText } = ui(<Card icon={<Text>ICON</Text>} />);
		expect(getByText("ICON")).toBeTruthy();
	});

	it("renders a header for actions alone", () => {
		const { getByText } = ui(<Card actions={<Text>ACTION</Text>} />);
		expect(getByText("ACTION")).toBeTruthy();
	});
});

// The fix: a card given children used to short-circuit to `inner = children`, so
// title / icon / actions / description / footer were silently dropped. That is what
// forced consuming apps to hand-roll a "SectionCard" out of Card + CardHeader +
// CardTitle, which is the duplication these tests exist to prevent recurring.
describe("Card sections beside children", () => {
  it("renders the header above raw children", () => {
    const { getByText } = ui(
      <Card title="Identity">
        <Text>a table</Text>
      </Card>,
    );
    expect(getByText("Identity")).toBeTruthy();
    expect(getByText("a table")).toBeTruthy();
  });

  it("renders every header slot beside children", () => {
    const { getByText, getByTestId } = ui(
      <Card title="Health" description="All services" icon={<Text testID="icon">i</Text>} actions={<Text testID="act">a</Text>}>
        <Text>body</Text>
      </Card>,
    );
    expect(getByText("Health")).toBeTruthy();
    expect(getByText("All services")).toBeTruthy();
    expect(getByTestId("icon")).toBeTruthy();
    expect(getByTestId("act")).toBeTruthy();
    expect(getByText("body")).toBeTruthy();
  });

  it("renders the footer below raw children", () => {
    const { getByText } = ui(
      <Card title="T" footer="the footer">
        <Text>body</Text>
      </Card>,
    );
    expect(getByText("the footer")).toBeTruthy();
    expect(getByText("body")).toBeTruthy();
  });

  // The padding contract: a sectioned card's inset lives on its sections, so the
  // surface must not also pad (or gap) or the two stack.
  it("moves the inset off the surface when sectioned", () => {
    const { getByTestId } = ui(
      <Card title="T" testID="c">
        <Text>body</Text>
      </Card>,
    );
    const el = getByTestId("c");
    expect(el.style.padding).toBe("");
    expect(el.style.gap).toBe("");
  });

  it("leaves a PLAIN card's surface inset exactly as it was", () => {
    const { getByTestId } = ui(
      <Card testID="c">
        <Text>body</Text>
      </Card>,
    );
    expect(getByTestId("c").style.padding).toBe(PADDED);
  });

  // `{cond && <X/>}` collapses to `false`, not null. A body that renders nothing must
  // not hang a separator over an empty content section.
  it("treats a false body as no body", () => {
    const { getByText } = ui(<Card title="T">{false}</Card>);
    expect(getByText("T")).toBeTruthy();
  });

  it("still renders children alone when no section props are passed", () => {
    const { getByText, queryByText } = ui(
      <Card>
        <Text>just me</Text>
      </Card>,
    );
    expect(getByText("just me")).toBeTruthy();
    expect(queryByText("undefined")).toBeNull();
  });

  // The data-driven string path must be untouched.
  it("keeps the string-body path working", () => {
    const { getByText } = ui(<Card title="T" body="the body" footer="the footer" />);
    expect(getByText("T")).toBeTruthy();
    expect(getByText("the body")).toBeTruthy();
    expect(getByText("the footer")).toBeTruthy();
  });

  it("children win over a string body when both are passed", () => {
    const { getByText, queryByText } = ui(
      <Card title="T" body="ignored">
        <Text>the children</Text>
      </Card>,
    );
    expect(getByText("the children")).toBeTruthy();
    expect(queryByText("ignored")).toBeNull();
  });
});

describe("A grown card fills the box it is given", () => {
  // `grow` used to reach the surface alone, so a card stretched to stand beside a
  // taller neighbour drew its content in a box it did not fill and left its footer
  // floating in the middle of the surface. The BODY is what takes up the slack.
  it("hands the slack to the body section", () => {
    const { getByText, getByTestId } = ui(
      <Card grow title="T" testID="c">
        <Text>body</Text>
      </Card>,
    );
    expect(getByTestId("c").style.flexGrow).toBe("1");
    expect((getByText("body").parentElement as HTMLElement).style.flexGrow).toBe("1");
  });

  it("grows the string body the same way", () => {
    const { getByText } = ui(<Card grow title="T" body="the body" />);
    expect((getByText("the body").parentElement as HTMLElement).style.flexGrow).toBe("1");
  });

  it("leaves the body alone on a card that was not asked to grow", () => {
    const { getByText } = ui(
      <Card title="T">
        <Text>body</Text>
      </Card>,
    );
    expect((getByText("body").parentElement as HTMLElement).style.flexGrow).toBe("");
  });
});
