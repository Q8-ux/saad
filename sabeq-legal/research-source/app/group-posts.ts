import { groupNews } from "./group-news";
import { groupPostArtworks, type PostArtwork } from "./group-post-artworks";

export type GroupPost = (typeof groupNews)[number] & { artwork: PostArtwork };

export const groupPosts: GroupPost[] = groupNews.flatMap(post => {
  const artwork = groupPostArtworks[post.id];
  return post.source.includes("/p/") && artwork ? [{ ...post, artwork }] : [];
});
