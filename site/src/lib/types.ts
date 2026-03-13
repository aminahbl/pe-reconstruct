export type LanguageMode = "en" | "pli" | "both"
export type BilingualLayout = "split" | "stacked"
export type RequiredCognate = "html" | "root-pli-ms" | "translation-en-sujato" | "comment-en-sujato"

export interface ReconstructedMap {
  [segmentId: string]: string
}

export interface ReconstSourceEntry {
  slug: string
  number: number
  files: Partial<Record<RequiredCognate, string>>
}

export interface Segment {
  segmentId: string
  segmentNumber: string
  htmlTemplate: string
  pali: string
  english: string
  comment: string
  hasComment: boolean
  hasEnglish: boolean
  hasPali: boolean
}

export interface Sutta {
  slug: string
  number: number
  collectionTitle: string
  displayTitle: string
  paliTitle: string
  segments: Segment[]
  segmentCount: number
  reconstructedSegmentCount: number
  commentCount: number
  hasComments: boolean
  hasReferences: boolean
}

export interface ComposedSegment extends Segment {
  sanitizedTemplate: string
}

export interface ComposedSutta extends Sutta {
  contentSegments: ComposedSegment[]
  renderedBilingualHtml: string
  renderedPaliHtml: string
  renderedEnglishHtml: string
}
