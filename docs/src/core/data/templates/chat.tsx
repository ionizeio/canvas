import { useEffect, useRef, useState } from "react";
import { Row, Column, Card, Typography, Button, Input, Chip, Avatar, Spinner, EmptyState, Icon } from "@nannier-com/canvas";
import type { TemplateDoc } from "../types";

// Assistant chat built from real Canvas components. Bubbles are small Cards
// (selected = the user's primary-tinted side, flat = the assistant), so the
// thread needs no hand-rolled surfaces.

type Message = { from: "user" | "assistant"; text: string };

const THREAD: Message[] = [
  { from: "user", text: "Which plan includes SSO?" },
  { from: "assistant", text: "SSO and SAML are on the Enterprise plan. Pro covers custom domains and priority support; if you need identity-provider login, Enterprise is the one." },
  { from: "user", text: "Can we trial Enterprise before committing?" },
  { from: "assistant", text: "Yes. Sales can enable a 30-day Enterprise pilot on your existing workspace, so nothing migrates and your data stays put." },
];

const CANNED_REPLIES = [
  "Good question. Pro includes custom domains, priority support, and unlimited projects; Enterprise adds SSO, SAML, and audit logs on top.",
  "You can change plans any time from Billing, and proration is automatic, so an upgrade takes effect immediately.",
  "I've shared a summary with your workspace admins. Anything else you'd like to check before the pilot starts?",
];

const SUGGESTIONS = [
  {
    label: "Compare plans",
    question: "Can you compare the plans for me?",
    reply: "Free covers 3 projects, Pro adds custom domains and priority support, and Enterprise brings SSO, SAML, and audit logs.",
  },
  {
    label: "Set up SSO",
    question: "How do I set up SSO?",
    reply: "SSO lives on the Enterprise plan. Head to Settings, then Authentication, and connect your identity provider; I can walk you through SAML when you're ready.",
  },
  {
    label: "Invite my team",
    question: "How do I invite my team?",
    reply: "Open Settings, then Team, and enter your teammates' emails. Editors can build, Viewers can browse, and Admins manage billing.",
  },
];

function Bubble({ from, text }: { from: string; text: string }) {
  const user = from === "user";
  return (
    <Row end={user} start={!user}>
      <Card compact selected={user} flat={!user} style={{ maxWidth: "85%" }}>
        <Typography small>{text}</Typography>
      </Card>
    </Row>
  );
}

function TypingRow() {
  return (
    <Row start snug alignCenter>
      <Spinner small />
      <Typography tiny>Assistant is typing…</Typography>
    </Row>
  );
}

function ConversationLive() {
  const [messages, setMessages] = useState<Message[]>(THREAD);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyIndex = useRef(0);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { from: "user", text }]);
    setDraft("");
    setPending(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const reply = CANNED_REPLIES[replyIndex.current % CANNED_REPLIES.length];
      replyIndex.current += 1;
      setMessages((prev) => [...prev, { from: "assistant", text: reply }]);
      setPending(false);
    }, 900);
  };

  return (
    <Column cozy>
      <Row snug alignCenter>
        <Avatar small name="AI" />
        <Column tight>
          <Typography small medium>Canvas Assistant</Typography>
          <Typography tiny>Answers from your workspace docs</Typography>
        </Column>
      </Row>
      <Column snug>
        {messages.map((m, i) => (
          <Bubble key={i} from={m.from} text={m.text} />
        ))}
        {pending && <TypingRow />}
      </Column>
      <Row snug alignCenter>
        <Column fill>
          <Input
            placeholder="Ask about plans, billing, or setup…"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
          />
        </Column>
        <Button
          primary
          icon
          iconLeft={<Icon send primaryForeground size={18} />}
          accessibilityLabel="Send message"
          onPress={send}
        />
      </Row>
    </Column>
  );
}

function EmptyThreadLive() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [asked, setAsked] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const ask = (suggestion: (typeof SUGGESTIONS)[number]) => {
    if (pending) return;
    setAsked((prev) => [...prev, suggestion.label]);
    setMessages((prev) => [...prev, { from: "user", text: suggestion.question }]);
    setPending(true);
    timer.current = setTimeout(() => {
      setMessages((prev) => [...prev, { from: "assistant", text: suggestion.reply }]);
      setPending(false);
    }, 900);
  };

  const remaining = SUGGESTIONS.filter((s) => !asked.includes(s.label));

  return (
    <Column cozy alignCenter>
      {messages.length === 0 ? (
        <EmptyState
          icon={<Icon messageCircle />}
          title="Ask anything"
          description="The assistant answers from your workspace's docs and settings."
        />
      ) : (
        <Column snug style={{ width: "100%" }}>
          {messages.map((m, i) => (
            <Bubble key={i} from={m.from} text={m.text} />
          ))}
          {pending && <TypingRow />}
        </Column>
      )}
      {remaining.length > 0 && (
        <Row tight wrap center>
          {remaining.map((s) => (
            <Chip key={s.label} onPress={() => ask(s)}>{s.label}</Chip>
          ))}
        </Row>
      )}
    </Column>
  );
}

export const CHAT_TEMPLATE: TemplateDoc = {
  slug: "chat",
  name: "Chat",
  description: "Assistant conversation: message bubbles, a typing indicator, suggestion chips, and the composer. Built from live Canvas components.",
  sections: [
    {
      title: "Conversation",
      anatomy: "Bubbles are compact Cards (primary-tinted for the user, flat for the assistant), a Spinner typing row while the reply is pending, then the composer Input with its send Button. Sending appends your message and the assistant answers a moment later.",
      render: () => <ConversationLive />,
    },
    {
      title: "Empty thread",
      anatomy: "Before the first message: an EmptyState plus suggestion Chips. Pressing a Chip seeds the conversation with that question and the assistant's answer.",
      render: () => <EmptyThreadLive />,
    },
  ],
};
