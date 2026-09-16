import { useState } from "react";
import { Row, Column, Card, Typography, Button, Badge, Input, Avatar, StackedList, Divider, useFormFactor, Icon, useToast } from "@nannier-com/canvas";
import type { StackedListItem } from "@nannier-com/canvas";
import type { TemplateDoc } from "../types";

// Inbox built from real Canvas components: a message list beside the open
// thread on desktop, stacking to a single column on phones via useFormFactor.
// Pressing a conversation opens its canned thread, and Send appends the typed
// reply to whichever thread is open.

interface InboxMessage {
  initials: string;
  name: string;
  time: string;
  text: string;
}

interface Conversation {
  name: string;
  detail: string;
  meta: string;
  subject: string;
  messages: InboxMessage[];
}

const CONVERSATIONS: Conversation[] = [
  {
    name: "Rachel Chen",
    detail: "Re: Q3 access review, sign-off needed",
    meta: "9:12",
    subject: "Re: Q3 access review",
    messages: [
      {
        initials: "RC",
        name: "Rachel Chen",
        time: "9:12 AM",
        text: "The access review is due Friday. Two admin grants look stale; can you confirm whether Kevin still needs production write?",
      },
      {
        initials: "ME",
        name: "You",
        time: "9:20 AM",
        text: "Kevin moved to the data team last sprint, so production write can go. I will drop it today and note it in the review.",
      },
      {
        initials: "RC",
        name: "Rachel Chen",
        time: "9:24 AM",
        text: "Perfect. Once that lands I will sign off on the review.",
      },
    ],
  },
  {
    name: "Ada Lovelace",
    detail: "SSO rollout plan draft attached",
    meta: "8:40",
    subject: "SSO rollout plan",
    messages: [
      {
        initials: "AL",
        name: "Ada Lovelace",
        time: "8:40 AM",
        text: "Draft of the SSO rollout plan is attached. Phase one covers the engineering org behind Okta; phases two and three fold in sales and support. Can you review the cutover dates?",
      },
      {
        initials: "AL",
        name: "Ada Lovelace",
        time: "8:41 AM",
        text: "One open question: do we force-enroll existing sessions on day one, or let them expire naturally over the week?",
      },
    ],
  },
  {
    name: "Billing",
    detail: "Your July invoice is ready",
    meta: "Yesterday",
    subject: "Your July invoice is ready",
    messages: [
      {
        initials: "BI",
        name: "Billing",
        time: "Yesterday",
        text: "Your July invoice for the Acme workspace is ready: 42 seats on the Pro plan, $1,050.00, due August 1. A PDF copy was sent to finance@acme.com.",
      },
    ],
  },
  {
    name: "Kevin Turner",
    detail: "Kudos on the launch!",
    meta: "Yesterday",
    subject: "Kudos on the launch!",
    messages: [
      {
        initials: "KT",
        name: "Kevin Turner",
        time: "Yesterday",
        text: "Huge congrats on shipping the launch: the rollout was the smoothest we have had. The data team is already using the new export API.",
      },
      {
        initials: "ME",
        name: "You",
        time: "Yesterday",
        text: "Thanks Kevin! Credit to the whole crew. Let me know if the export API needs anything.",
      },
    ],
  },
];

function Message({ initials, name, time, children }: { initials: string; name: string; time: string; children: string }) {
  return (
    <Card flat>
      <Column snug>
        <Row between alignCenter>
          <Row snug alignCenter>
            <Avatar small name={initials} />
            <Typography small medium>{name}</Typography>
          </Row>
          <Typography tiny>{time}</Typography>
        </Row>
        <Typography small>{children}</Typography>
      </Column>
    </Card>
  );
}

function InboxLive() {
  // Phone stacks list over thread; wider keeps the fixed 300px rail beside the
  // fill thread pane. The stacked list must drop that fixed width, so this
  // stays a hook-driven branch rather than a Row `stacks`.
  const narrow = useFormFactor() === "phone";
  const { toast } = useToast();
  const [openIndex, setOpenIndex] = useState(0);
  const [threads, setThreads] = useState<InboxMessage[][]>(() => CONVERSATIONS.map((c) => c.messages));
  const [draft, setDraft] = useState("");

  const open = CONVERSATIONS[openIndex] ?? CONVERSATIONS[0];
  if (!open) return null;
  const thread = threads[openIndex] ?? [];
  const firstName = open.name.split(" ")[0] ?? open.name;

  const openConversation = (index: number) => {
    if (index === openIndex || !CONVERSATIONS[index]) return;
    setOpenIndex(index);
    setDraft("");
  };

  const sendReply = () => {
    const text = draft.trim();
    if (!text) {
      toast({ warning: true, message: "Nothing to send", description: "Type a reply first." });
      return;
    }
    setThreads((prev) =>
      prev.map((messages, index) =>
        index === openIndex ? [...messages, { initials: "ME", name: "You", time: "Just now", text }] : messages,
      ),
    );
    setDraft("");
  };

  // The open conversation trades its timestamp for an "Open" badge, so the
  // list shows which thread the right pane is on.
  const listItems: StackedListItem[] = CONVERSATIONS.map((c, index) =>
    index === openIndex
      ? { id: c.name, name: c.name, detail: c.detail, badge: "Open" }
      : { id: c.name, name: c.name, detail: c.detail, meta: c.meta },
  );

  const list = (
    <Card flush>
      <StackedList clickable items={listItems} onPressItem={openConversation} />
    </Card>
  );
  const threadPane = (
    <Column cozy>
      <Row between alignCenter wrap>
        <Typography h4>{open.subject}</Typography>
        <Badge secondary>{`${thread.length} ${thread.length === 1 ? "message" : "messages"}`}</Badge>
      </Row>
      {thread.map((message, index) => (
        <Message key={index} initials={message.initials} name={message.name} time={message.time}>
          {message.text}
        </Message>
      ))}
      <Divider />
      <Row snug alignCenter>
        <Column fill>
          <Input
            placeholder={`Reply to ${firstName}…`}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={sendReply}
          />
        </Column>
        <Button primary icon iconLeft={<Icon send primaryForeground size={18} />} accessibilityLabel="Send reply" onPress={sendReply} />
      </Row>
    </Column>
  );
  if (narrow) {
    return (
      <Column relaxed>
        {list}
        {threadPane}
      </Column>
    );
  }
  return (
    <Row relaxed alignStart>
      <Column style={{ width: 300 }}>{list}</Column>
      <Column fill>{threadPane}</Column>
    </Row>
  );
}

export const INBOX_TEMPLATE: TemplateDoc = {
  slug: "inbox",
  name: "Inbox",
  description: "Two-pane inbox: message list beside the open thread, stacking to one column on phones. Built from live Canvas components.",
  sections: [
    {
      title: "List and thread",
      anatomy: "Clickable StackedList of conversations (fixed 300px rail on desktop, marked with an Open badge) beside the open thread of flat message Cards, its subject and count Badge, and the controlled reply composer; pressing a conversation opens it and Send appends the reply. The panes stack below the sm breakpoint.",
      render: () => <InboxLive />,
    },
  ],
};
