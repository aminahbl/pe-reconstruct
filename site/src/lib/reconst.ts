import fs from "node:fs"
import path from "node:path"
import type { ReconstructedMap, ReconstSourceEntry, RequiredCognate, Segment, Sutta } from "./types"

const reconstDirectory = path.resolve(process.cwd(), "../reconst")
const filePattern = /^(dn\d+)_reconstructed_([^./]+)\.json$/
const requiredCognates = ["html", "root-pli-ms", "translation-en-sujato", "comment-en-sujato"] as const satisfies readonly RequiredCognate[]
const segmentCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base"
})

let cachedFileCollection: ReconstSourceEntry[] | undefined
let cachedFileCollectionIndex: Map<string, ReconstSourceEntry> | undefined
const cachedSuttas = new Map<string, Sutta>()

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

const isRequiredCognate = (value: string): value is RequiredCognate => {
  return requiredCognates.includes(value as RequiredCognate)
}

const readJsonMap = (filePath: string) => {
  const contents = fs.readFileSync(filePath, "utf8")
  let parsed: unknown
 
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    throw new Error(`Invalid JSON in file ${filePath}: ${error instanceof Error ? error.message : error}`)
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error(`Invalid reconstructed JSON: ${filePath}`)
  }

  return parsed as ReconstructedMap
}

const getRequiredFile = (entry: ReconstSourceEntry, cognate: RequiredCognate) => {
  const filePath = entry.files[cognate]

  if (filePath) {
    return filePath
  }

  throw new Error(`Missing reconstructed file for ${entry.slug}: ${cognate}`)
}

const getSuttaNumber = (slug: string) => Number.parseInt(slug.replace(/^dn/, ""), 10)

const getSegmentNumber = (segmentId: string) => {
  const [, number = segmentId] = segmentId.split(":")
  return number
}

const isTitleSegment = (segmentId: string) => /:0\.[12]$/.test(segmentId)

const compareSegments = (left: string, right: string) => {
  const [leftSlug, leftPath = ""] = left.split(":")
  const [rightSlug, rightPath = ""] = right.split(":")
  const numberDifference = getSuttaNumber(leftSlug) - getSuttaNumber(rightSlug)

  if (numberDifference) {
    return numberDifference
  }

  return segmentCollator.compare(leftPath, rightPath)
}

const buildFileCollection = () => {
  const entries = fs.readdirSync(reconstDirectory, { withFileTypes: true })
  const collection = new Map<string, ReconstSourceEntry>()

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue
    }

    const match = entry.name.match(filePattern)

    if (!match) {
      continue
    }

    const slug = match[1]
    const cognate = match[2]
    const existing: ReconstSourceEntry = collection.get(slug) ?? {
      slug,
      number: getSuttaNumber(slug),
      files: {}
    }

    if (isRequiredCognate(cognate)) {
      existing.files[cognate] = path.join(reconstDirectory, entry.name)
    }

    collection.set(slug, existing)
  }

  const values = [...collection.values()].sort((left, right) => left.number - right.number)

  for (const value of values) {
    const missing = requiredCognates.filter((cognate) => !value.files[cognate])

    if (missing.length) {
      throw new Error(`Missing reconstructed files for ${value.slug}: ${missing.join(", ")}`)
    }
  }

  return values
}

const getFileCollection = () => {
  if (!cachedFileCollection) {
    cachedFileCollection = buildFileCollection()
  }

  return cachedFileCollection
}

const getFileCollectionIndex = () => {
  const collection = getFileCollection()

  if (!cachedFileCollectionIndex || cachedFileCollectionIndex.size !== collection.length) {
    cachedFileCollectionIndex = new Map(collection.map((entry) => [entry.slug, entry] satisfies [string, ReconstSourceEntry]))
  }

  return cachedFileCollectionIndex
}

const buildSegments = (maps: {
  html: ReconstructedMap
  root: ReconstructedMap
  translation: ReconstructedMap
  comment: ReconstructedMap
}) => {
  const htmlKeys = Object.keys(maps.html).sort(compareSegments)

  return htmlKeys.map((segmentId) => {
    const pali = maps.root[segmentId] ?? ""
    const english = maps.translation[segmentId] ?? ""
    const comment = maps.comment[segmentId] ?? ""

    return {
      segmentId,
      segmentNumber: getSegmentNumber(segmentId),
      htmlTemplate: maps.html[segmentId] ?? "{}",
      pali,
      english,
      comment,
      hasComment: Boolean(normalizeText(comment)),
      hasEnglish: Boolean(normalizeText(english)),
      hasPali: Boolean(normalizeText(pali))
    } satisfies Segment
  })
}

const buildSutta = (entry: ReconstSourceEntry) => {
  const maps = {
    html: readJsonMap(getRequiredFile(entry, "html")),
    root: readJsonMap(getRequiredFile(entry, "root-pli-ms")),
    translation: readJsonMap(getRequiredFile(entry, "translation-en-sujato")),
    comment: readJsonMap(getRequiredFile(entry, "comment-en-sujato"))
  }
  const segments = buildSegments(maps)
  const reconstructedSegments = segments.filter((segment) => {
    if (isTitleSegment(segment.segmentId)) {
      return false
    }

    return segment.hasPali || segment.hasEnglish || segment.hasComment
  })
  const collectionTitle = normalizeText(maps.translation[`${entry.slug}:0.1`]) || `DN ${entry.number}`
  const displayTitle = normalizeText(maps.translation[`${entry.slug}:0.2`]) || normalizeText(maps.root[`${entry.slug}:0.2`]) || entry.slug.toUpperCase()
  const paliTitle = normalizeText(maps.root[`${entry.slug}:0.2`])
  const commentCount = reconstructedSegments.filter((segment) => segment.hasComment).length

  return {
    slug: entry.slug,
    number: entry.number,
    collectionTitle,
    displayTitle,
    paliTitle,
    segments,
    segmentCount: segments.length,
    reconstructedSegmentCount: reconstructedSegments.length,
    commentCount,
    hasComments: commentCount > 0,
    hasReferences: reconstructedSegments.length > 0
  } satisfies Sutta
}

const getCachedSuttaForEntry = (entry: ReconstSourceEntry) => {
  if (!cachedSuttas.has(entry.slug)) {
    cachedSuttas.set(entry.slug, buildSutta(entry))
  }

  return cachedSuttas.get(entry.slug) as Sutta
}

export const getAllSuttas = () => {
  return getFileCollection().map((entry) => getCachedSuttaForEntry(entry))
}

export const getSutta = (slug: string) => {
  const entry = getFileCollectionIndex().get(slug)

  if (!entry) {
    return
  }

  return getCachedSuttaForEntry(entry)
}
