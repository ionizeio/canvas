import { useState } from "react";
import { Row, Column, Card, Typography, Button, Input, Select, InputOTP, Steps, EmptyState, Icon, useToast } from "@nannier-com/canvas";
import type { TemplateDoc } from "../types";

// Onboarding wizard built from real Canvas components: a controlled Steps
// indicator (plus its progress-bar layout tracking the same step), one content
// Card per step (account Inputs, workspace Input + Select, InputOTP verify,
// success EmptyState), and Back/Continue navigation.

const STEPS = [
  { label: "Account" },
  { label: "Workspace" },
  { label: "Verify" },
  { label: "Done" },
];

const TIMEZONES = [
  "America/Los_Angeles (UTC-7)",
  "America/New_York (UTC-4)",
  "Europe/London (UTC+1)",
];

function WizardLive() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wsName, setWsName] = useState("Acme Corp");
  const [wsUrl, setWsUrl] = useState("acme-corp");
  const [timezone, setTimezone] = useState(TIMEZONES[0]);
  const [otp, setOtp] = useState("");
  const last = STEPS.length - 1;
  const inbox = email.trim() || "your inbox";

  const reset = () => {
    setStep(0);
    setName("");
    setEmail("");
    setWsName("Acme Corp");
    setWsUrl("acme-corp");
    setTimezone(TIMEZONES[0]);
    setOtp("");
  };

  const next = () => {
    if (step < last) {
      setStep(step + 1);
      return;
    }
    toast({
      success: true,
      message: "Workspace ready",
      description: `${wsName.trim() || "Your workspace"} is live at app.canvas.dev/${wsUrl.trim() || "your-team"}.`,
    });
  };

  return (
    <Row center>
      <Column relaxed style={{ width: "100%", maxWidth: 560 }}>
        <Steps steps={STEPS} current={step} onStepPress={setStep} />
        <Steps progress steps={[]} label="Setup progress" value={Math.round((step / last) * 100)} />
        <Card>
          <Column cozy>
            {step === 0 && (
              <Column cozy>
                <Column tight>
                  <Typography h4>Tell us about yourself</Typography>
                  <Typography small>Your name and work email create your account.</Typography>
                </Column>
                <Input label="Full name" placeholder="Rachel Chen" value={name} onChangeText={setName} />
                <Input label="Work email" placeholder="you@company.com" value={email} onChangeText={setEmail} />
              </Column>
            )}
            {step === 1 && (
              <Column cozy>
                <Column tight>
                  <Typography h4>Set up your workspace</Typography>
                  <Typography small>Configure the basics for your team's environment.</Typography>
                </Column>
                <Input label="Workspace name" value={wsName} onChangeText={setWsName} />
                <Input label="Workspace URL" prefix="app.canvas.dev/" value={wsUrl} onChangeText={setWsUrl} />
                <Select label="Default timezone" value={timezone} onSelect={setTimezone} options={TIMEZONES} />
              </Column>
            )}
            {step === 2 && (
              <Column cozy>
                <Column tight>
                  <Typography h4>Verify your email</Typography>
                  <Typography small>{`Enter the 6-digit code we sent to ${inbox}.`}</Typography>
                </Column>
                <Column snug alignCenter>
                  <InputOTP
                    length={6}
                    value={otp}
                    onChangeText={setOtp}
                    onComplete={() => toast({ success: true, message: "Code verified" })}
                  />
                  <Row tight alignCenter>
                    <Typography small>Didn't get it?</Typography>
                    <Button link small onPress={() => toast({ message: "Code resent", description: `A new code is on its way to ${inbox}.` })}>
                      Resend code
                    </Button>
                  </Row>
                </Column>
              </Column>
            )}
            {step === 3 && (
              <EmptyState
                success
                icon={<Icon circleCheck />}
                title="You're all set"
                description={`${wsName.trim() || "Your workspace"} is ready at app.canvas.dev/${wsUrl.trim() || "your-team"}. Invite your team from the dashboard.`}
                actionLabel="Start over"
                onAction={reset}
              />
            )}
            <Row between>
              <Button ghost disabled={step === 0} onPress={() => setStep(step - 1)}>
                Back
              </Button>
              <Button primary onPress={next}>
                {step === last ? "Go to dashboard" : step === 2 ? "Verify" : "Continue"}
              </Button>
            </Row>
          </Column>
        </Card>
      </Column>
    </Row>
  );
}

export const ONBOARDING_TEMPLATE: TemplateDoc = {
  slug: "onboarding",
  name: "Onboarding",
  description: "Multi-step setup wizard: a live step indicator with tracking progress, per-step form cards, code verification, and a completion state. Built from live Canvas components.",
  sections: [
    {
      title: "Setup wizard",
      anatomy: "Controlled Steps (pressable circles) + a progress-bar Steps tracking the same step + one Card per step: account Inputs, workspace Input/URL prefix/timezone Select, 6-digit InputOTP, success EmptyState. Back/Continue move through; the final CTA toasts.",
      render: () => <WizardLive />,
    },
  ],
};
