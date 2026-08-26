export function initials(name: string) {
  const parts = name
    .replace(/\./g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toLocaleUpperCase("tr-TR"))
    .join("");
}

export function seedAvatarUrl(id: string) {
  return `/avatars/${id}.jpg`;
}
