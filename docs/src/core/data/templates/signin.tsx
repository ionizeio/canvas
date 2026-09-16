import { useState } from "react";
import {
  Row,
  Column,
  Card,
  Typography,
  Button,
  Input,
  Checkbox,
  Divider,
  Emblem,
  EmptyState,
  Icon,
  useToast,
  useFormFactor,
  type ToastHandle,
} from "@nannier-com/canvas";
import type { TemplateDoc } from "../types";

// Live sign-in flows built from real Canvas components: the centered credential
// card with OAuth alternatives, a split-screen with a brand feature panel, and a
// passwordless magic-link card that swaps to its sent state.

// Shared submit: validate the typed credentials and toast the outcome. Both the
// centered card and the split-screen form funnel through here.
function submitCredentials(toast: ToastHandle["toast"], email: string, password: string): void {
  const address = email.trim();
  if (!address) {
    toast({ error: true, message: "Email is required", description: "Enter the email address you signed up with." });
    return;
  }
  if (!password) {
    toast({ error: true, message: "Password is required", description: "Enter your password to continue." });
    return;
  }
  toast({ success: true, message: "Signed in", description: `Welcome back, ${address}.` });
}

function CenteredCardLive() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  return (
    <Row center>
      <Column cozy style={{ width: "100%", maxWidth: 400 }}>
        <Card>
          <Column cozy>
            <Column tight alignCenter>
              {/*
                Branded to the docs' fictional demo company, NOT to Canvas itself.
                Naming the host app here is what got the first App Store submission
                rejected: on a phone the page heading scrolls away, leaving a reviewer
                looking at "Sign in to Canvas" above an email/password form inside an
                app called Canvas. That is indistinguishable from a real login wall,
                and the listing declares that no sign-in is required. Keep every auth
                mockup pointed at Acme Corp so it can never read as this app's own gate.
              */}
              <Emblem primary label="A" />
              <Typography h3>Sign in to Acme Corp</Typography>
              <Typography small>Demo form. Enter anything to see the result.</Typography>
            </Column>
            <Input label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} />
            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <Row between alignCenter>
              <Checkbox checked={remember} onChange={setRemember}>
                Remember me
              </Checkbox>
              <Button
                link
                small
                onPress={() =>
                  toast({
                    message: "Reset link sent",
                    description: "Check your inbox for instructions to reset your password.",
                  })
                }
              >
                Forgot password?
              </Button>
            </Row>
            <Button block primary onPress={() => submitCredentials(toast, email, password)}>
              Sign in
            </Button>
            <Divider>or</Divider>
            <Row snug>
              <Column fill>
                <Button
                  block
                  outline
                  onPress={() =>
                    toast({ message: "Redirecting to Google", description: "Continuing with your Google account." })
                  }
                >
                  Google
                </Button>
              </Column>
              <Column fill>
                <Button
                  block
                  outline
                  onPress={() =>
                    toast({ message: "Redirecting to GitHub", description: "Continuing with your GitHub account." })
                  }
                >
                  GitHub
                </Button>
              </Column>
            </Row>
          </Column>
        </Card>
      </Column>
    </Row>
  );
}

const BRAND_FEATURES = ["Multi-factor authentication", "OAuth2 and OIDC support", "Audit logging and compliance"];

function SplitScreenLive() {
  const { toast } = useToast();
  // Phone stacks brand over form; wider splits them into two equal fill columns
  // (equal-width fill children, so this stays a hook-driven branch rather than
  // a Row `stacks`, which keeps children's own sizing).
  const stacked = useFormFactor() === "phone";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const brand = (
    <Card selected grow>
      <Column cozy>
        <Column tight>
          <Typography h3>Welcome back</Typography>
          <Typography small>Manage identities, sessions, and access policies from one dashboard.</Typography>
        </Column>
        <Column snug>
          {BRAND_FEATURES.map((feature) => (
            <Row key={feature} snug alignCenter>
              <Icon check primary size={16} />
              <Typography small>{feature}</Typography>
            </Row>
          ))}
        </Column>
      </Column>
    </Card>
  );
  const form = (
    <Card grow>
      <Column cozy>
        <Column tight>
          <Typography h3>Sign in to Acme Corp</Typography>
          <Typography small>Demo form. Enter anything to see the result.</Typography>
        </Column>
        <Input label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} />
        <Input
          label="Password"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button block primary onPress={() => submitCredentials(toast, email, password)}>
          Sign in
        </Button>
      </Column>
    </Card>
  );
  if (stacked) {
    return (
      <Column relaxed>
        {brand}
        {form}
      </Column>
    );
  }
  return (
    <Row relaxed>
      <Column fill>{brand}</Column>
      <Column fill>{form}</Column>
    </Row>
  );
}

function MagicLinkLive() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const send = () => {
    if (!email.trim()) {
      toast({ error: true, message: "Email is required", description: "Enter the address to send the magic link to." });
      return;
    }
    setSent(true);
  };
  return (
    <Row center>
      <Column cozy style={{ width: "100%", maxWidth: 400 }}>
        <Card>
          {sent ? (
            <Column cozy alignCenter>
              <EmptyState
                icon={<Icon mail />}
                title="Check your inbox"
                description={`We sent a magic link to ${email.trim()}. It signs you in with one tap and expires in 15 minutes.`}
                actionLabel="Resend link"
                onAction={() =>
                  toast({ success: true, message: "Magic link re-sent", description: `A fresh link is on its way to ${email.trim()}.` })
                }
              />
              <Button
                link
                small
                onPress={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Use a different email
              </Button>
            </Column>
          ) : (
            <Column cozy>
              <Column tight alignCenter>
                <Emblem primary circle>
                  <Icon mail />
                </Emblem>
                <Typography h3>Sign in to Acme Corp</Typography>
                <Typography small>Demo form. No email is actually sent.</Typography>
              </Column>
              <Input label="Email address" placeholder="you@example.com" value={email} onChangeText={setEmail} />
              <Button block primary onPress={send}>
                Send magic link
              </Button>
              <Row center>
                <Typography tiny>By continuing, you agree to our Terms of Service.</Typography>
              </Row>
            </Column>
          )}
        </Card>
      </Column>
    </Row>
  );
}

export const SIGNIN_TEMPLATE: TemplateDoc = {
  slug: "signin",
  name: "Sign-in",
  description:
    "Authentication screens: centered card, split-screen with marketing, and passwordless magic link. Built from live Canvas components.",
  sections: [
    {
      title: "Centered card",
      anatomy:
        "Emblem logo + email/password Inputs + remember-me Checkbox + forgot-password link + primary CTA + OAuth Divider row. Max width 400, centered.",
      render: () => <CenteredCardLive />,
    },
    {
      title: "Split-screen",
      anatomy:
        "Brand panel (primary-tinted Card: headline + Icon-check feature bullets) beside the sign-in form. Side by side on desktop, stacked at the sm breakpoint and below.",
      render: () => <SplitScreenLive />,
    },
    {
      title: "Magic link",
      anatomy:
        "Single email Input + submit, no password. Sending swaps the card to an EmptyState confirmation quoting the typed address, with resend and use-a-different-email actions.",
      render: () => <MagicLinkLive />,
    },
  ],
};
