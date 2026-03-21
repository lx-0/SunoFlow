import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  // Pop
  {
    name: "Pop Anthem",
    description: "Catchy, radio-ready pop with big hooks and uplifting energy",
    prompt: "Write a catchy pop anthem with uplifting lyrics about chasing dreams, featuring a memorable chorus hook",
    style: "pop, catchy, uplifting, radio-hit, synth-pop",
    category: "pop",
    isInstrumental: false,
  },
  {
    name: "Pop Ballad",
    description: "Emotional, slow-tempo pop ballad with heartfelt vocals",
    prompt: "Write an emotional pop ballad about lost love, with soft piano and building strings",
    style: "pop ballad, emotional, slow, piano, heartfelt",
    category: "pop",
    isInstrumental: false,
  },
  // Rock
  {
    name: "Indie Rock",
    description: "Jangly guitars with introspective, poetic lyrics",
    prompt: "Write an indie rock song with jangly guitars and introspective lyrics about finding yourself in a new city",
    style: "indie rock, jangly guitars, alternative, introspective",
    category: "rock",
    isInstrumental: false,
  },
  {
    name: "Classic Rock Riff",
    description: "Heavy guitar riffs and driving drums in classic rock style",
    prompt: "A high-energy classic rock instrumental with powerful guitar riffs and driving drums",
    style: "classic rock, guitar riff, driving drums, powerful, energetic",
    category: "rock",
    isInstrumental: true,
  },
  // Hip-Hop
  {
    name: "Lo-Fi Hip-Hop",
    description: "Chill, jazzy beats perfect for studying or relaxing",
    prompt: "Chill lo-fi hip-hop beat with jazzy piano chords, vinyl crackle, and mellow vibes",
    style: "lo-fi hip-hop, chill, jazzy, mellow, vinyl",
    category: "hip-hop",
    isInstrumental: true,
  },
  {
    name: "Boom Bap Flow",
    description: "Old-school hip-hop with punchy drums and smooth flow",
    prompt: "Write a boom bap hip-hop track with punchy drums, scratchy samples, and lyrics about perseverance",
    style: "boom bap, hip-hop, old school, punchy drums, rap",
    category: "hip-hop",
    isInstrumental: false,
  },
  // Ambient / Electronic
  {
    name: "Ambient Dreamscape",
    description: "Ethereal, atmospheric textures for deep relaxation",
    prompt: "Ambient dreamscape with lush pads, gentle arpeggios, and floating textures",
    style: "ambient, ethereal, atmospheric, dreamy, pads",
    category: "ambient",
    isInstrumental: true,
  },
  {
    name: "Synthwave Drive",
    description: "Retro 80s synthwave with pulsing bass and neon energy",
    prompt: "Retro synthwave track with pulsing bass, arpeggiated synths, and 80s nostalgia vibes",
    style: "synthwave, retro, 80s, synth, electronic, driving",
    category: "electronic",
    isInstrumental: true,
  },
  // R&B / Soul
  {
    name: "Smooth R&B",
    description: "Silky R&B grooves with soulful vocal melodies",
    prompt: "Write a smooth R&B love song with silky vocals, warm bass, and a late-night vibe",
    style: "r&b, smooth, soulful, groovy, late-night",
    category: "r&b",
    isInstrumental: false,
  },
  // Country / Folk
  {
    name: "Acoustic Folk",
    description: "Warm acoustic guitar with storytelling lyrics",
    prompt: "Write a folk song with warm acoustic guitar and storytelling lyrics about a road trip across the countryside",
    style: "folk, acoustic, storytelling, warm, country-folk",
    category: "folk",
    isInstrumental: false,
  },
  // Jazz
  {
    name: "Jazz Café",
    description: "Smooth jazz trio vibes for a cozy café atmosphere",
    prompt: "Smooth jazz trio piece with soft piano comping, upright bass walking lines, and brushed drums",
    style: "jazz, smooth, café, piano trio, relaxing",
    category: "jazz",
    isInstrumental: true,
  },
  // Latin
  {
    name: "Reggaeton Beat",
    description: "High-energy reggaeton rhythm with infectious dembow groove",
    prompt: "Write a reggaeton track with infectious dembow rhythm, catchy hook, and summer party energy",
    style: "reggaeton, latin, dembow, party, energetic",
    category: "latin",
    isInstrumental: false,
  },
];

async function main() {
  // Delete old built-in templates and re-seed with the curated set
  const deleted = await prisma.promptTemplate.deleteMany({
    where: { isBuiltIn: true },
  });
  if (deleted.count > 0) {
    console.log(`Removed ${deleted.count} old built-in templates.`);
  }

  console.log("Seeding built-in prompt templates...");

  for (const t of templates) {
    await prisma.promptTemplate.create({
      data: {
        ...t,
        isBuiltIn: true,
        userId: null,
      },
    });
  }

  console.log(`Seeded ${templates.length} built-in templates.`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
