import type { ComposedSegment, ComposedSutta, LanguageMode, Segment, Sutta } from "./types"

const stripClosingArticle = (template: string) => template.replace(/<\/article>\s*$/i, "")
const stripOpeningArticle = (template: string) => template.replace(/^<article\b[^>]*><header><ul><li\b[^>]*>/i, "")
const stripClosingHeader = (template: string) => template.replace(/<\/li><\/ul><\/header>|<\/header>/i, "")
const sanitizeTemplate = (template: string) => stripClosingArticle(stripClosingHeader(stripOpeningArticle(template)))

const escapeAttribute = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

const escapeText = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

const isTitleSegment = (segmentId: string) => /:0\.[12]$/.test(segmentId)

const normalizeText = (value: string) => value.trim()

const renderReference = (segment: Segment) => {
  return `<span class="segment__reference" data-segment-reference="${escapeAttribute(segment.segmentId)}">${escapeText(segment.segmentNumber)}</span>`
}

const renderComment = (segment: Segment, language: Exclude<LanguageMode, "both">) => {
  if (language !== "en") {
    return ""
  }

  if (!segment.hasComment) {
    return ""
  }

  return `<span class="segment__comment" data-segment-comment="${escapeAttribute(segment.segmentId)}">${escapeText(segment.comment)}</span>`

}

const renderGap = (segment: Segment) => {
  if (segment.hasPali) {
    return `<span class="segment__gap" data-segment-gap="${escapeAttribute(segment.segmentId)}">[…]</span>`
  }

  return ""
}

const renderText = (segment: Segment, language: Exclude<LanguageMode, "both">) => {
  if (language === "pli") {
    return segment.pali
  }

  if (segment.hasEnglish) {
    return segment.english
  }

  return renderGap(segment)
}

const composeSegmentMarkup = (segment: Segment, language: Exclude<LanguageMode, "both">) => {
  const idPrefix = language === "en" ? "en" : "pli"
  const text = renderText(segment, language)
  const languageClassName = language === "en" ? "segment--en" : "segment--pli"

  return [
    `<span class="segment ${languageClassName}" id="${idPrefix}-${escapeAttribute(segment.segmentId)}" data-segment="${escapeAttribute(segment.segmentId)}">`,
    `<span class="segment__text" lang="${language === "en" ? "en" : "pi"}"${language === "pli" ? ' translate="no"' : ""}>${text}</span>`,
    renderReference(segment),
    renderComment(segment, language),
    "</span>"
  ].join("")
}

const composeColumnHtml = (segments: ComposedSegment[], language: Exclude<LanguageMode, "both">) => {
  return segments
    .map((segment) => segment.sanitizedTemplate.split("{}").join(composeSegmentMarkup(segment, language)))
    .join("")
}

const composeBilingualHtml = (segments: ComposedSegment[]) => {
  return segments
    .map((segment) => {
      const segmentMarkup = [
        `<span class="segment-pair" data-segment-pair="${escapeAttribute(segment.segmentId)}">`,
        composeSegmentMarkup(segment, "en"),
        composeSegmentMarkup(segment, "pli"),
        "</span>"
      ].join("")

      return segment.sanitizedTemplate.split("{}").join(segmentMarkup)
    })
    .join("")
}

export const composeSutta = (sutta: Sutta) => {
  const contentSegments = sutta.segments
    .filter((segment) => !isTitleSegment(segment.segmentId))
    .map((segment) => ({
      ...segment,
      sanitizedTemplate: sanitizeTemplate(segment.htmlTemplate)
    } satisfies ComposedSegment))
    .filter((segment) => {
      return Boolean(normalizeText(segment.sanitizedTemplate))
    })

  return {
    ...sutta,
    contentSegments,
    renderedBilingualHtml: composeBilingualHtml(contentSegments),
    renderedPaliHtml: composeColumnHtml(contentSegments, "pli"),
    renderedEnglishHtml: composeColumnHtml(contentSegments, "en")
  } satisfies ComposedSutta
}
