export function createDicebearAvatar(name: string) {
  const seed = encodeURIComponent(name.trim() || "Employee");
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}`;
}
