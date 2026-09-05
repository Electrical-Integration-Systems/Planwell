"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Chip,
  InputOTP,
  Label,
  Spinner,
  Surface,
  Table,
  Toast,
  toast,
} from "@heroui/react";
import { useAction } from "convex/react";
import { Clock3, Copy, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { CredentialFields, CredentialSharePageState } from "@/types/credentials";

function formatCredentialForClipboard(credential: CredentialFields) {
  const fields = [
    { label: "NAME", value: credential.name },
    { label: "TYPE", value: credential.type },
    { label: "USERNAME", value: credential.username },
    { label: "ENDPOINT", value: credential.endpoint },
    { label: "SECRET", value: credential.secret },
    { label: "NOTES", value: credential.notes },
  ];

  return fields
    .filter(({ value }) => value?.trim())
    .map(({ label, value }) => `${label}: ${value}`)
    .join("\n");
}

function copyText(value: string, message: string) {
  if (!navigator.clipboard) {
    toast.danger("Clipboard access is unavailable");
    return;
  }

  void navigator.clipboard
    .writeText(value)
    .then(() => toast.success(message))
    .catch(() => toast.danger("Failed to copy"));
}

export default function SharedCredentialsPage() {
  const getShareStatus = useAction(api.credentialShareActions.getShareStatus);
  const redeemShare = useAction(api.credentialShareActions.redeemShare);
  const [token, setToken] = useState("");
  const [pin, setPin] = useState("");
  const [pageState, setPageState] = useState<CredentialSharePageState>("loading");
  const [mode, setMode] = useState<"timed" | "one_time" | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | undefined>();
  const [credentials, setCredentials] = useState<CredentialFields[]>([]);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fragmentToken = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);

    if (!fragmentToken) {
      queueMicrotask(() => setPageState("unavailable"));
      return;
    }

    void getShareStatus({ token: fragmentToken })
      .then((result) => {
        if (result.status === "unavailable") {
          setPageState("unavailable");
          return;
        }
        setToken(fragmentToken);
        setMode(result.mode);
        setExpiresAt(result.expiresAt);
        setPageState("pin");
      })
      .catch(() => setPageState("unavailable"));
  }, [getShareStatus]);

  useEffect(() => {
    if (mode !== "one_time" || pageState !== "revealed") return;

    const clearOneTimeAccess = () => {
      setCredentials([]);
      setRevealedSecrets({});
      setToken("");
      setPageState("unavailable");
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") clearOneTimeAccess();
    };

    if (document.visibilityState === "hidden") {
      queueMicrotask(clearOneTimeAccess);
      return;
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", clearOneTimeAccess);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", clearOneTimeAccess);
    };
  }, [mode, pageState]);

  useEffect(() => {
    if (mode !== "timed" || pageState !== "revealed" || expiresAt === undefined) {
      return;
    }

    const remainingTime = expiresAt - Date.now();
    const expireAccess = () => {
      setCredentials([]);
      setRevealedSecrets({});
      setToken("");
      setPageState("unavailable");
    };

    if (remainingTime <= 0) {
      queueMicrotask(expireAccess);
      return;
    }

    const timeoutId = window.setTimeout(expireAccess, remainingTime);
    return () => window.clearTimeout(timeoutId);
  }, [expiresAt, mode, pageState]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{8}$/.test(pin) || !token) return;

    setPageState("submitting");
    void redeemShare({ token, pin })
      .then((result) => {
        if (!result.ok) {
          setPin("");
          setPageState("pin");
          toast.danger("This share is unavailable or the PIN is incorrect");
          return;
        }

        setCredentials(result.credentials);
        setMode(result.mode);
        setExpiresAt(result.expiresAt);
        setPin("");
        if (result.mode === "one_time") setToken("");
        setPageState("revealed");
      })
      .catch(() => {
        setPin("");
        setPageState("pin");
        toast.danger("This share is unavailable or the PIN is incorrect");
      });
  };

  return (
    <main className="default min-h-dvh overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <Toast.Provider placement="bottom-end" />
      <div className="h-1.5 bg-[var(--accent)]" />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-14">
        <header className="mb-8 max-w-2xl sm:mb-10">
          <Chip color="accent" variant="soft" size="sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            <Chip.Label>Protected share</Chip.Label>
          </Chip>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            Shared credentials
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            Enter the access PIN to reveal the credentials prepared for you.
          </p>
        </header>

        {pageState === "loading" ? (
          <Surface className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--border)] shadow-sm">
            <Spinner color="accent" size="lg" aria-label="Checking share link" />
            <div className="text-center">
              <p className="font-medium">Checking your link</p>
              <p className="mt-1 text-sm text-[var(--muted)]">This should only take a moment.</p>
            </div>
          </Surface>
        ) : pageState === "unavailable" ? (
          <Alert status="danger" className="mx-auto max-w-2xl">
            <Alert.Indicator>
              <KeyRound className="h-5 w-5" />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>Share unavailable</Alert.Title>
              <Alert.Description>
                This link is invalid, expired, revoked, locked, or has already been used.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : pageState === "pin" || pageState === "submitting" ? (
          <Card className="mx-auto max-w-2xl overflow-hidden border border-[var(--border)] shadow-xl shadow-blue-950/5">
            <div className="h-1 bg-[var(--accent)]" />
            <Card.Header className="border-b border-[var(--separator)] px-5 py-5 sm:px-8 sm:py-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-soft-foreground)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <Card.Title className="text-xl font-semibold">Enter access PIN</Card.Title>
                  <Card.Description className="mt-1">
                    Use the 8-digit PIN sent with this share.
                  </Card.Description>
                </div>
              </div>
            </Card.Header>
            <Card.Content className="px-5 py-6 sm:px-8 sm:py-8">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-3">
                  <Label className="font-medium">Access PIN</Label>
                  <InputOTP.Root
                    value={pin}
                    onChange={(value) => setPin(value.replace(/\D/g, "").slice(0, 8))}
                    maxLength={8}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    variant="primary"
                    isDisabled={pageState === "submitting"}
                    aria-label="8-digit access PIN"
                    autoFocus
                  >
                    <InputOTP.Group>
                      {[0, 1, 2, 3].map((index) => (
                        <InputOTP.Slot key={index} index={index} />
                      ))}
                    </InputOTP.Group>
                    <InputOTP.Separator />
                    <InputOTP.Group>
                      {[4, 5, 6, 7].map((index) => (
                        <InputOTP.Slot key={index} index={index} />
                      ))}
                    </InputOTP.Group>
                  </InputOTP.Root>
                </div>
                <div className="flex flex-col gap-4 border-t border-[var(--separator)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[var(--muted)]">
                    {mode === "one_time"
                      ? "This link can be redeemed once."
                      : expiresAt
                        ? `Available until ${new Date(expiresAt).toLocaleString("ro-RO")}`
                        : "Time-limited access"}
                  </p>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isDisabled={pin.length !== 8 || pageState === "submitting"}
                    className="sm:min-w-36"
                  >
                    {pageState === "submitting" ? (
                      <>
                        <Spinner color="current" size="sm" />
                        Checking
                      </>
                    ) : (
                      "Open share"
                    )}
                  </Button>
                </div>
              </form>
            </Card.Content>
          </Card>
        ) : (
          <div className="space-y-6">
            <Surface className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <h2 className="text-xl font-semibold">Credential entries</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {credentials.length} {credentials.length === 1 ? "entry" : "entries"} shared
                </p>
              </div>
              <Chip color="accent" variant="soft">
                {mode === "one_time" ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <Clock3 className="h-3.5 w-3.5" />
                )}
                <Chip.Label>
                  {mode === "one_time" ? "One-time access" : "Time limited"}
                </Chip.Label>
              </Chip>
            </Surface>

            {mode === "one_time" ? (
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Keep this tab open</Alert.Title>
                  <Alert.Description>
                    Access ends when this tab is hidden, closed, refreshed, or left.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}

            <div className="grid gap-5">
              {credentials.map((credential, index) => {
                const secretRevealed = revealedSecrets[index] ?? false;
                const rows = [
                  { id: "type", label: "Type", value: credential.type },
                  { id: "username", label: "Username", value: credential.username },
                  { id: "endpoint", label: "Endpoint", value: credential.endpoint },
                  { id: "secret", label: "Secret", value: credential.secret },
                  { id: "notes", label: "Notes", value: credential.notes },
                ].filter((row): row is { id: string; label: string; value: string } =>
                  Boolean(row.value?.trim()),
                );

                return (
                  <Card key={`${credential.name}-${index}`} className="overflow-hidden border border-[var(--border)] shadow-sm">
                    <Card.Header className="border-b border-[var(--separator)] px-5 py-4 sm:px-6">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Card.Title className="truncate text-lg font-semibold">{credential.name}</Card.Title>
                          <Card.Description className="mt-1">Credential {index + 1}</Card.Description>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={() =>
                            copyText(formatCredentialForClipboard(credential), "Credential copied")
                          }
                        >
                          <Copy className="h-4 w-4" />
                          Copy all
                        </Button>
                      </div>
                    </Card.Header>
                    <Card.Content className="p-0">
                      <Table aria-label={`${credential.name} credential fields`} variant="secondary">
                        <Table.ScrollContainer>
                          <Table.Content>
                            <Table.Header>
                              <Table.Column isRowHeader className="w-32">Field</Table.Column>
                              <Table.Column>Value</Table.Column>
                              <Table.Column className="w-28 text-right">Actions</Table.Column>
                            </Table.Header>
                            <Table.Body>
                              {rows.map((row) => (
                                <Table.Row key={row.id} id={row.id}>
                                  <Table.Cell className="font-medium text-[var(--muted)]">
                                    {row.label}
                                  </Table.Cell>
                                  <Table.Cell>
                                    <span className={`block max-w-xl whitespace-pre-wrap break-all ${row.id === "secret" ? "font-mono text-sm" : ""}`}>
                                      {row.id === "secret" && !secretRevealed
                                        ? "••••••••••••"
                                        : row.value}
                                    </span>
                                  </Table.Cell>
                                  <Table.Cell>
                                    {row.id === "secret" ? (
                                      <div className="flex justify-end gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          isIconOnly
                                          onPress={() => copyText(row.value, "Secret copied")}
                                          aria-label={`Copy ${credential.name} secret`}
                                        >
                                          <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          isIconOnly
                                          onPress={() =>
                                            setRevealedSecrets((current) => ({
                                              ...current,
                                              [index]: !secretRevealed,
                                            }))
                                          }
                                          aria-label={secretRevealed ? "Hide secret" : "Reveal secret"}
                                        >
                                          {secretRevealed ? (
                                            <EyeOff className="h-4 w-4" />
                                          ) : (
                                            <Eye className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                    ) : (
                                      <span className="block text-right text-[var(--muted)]">—</span>
                                    )}
                                  </Table.Cell>
                                </Table.Row>
                              ))}
                            </Table.Body>
                          </Table.Content>
                        </Table.ScrollContainer>
                      </Table>
                    </Card.Content>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}