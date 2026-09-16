import { useState } from "react";
import { Row, Column, Card, Typography, Button, Input, Checkbox, Progress, Divider, Emblem, EmptyState, Icon, useToast } from "@nannier-com/canvas";
import type { TemplateDoc } from "../types";

// Live sign-up flow built from real Canvas components: a registration card with
// a password-strength meter that responds as you type, and the post-submit
// "check your inbox" confirmation state.

function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(1, score / 4 || 0.15);
}

function SignupLive() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const strength = passwordStrength(password);
  const createAccount = () => {
    if (!email.trim() || !password) {
      toast({ error: true, message: "Missing details", description: "Enter your work email and a password to create an account." });
      return;
    }
    toast({ success: true, message: "Account created", description: `We sent a confirmation link to ${email.trim()}.` });
  };
  return (
    <Row center>
      <Column cozy style={{ width: "100%", maxWidth: 400 }}>
        <Card>
          <Column cozy>
            <Column tight alignCenter>
              {/* Branded to the fictional demo company, never to Canvas itself. See the
                  note in signin.tsx: an unbranded account form inside an app named
                  Canvas reads as the app's own signup, which is what App Review
                  objected to. */}
              <Emblem primary label="A" />
              <Typography h3>Create your Acme Corp account</Typography>
              <Typography small>Demo form. Enter anything to see the result.</Typography>
            </Column>
            <Input label="Full name" placeholder="Rachel Chen" value={name} onChangeText={setName} />
            <Input label="Work email" placeholder="you@company.com" value={email} onChangeText={setEmail} />
            <Input label="Password" placeholder="8+ characters" secureTextEntry value={password} onChangeText={setPassword} />
            <Column tight>
              <Progress value={strength} accessibilityLabel="Password strength" />
              <Typography tiny>Use 8 or more characters with a number and a symbol.</Typography>
            </Column>
            <Checkbox>I agree to the Terms of Service and the Privacy Policy.</Checkbox>
            <Button block primary onPress={createAccount}>Create account</Button>
            <Divider>or continue with</Divider>
            <Row snug>
              <Column fill>
                <Button block outline onPress={() => toast({ message: "Continue with Google", description: "This would hand off to Google's sign-in flow." })}>Google</Button>
              </Column>
              <Column fill>
                <Button block outline onPress={() => toast({ message: "Continue with GitHub", description: "This would hand off to GitHub's sign-in flow." })}>GitHub</Button>
              </Column>
            </Row>
            <Row center tight alignCenter>
              <Typography small>Already have an account?</Typography>
              <Button link small onPress={() => toast({ message: "Sign in", description: "This would open the sign-in page." })}>Sign in</Button>
            </Row>
          </Column>
        </Card>
      </Column>
    </Row>
  );
}

function ConfirmEmailLive() {
  const { toast } = useToast();
  return (
    <EmptyState
      bordered
      icon={<Icon mail />}
      title="Check your inbox"
      description="We sent a confirmation link to you@company.com. The link expires in 24 hours."
      actionLabel="Resend email"
      onAction={() => toast({ success: true, message: "Email resent", description: "A fresh confirmation link is on its way to you@company.com." })}
    />
  );
}

export const SIGNUP_TEMPLATE: TemplateDoc = {
  slug: "signup",
  name: "Sign-up",
  description: "Registration card with a live password-strength meter, terms consent, OAuth alternatives, and the check-your-inbox confirmation state. Built from live Canvas components.",
  sections: [
    {
      title: "Registration card",
      anatomy: "Logo Emblem + name/email/password Inputs + strength Progress (fills as you type) + terms Checkbox + primary CTA + OAuth Divider row. Max width 400, centered.",
      render: () => <SignupLive />,
    },
    {
      title: "Confirm email",
      anatomy: "Post-submit state: an EmptyState with a mail icon, what happened, and a resend action.",
      render: () => <ConfirmEmailLive />,
    },
  ],
};
