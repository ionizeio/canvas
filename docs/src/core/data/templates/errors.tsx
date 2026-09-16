import { useEffect, useState } from "react";
import { Row, Column, Card, Typography, Button, Badge, Alert, Emblem, EmptyState, Icon, useToast, Container } from "@nannier-com/canvas";
import type { TemplateDoc } from "../types";

// Error and empty states built from real Canvas components: the honest 404 and
// 500 pages, a maintenance banner, and the first-run empty state that turns a
// dead end into the next step.

function NotFoundLive() {
  const { toast } = useToast();
  return (
    <Column cozy alignCenter>
      <Typography mono muted>404</Typography>
      <EmptyState
        icon={<Icon search />}
        title="Page not found"
        description="The page may have moved, or the link is out of date."
        actionLabel="Back to home"
        onAction={() => toast({ message: "Back to home", description: "In a real app this returns to the dashboard." })}
      />
    </Column>
  );
}

function ServerErrorLive() {
  const { toast } = useToast();
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    if (!retrying) return;
    const timer = setTimeout(() => {
      setRetrying(false);
      toast({ success: true, message: "Back online", description: "The request went through on the retry." });
    }, 800);
    return () => clearTimeout(timer);
  }, [retrying, toast]);
  return (
    <Column cozy alignCenter>
      <EmptyState
        bordered
        icon={<Icon alertTriangle />}
        title="Something went wrong"
        description="The request failed on our side. Your data is safe; trying again usually works."
      />
      <Row center snug alignCenter>
        <Button primary loading={retrying} onPress={() => setRetrying(true)}>Try again</Button>
        <Button
          link
          small
          onPress={() => toast({ message: "Contact support", description: "In a real app this opens a ticket with the error attached." })}
        >
          Contact support
        </Button>
      </Row>
    </Column>
  );
}

function MaintenanceLive() {
  const { toast } = useToast();
  return (
    <Alert
      warning
      icon={<Icon alertTriangle size={16} />}
      title="Scheduled maintenance"
      description="Canvas Cloud is read-only until 04:00 UTC while we upgrade the database. Nothing is lost; writes resume automatically."
      actions={
        <Button
          link
          small
          onPress={() => toast({ message: "Status page", description: "In a real app this opens the live status page." })}
        >
          Status page
        </Button>
      }
    />
  );
}

function FirstRunLive() {
  const { toast } = useToast();
  const [created, setCreated] = useState(false);
  if (created) {
    return (
      <Container lg start>
        <Card>
          <Row between alignCenter wrap>
            <Row snug alignCenter>
              <Emblem primary>
                <Icon folderPlus />
              </Emblem>
              <Column tight>
                <Typography small medium>Production</Typography>
                <Typography tiny>Created just now · 0 identities</Typography>
              </Column>
            </Row>
            <Row snug alignCenter>
              <Badge status success>Active</Badge>
              <Button link small onPress={() => setCreated(false)}>Start over</Button>
            </Row>
          </Row>
        </Card>
      </Container>
    );
  }
  return (
    <EmptyState
      bordered
      icon={<Icon folderPlus />}
      title="No projects yet"
      description="Projects group your identities, policies, and API keys per environment."
      actionLabel="Create your first project"
      onAction={() => {
        setCreated(true);
        toast({ success: true, message: "Project created", description: "Production is ready for identities and keys." });
      }}
    />
  );
}

export const ERRORS_TEMPLATE: TemplateDoc = {
  slug: "errors",
  name: "Errors & empty states",
  description: "404, server error, maintenance, and first-run empty states. Calm, honest, and always pointing at the next step. Built from live Canvas components.",
  sections: [
    {
      title: "Not found (404)",
      anatomy: "EmptyState with a search icon: name the miss, offer the way home. The status code is muted metadata, not the headline.",
      render: () => <NotFoundLive />,
    },
    {
      title: "Something went wrong (500)",
      anatomy: "EmptyState with a warning icon, then a retry Button that shows its loading state, plus a secondary support link.",
      render: () => <ServerErrorLive />,
    },
    {
      title: "Maintenance",
      anatomy: "A warning Alert banner over the product shell while a window is active.",
      render: () => <MaintenanceLive />,
    },
    {
      title: "First run",
      anatomy: "The empty project list as an invitation: creating the project swaps the EmptyState for the new project's Card.",
      render: () => <FirstRunLive />,
    },
  ],
};
