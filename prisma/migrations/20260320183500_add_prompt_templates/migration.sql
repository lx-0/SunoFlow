-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "style" TEXT,
    "isInstrumental" BOOLEAN NOT NULL DEFAULT false,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromptTemplate_userId_idx" ON "PromptTemplate"("userId");

-- AddForeignKey
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed built-in templates
INSERT INTO "PromptTemplate" ("id", "userId", "name", "prompt", "style", "isInstrumental", "isBuiltIn") VALUES
    ('builtin_upbeat_pop', NULL, 'Upbeat Pop', 'A catchy, feel-good pop song with uplifting energy', 'upbeat pop, catchy, feel-good, radio-friendly', false, true),
    ('builtin_chill_lofi', NULL, 'Chill Lo-fi', 'Relaxing lo-fi hip hop beats for studying and chilling', 'lo-fi hip hop, chill, relaxing, mellow beats', true, true),
    ('builtin_epic_cinematic', NULL, 'Epic Cinematic', 'An epic orchestral cinematic piece with dramatic builds', 'epic orchestral, cinematic, dramatic, film score', true, true),
    ('builtin_acoustic_folk', NULL, 'Acoustic Folk', 'A warm acoustic folk song with heartfelt storytelling', 'acoustic folk, warm, storytelling, singer-songwriter', false, true),
    ('builtin_electronic_dance', NULL, 'Electronic Dance', 'High-energy electronic dance music with driving beats', 'EDM, electronic, dance, high-energy, synth', true, true);
