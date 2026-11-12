import type { Character } from "./types";

export const CHARACTERS: Character[] = [];

export function getCharacterById(characterId: string) {
  return CHARACTERS.find((character) => character.characterId === characterId);
}
