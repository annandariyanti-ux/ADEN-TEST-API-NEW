export interface EbookChapter {
  title: string;
  content: string;
  summary: string;
}

export interface Ebook {
  title: string;
  author: string;
  niche: string;
  tone: string;
  chapters: EbookChapter[];
}

export interface EbookInput {
  topic: string;
  pageCount: number;
  tone: string;
  author: string;
}
