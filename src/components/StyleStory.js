import { homeVideos, shipNote, RATIO } from "@/lib/styleVideos";
import StyleStoryClient from "./StyleStoryClient";

// Home page: "Watch The Style Story". Koi video live nahi (ya sab ke product dikhne layak nahi) to ye section dikhta hi nahi.
export default function StyleStory() {
  const items = homeVideos();
  if (!items.length) return null;
  return <StyleStoryClient items={items} shipNote={shipNote()} ratio={RATIO} />;
}
