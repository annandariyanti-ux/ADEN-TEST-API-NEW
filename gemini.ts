import { EbookInput } from "../types";

export async function generateTableOfContents(input: EbookInput): Promise<string[]> {
  try {
    const response = await fetch("/api/generate-toc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error("Failed to generate Table of Contents");
    }

    return await response.json();
  } catch (error) {
    console.error("ToC Generation Error:", error);
    return [];
  }
}

export async function generateChapterContent(
  chapterTitle: string, 
  input: EbookInput, 
  previousChapters: string[]
): Promise<string> {
  try {
    const response = await fetch("/api/generate-chapter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chapterTitle,
        topic: input.topic,
        tone: input.tone,
        author: input.author,
        previousChapters,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate chapter content");
    }

    const data = await response.json();
    return data.content || "";
  } catch (error) {
    console.error("Chapter Generation Error:", error);
    return "";
  }
}
