export type CredentialFields = {
  name: string;
  type: string;
  username?: string;
  endpoint?: string;
  secret?: string;
  notes?: string;
};

export type CredentialFormState = {
  name: string;
  type: string;
  username: string;
  endpoint: string;
  secret: string;
  notes: string;
};

export type CredentialSharePageState =
  | "loading"
  | "pin"
  | "submitting"
  | "revealed"
  | "unavailable";
