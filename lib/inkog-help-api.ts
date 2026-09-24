export type InkogHelpResult = {
  type: "answer";
  answer: string;
};

export async function askInkogHelp(apiBase: string, question: string): Promise<InkogHelpResult> {
  const res = await fetch(`${apiBase}/help`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  const data = await res.json();

  if (!res.ok) {
    return {
      type: "answer",
      answer: data?.answer || "The inkog help brain is taking a breather. Try again in a moment.",
    };
  }

  return {
    type: "answer",
    answer: typeof data?.answer === "string" ? data.answer : "I can only answer questions about inkog from the project information I have.",
  };
}
