const AVATAR_COLORS = ['#3a7a50', '#5c4a9a', '#9a5c4a', '#4a7a9a', '#7a5040', '#8a6a3a'];

export function avatarColor(authorId: string): string {
  let hash = 0;
  for (let i = 0; i < authorId.length; i++) {
    hash = (hash + authorId.charCodeAt(i) * 17) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash];
}
