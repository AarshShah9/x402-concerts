import prisma from "./prisma";

export interface ResolvedArtist {
  id: string;
  name: string;
  source: string;
  sourceId: string;
}

/**
 * Resolves artist names to Attraction IDs from the database
 * Uses exact matching and alias matching
 * @param names - Array of artist names to resolve
 * @returns Array of resolved attractions with their IDs
 */
export async function resolveArtistNames(
  names: string[],
): Promise<ResolvedArtist[]> {
  if (names.length === 0) {
    return [];
  }

  // Normalize names for matching (lowercase, trim)
  const normalizedNames = names.map((name) => name.toLowerCase().trim());

  // Find attractions by exact name match (case-insensitive)
  const exactMatches = await prisma.attraction.findMany({
    where: {
      name: {
        in: normalizedNames,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      source: true,
      sourceId: true,
    },
  });

  // Find attractions by alias match
  const aliasMatches = await prisma.attraction.findMany({
    where: {
      aliases: {
        hasSome: normalizedNames,
      },
    },
    select: {
      id: true,
      name: true,
      source: true,
      sourceId: true,
    },
  });

  // Combine and deduplicate results
  const allMatches = [...exactMatches, ...aliasMatches];
  const uniqueMatches = Array.from(
    new Map(allMatches.map((match) => [match.id, match])).values(),
  );

  return uniqueMatches;
}

/**
 * Resolves a single artist name
 * @param name - Artist name to resolve
 * @returns Resolved attraction or null if not found
 */
export async function resolveArtistName(
  name: string,
): Promise<ResolvedArtist | null> {
  const results = await resolveArtistNames([name]);
  return results[0] || null;
}
