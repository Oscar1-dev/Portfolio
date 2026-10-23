// Clips shown in the About page's "Inspired by" gallery. None of these are
// Oscar's work — each is another creator's TikTok, hosted locally under
// public/videos/ with the original watermark left intact and credited by
// handle. Dimensions are the files' real pixel sizes (used for aspect ratio
// so the layout never shifts while a clip loads).
//
// `column` places a clip in the left (0) or right (1) desktop column; the two
// stacks are balanced by total height (sum of height/width). Clips are
// numbered in reading order — left column top to bottom, then right — which
// is also the single-column order on narrow screens.
export interface Clip {
  slug: string; // public/videos/<slug>.mp4 + public/videos/posters/<slug>.jpg
  title: string;
  creator: string; // TikTok handle, without the @
  /** Where the credit comes from, if not a TikTok watermark. */
  platform?: string;
  width: number;
  height: number;
  column: 0 | 1;
}

export const clips: Clip[] = [
  // Left column
  { slug: 'moto-onboard', title: 'Road racing onboard', creator: 'apple.user2887886', width: 1024, height: 576, column: 0 },
  { slug: 'record-shop', title: 'Record shop', creator: '_ydkme_lilpeepfan420', width: 576, height: 1024, column: 0 },
  { slug: 'coraline-edit', title: 'Coraline edit', creator: 'ekybow', width: 1024, height: 576, column: 0 },
  { slug: 'face-paint', title: 'Face paint', creator: 'g3ng4rb0y', width: 576, height: 1024, column: 0 },
  { slug: 'road-racing-edit', title: 'Road racing edit', creator: 'melted_rubber_', width: 1024, height: 576, column: 0 },
  { slug: 'acoustic-song', title: 'Acoustic song', creator: 'philiphf', width: 576, height: 576, column: 0 },
  { slug: 'alice-in-chains-edit', title: 'Alice in Chains edit', creator: 'jonah_inchains', width: 706, height: 480, column: 0 },
  { slug: 'animated-edit', title: 'Animated edit', creator: 'yurredits_', width: 576, height: 1024, column: 0 },
  { slug: 'f16', title: 'F-16', creator: 'dudebro008', width: 910, height: 576, column: 0 },
  { slug: 'ducati', title: 'Ducati', creator: 'www.benevolent.store', width: 1024, height: 576, column: 0 },
  { slug: 'isle-of-man', title: 'Isle of Man TT', creator: 'apple.user2887886', width: 1020, height: 576, column: 0 },
  { slug: 'linkin-park', title: 'Linkin Park edit', creator: 'nerd1emoji', width: 768, height: 576, column: 0 },
  { slug: '50-first-dates', title: '50 First Dates edit', creator: 'ce_edits089', width: 1378, height: 576, column: 0 },
  { slug: 'summertime-depression', title: 'Summertime', creator: 'euvkes', width: 576, height: 1024, column: 0 },
  { slug: 'skrillex-2', title: 'Skrillex edit', creator: 'tcmadethis8', width: 1024, height: 576, column: 0 },
  { slug: 'linkin-park-3', title: 'Linkin Park live', creator: 'biskuttiger252', width: 1024, height: 576, column: 0 },
  { slug: 'fire-edit-cars-2', title: 'BMW E36', creator: 's13char', width: 576, height: 1024, column: 0 },
  // Right column
  { slug: 'motogp-edit', title: 'MotoGP edit', creator: 'kammler.gonsoulin', width: 576, height: 1024, column: 1 },
  { slug: 'drums', title: 'Drumming', creator: 'bennybellson', width: 654, height: 360, column: 1 },
  { slug: 'street', title: 'Street clips', creator: 'neptuniont', width: 576, height: 1024, column: 1 },
  { slug: 'visual-art', title: 'Visual art', creator: 'meme3_ctrl8', width: 1024, height: 576, column: 1 },
  { slug: 'arcane-edit', title: 'Arcane edit', creator: 'nevara.rose', width: 1024, height: 576, column: 1 },
  { slug: 'alt-styles', title: 'Alt styles', creator: 'user143671430', width: 576, height: 1024, column: 1 },
  { slug: 'cartoon-edit', title: 'Cartoon edit', creator: 'sshesheshe', width: 768, height: 576, column: 1 },
  { slug: 'cavetown-edit', title: 'Cavetown edit', creator: 'peop1efreakmeout', width: 576, height: 576, column: 1 },
  { slug: 'comedy-edit', title: 'Comedy edit', creator: 'harvey_playz94', width: 1024, height: 576, column: 1 },
  { slug: 'roadside-racing', title: 'Roadside racing', creator: 'fortheboys638', width: 1012, height: 576, column: 1 },
  { slug: 'fire-edit-cars', title: 'Car meet edit', creator: 'makuovv', platform: 'on-video credit', width: 1080, height: 1920, column: 1 },
  { slug: 'haunted-hotel', title: 'Haunted Hotel edit', creator: 'kxlie.gutierrezzz', width: 1024, height: 576, column: 1 },
  { slug: 'racing', title: 'Night racing', creator: 'jw.racing171', width: 1042, height: 576, column: 1 },
  { slug: 'skrillex', title: 'Skrillex live', creator: 'ntkllr', width: 766, height: 576, column: 1 },
  { slug: 'drift', title: 'FPV drift', creator: 'stan.fpv', width: 768, height: 576, column: 1 },
  { slug: 'fire-edit-cars-3', title: 'Drift show edit', creator: 'makuovv', platform: 'on-video credit', width: 1080, height: 1920, column: 1 },
];
