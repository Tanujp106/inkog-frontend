export declare function copyTextToClipboard(
  text: string,
  options?: {
    clipboard?: { writeText?: (value: string) => Promise<void> };
    document?: {
      body?: { appendChild: (element: unknown) => void };
      createElement?: (tagName: string) => {
        value: string;
        style: Record<string, string>;
        setAttribute: (name: string, value: string) => void;
        select: () => void;
        remove?: () => void;
      };
      execCommand?: (command: string) => boolean;
    };
  },
): Promise<void>;
