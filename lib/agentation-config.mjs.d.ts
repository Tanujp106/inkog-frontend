export const DEFAULT_AGENTATION_ENDPOINT: "http://localhost:4747";

export type AgentationConfig = {
  className: string;
  endpoint: string;
};

export function getAgentationConfig(input: {
  enabled?: boolean;
  endpoint?: string;
  isMounted: boolean;
  nodeEnv: string | undefined;
  pathname: string | null;
}): AgentationConfig | null;
