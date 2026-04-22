# SunoFlow Feature Inventory

Last updated: 2026-04-22

## Authentication & Account

| Feature | Status | Key Files |
|---------|--------|-----------|
| Email/password login | Built | `src/app/[locale]/login`, `src/lib/auth.ts` |
| Google OAuth | Built | `src/lib/auth.ts` (NextAuth Google provider) |
| User registration | Built | `src/app/[locale]/register`, `src/app/api/register` |
| Password reset flow | Built | `src/app/[locale]/forgot-password`, `src/app/[locale]/reset-password` |
| Email verification | Built | `src/app/[locale]/verify-email` |
| API key management | Built | `src/lib/api-keys.ts`, `src/lib/api-key-auth.ts` |
| JWT sessions | Built | `src/lib/auth.ts` |
| Role-based access (admin) | Built | `src/lib/admin-auth.ts` |

## Onboarding & First-Run

| Feature | Status | Key Files |
|---------|--------|-----------|
| API key setup wizard | Built | `src/components/ApiKeyWizard.tsx` |
| Guided tour (OnboardingTour) | Built | `src/components/OnboardingTour.tsx`, `src/components/OnboardingTourUI.tsx` |
| Onboarding completion flag | Built | `User.onboardingCompleted` in Prisma schema |
| Onboarding API endpoint | Built | `src/app/api/onboarding` |
| First-generation confetti | Built | `src/components/Confetti.tsx` |

## Song Generation & Management

| Feature | Status | Key Files |
|---------|--------|-----------|
| Generate songs via Suno API | Built | `src/app/[locale]/generate`, `src/lib/sunoapi/generation.ts` |
| Generation queue | Built | `src/app/api/generation-queue` |
| Song library (list/grid) | Built | `src/app/[locale]/library` |
| Song detail view | Built | `src/app/[locale]/library/[id]`, `src/components/SongDetailView.tsx` |
| Edit song metadata | Built | `src/components/SongMetadataCard.tsx` |
| Delete/archive songs | Built | `src/app/api/songs/[id]` |
| Download songs (MP3/FLAC/WAV) | Built | `src/lib/download.ts`, `src/lib/flac-encoder.ts` |
| Public/private toggle | Built | Song model `isPublic` field |
| Public share URLs | Built | `src/app/[locale]/s/[slug]` |
| Song variations/remixes | Built | `Song.parentSongId`, `src/lib/variants-family.ts` |
| Generation attempts tracking | Built | `GenerationAttempt` model |
| Lyrics editor | Built | `src/components/LyricsEditor.tsx` |
| Cover art generation | Built | `src/lib/cover-art-generator.ts`, `src/components/CoverArtModal.tsx` |
| Import from Suno | Built | `src/components/SunoImportModal.tsx` |
| Bulk import via upload | Built | `src/components/AudioUploadForm.tsx` |
| Generation presets | Built | `GenerationPreset` model, `src/app/api/presets` |
| Prompt templates | Built | `src/app/[locale]/templates`, `src/app/api/prompt-templates` |

## Audio Playback

| Feature | Status | Key Files |
|---------|--------|-----------|
| Global persistent player | Built | `src/components/GlobalPlayer.tsx` |
| Waveform visualization | Built | `src/components/WaveformPlayer.tsx`, `src/components/PlayerWaveform.tsx` |
| Expanded full-screen player | Built | `src/components/ExpandedPlayer.tsx` |
| Queue management | Built | `src/components/UpNextPanel.tsx`, `src/components/QueueContext.tsx` |
| Shuffle/repeat modes | Built | `PlaybackState` model |
| Equalizer controls | Built | `src/components/EqualizerPanel.tsx`, `src/components/AudioEQContext.tsx` |
| Playback state persistence | Built | `PlaybackState` model |
| Play history tracking | Built | `PlayHistory`, `PlayEvent` models |
| Audio caching | Built | `src/lib/audio-cache.ts` |

## Playlists

| Feature | Status | Key Files |
|---------|--------|-----------|
| Create/edit/delete playlists | Built | `src/app/[locale]/playlists`, `src/app/api/playlists` |
| Playlist detail view | Built | `src/app/[locale]/playlists/[id]` |
| Add/remove/reorder songs | Built | `PlaylistSong` model with ordering |
| Public/private playlists | Built | Playlist model `isPublic` field |
| Public share URLs | Built | `src/app/[locale]/p/[slug]` |
| Collaborative playlists | Built | `PlaylistCollaborator` model |
| Playlist invitations | Built | `src/app/[locale]/playlists/invite/[token]` |
| Smart playlists | Built | `src/lib/smart-playlists.ts`, `src/app/api/smart-playlists` |
| Embeddable playlist player | Built | `src/app/[locale]/embed/playlist/[slug]` |

## Social Features

| Feature | Status | Key Files |
|---------|--------|-----------|
| Follow/unfollow users | Built | `Follow` model, `src/components/FollowButton.tsx` |
| Public user profiles | Built | `src/app/[locale]/u/[username]`, `src/app/[locale]/users/[id]` |
| Song comments (timestamped) | Built | `Comment` model, `src/components/CommentsSection.tsx` |
| Emoji reactions (timestamped) | Built | `SongReaction` model, `src/components/EmojiReactionPicker.tsx` |
| Song ratings (1-5 stars) | Built | `Rating` model |
| Social feed | Built | `src/app/[locale]/feed` |
| Activity tracking | Built | `Activity` model, `src/lib/activity.ts` |
| Favorites | Built | `src/app/[locale]/favorites`, `Favorite` model |

## Discovery & Recommendations

| Feature | Status | Key Files |
|---------|--------|-----------|
| Discover page | Built | `src/app/[locale]/discover` |
| Curated collections | Built | `Collection` model, `src/app/[locale]/discover/collections/[id]` |
| Explore page | Built | `src/app/[locale]/explore` |
| Radio / mood-based playback | Built | `src/app/[locale]/radio`, `src/components/MoodRadioView.tsx` |
| Song recommendations (embeddings) | Built | `src/lib/embeddings.ts`, `src/components/SongRecommendations.tsx` |
| Related songs | Built | `src/components/RelatedSongs.tsx` |
| Global search | Built | `src/components/SearchBar.tsx`, `src/app/api/search` |
| Library filters | Built | `src/components/LibraryFilterPanel.tsx` |
| RSS feed integration | Built | `src/lib/rss.ts`, `RssFeedSubscription` model |

## Advanced Features

| Feature | Status | Key Files |
|---------|--------|-----------|
| AI personas | Built | `src/app/[locale]/personas`, `src/components/PersonaManager.tsx` |
| Mashup studio | Built | `src/app/[locale]/mashup`, `src/components/MashupStudio.tsx` |
| Style boost | Built | `src/app/api/style-boost` |
| Lyric timestamps (karaoke) | Built | `LyricTimestamp` model |
| Lyric annotations | Built | `LyricAnnotation` model |
| Song comparison tool | Built | `src/app/[locale]/compare` |
| Embeddable song player | Built | `src/app/[locale]/embed/[songId]` |
| Export songs/playlists | Built | `src/lib/export.ts` |

## Analytics & Insights

| Feature | Status | Key Files |
|---------|--------|-----------|
| User analytics dashboard | Built | `src/app/[locale]/analytics`, `src/app/[locale]/dashboard/analytics` |
| Song-specific analytics | Built | `src/app/[locale]/dashboard/analytics/[songId]` |
| Play/view/download counts | Built | `PlayEvent`, `SongView` models |
| Insights digest | Built | `src/app/[locale]/insights`, `src/lib/digest.ts` |
| Inspiration digest | Built | `src/app/[locale]/inspire`, `InspirationDigest` model |
| Daily active streaks | Built | `UserStreak` model, `src/lib/streaks.ts` |
| Milestone achievements | Built | `UserMilestone` model |
| Generation history | Built | `src/app/[locale]/generations`, `src/components/GenerationHistoryView.tsx` |

## Billing & Payments

| Feature | Status | Key Files |
|---------|--------|-----------|
| Stripe subscription management | Built | `src/lib/stripe.ts`, `src/lib/billing.ts` |
| Pricing page | Built | `src/app/[locale]/pricing` |
| Billing settings | Built | `src/app/[locale]/settings/billing` |
| Credit system | Built | `src/lib/credits.ts`, `CreditUsage` model |
| Credit top-ups | Built | `CreditTopUp` model |
| Checkout flow | Built | `src/app/api/checkout` |
| Subscription tiers (Free/Starter/Pro/Studio) | Built | `Subscription` model |

## Notifications & Messaging

| Feature | Status | Key Files |
|---------|--------|-----------|
| In-app notification center | Built | `src/app/[locale]/notifications`, `src/components/NotificationBell.tsx` |
| Web push notifications | Built | `src/lib/push.ts`, `src/components/PushNotificationPrompt.tsx` |
| Email notifications | Built | `src/lib/email.ts` |
| Email digest (daily/weekly) | Built | `src/app/api/digests` |
| Quiet hours | Built | User model fields |
| Low credits banner | Built | `src/components/LowCreditsBanner.tsx` |

## User Settings & Profile

| Feature | Status | Key Files |
|---------|--------|-----------|
| Profile editing (bio, avatar, banner) | Built | `src/app/[locale]/profile` |
| Featured song selection | Built | `User.featuredSongId` |
| Theme (dark/light) | Built | `src/components/ThemeProvider.tsx` |
| Locale/language switching | Built | `src/components/LocaleSwitcher.tsx` |
| Notification preferences | Built | `src/app/[locale]/settings` |
| Default style preference | Built | User model field |
| Preferred genres | Built | User model field |

## Admin Panel

| Feature | Status | Key Files |
|---------|--------|-----------|
| Admin dashboard | Built | `src/app/[locale]/admin` |
| User management | Built | `src/app/[locale]/admin/users` |
| Content moderation | Built | `src/app/[locale]/admin/content`, `src/app/[locale]/admin/moderation` |
| Report management | Built | `src/app/[locale]/admin/reports` |
| Appeal handling | Built | `src/app/[locale]/admin/appeals` |
| Error logs | Built | `src/app/[locale]/admin/errors` |
| Admin activity logs | Built | `src/app/[locale]/admin/logs` |
| System metrics | Built | `src/app/[locale]/admin/metrics` |
| Admin analytics | Built | `src/app/[locale]/admin/analytics` |

## Content Safety

| Feature | Status | Key Files |
|---------|--------|-----------|
| Report songs/playlists | Built | `src/components/ReportModal.tsx`, `Report` model |
| Appeal system | Built | `Appeal` model |
| Content flagging (admin) | Built | `src/app/api/admin/content/[id]/flag` |
| User feedback collection | Built | `src/components/FeedbackModal.tsx`, `src/components/InAppFeedbackWidget.tsx` |
| Error reporting | Built | `ErrorReport` model, `src/app/api/error-report` |

## Platform & Infrastructure

| Feature | Status | Key Files |
|---------|--------|-----------|
| PWA support (install prompt) | Built | `src/components/PwaInstallPrompt.tsx` |
| Service worker / offline | Built | `src/components/ServiceWorkerRegistrar.tsx`, `src/components/OfflineIndicator.tsx` |
| Offline cache (IndexedDB) | Built | `src/lib/offline-cache.ts` |
| Pull-to-refresh | Built | `src/components/PullToRefreshContainer.tsx` |
| Feature gates/flags | Built | `src/lib/feature-gates.ts`, `src/components/FeatureGate.tsx` |
| i18n / multi-language | Built | next-intl integration |
| Open Graph images | Built | `src/app/api/og` |
| RSS feed output | Built | `src/app/api/rss` |
| API documentation page | Built | `src/app/[locale]/api-docs` |
| OpenAPI/Swagger spec | Built | `src/lib/openapi.ts` |
| Health check endpoint | Built | `src/app/api/health` |
| Prometheus metrics | Built | `src/app/api/metrics` |
| Rate limiting | Built | `src/lib/rate-limit.ts` |
| Circuit breaker | Built | `src/lib/circuit-breaker.ts` |
| Structured logging (Pino) | Built | `src/lib/logger.ts` |
| Sentry error tracking | Built | `src/components/GlobalErrorHandler.tsx` |
| PostHog analytics | Built | `src/components/PostHogProvider.tsx` |
| Keyboard shortcuts | Built | `src/components/KeyboardShortcutsModal.tsx` |
| Instagram sharing | Built | `src/lib/instagram.ts` |

## External Integrations

| Integration | Purpose | Key Files |
|-------------|---------|-----------|
| Suno API (sunoapi.org) | Song generation, lyrics, personas, uploads | `src/lib/sunoapi/` |
| Stripe | Payments, subscriptions, credits | `src/lib/stripe.ts` |
| Google OAuth | Social login | `src/lib/auth.ts` |
| Mailjet | Transactional & digest emails | `src/lib/email.ts` |
| OpenAI | Text embeddings for recommendations | `src/lib/embeddings.ts` |
| Web Push API | Browser push notifications | `src/lib/push.ts` |
| Sentry | Error monitoring | Sentry config |
| PostHog | Product analytics | PostHog config |

## Database Models (47 total)

User, Account, Session, ApiKey, Song, SongTag, Tag, Favorite, Rating, GenerationFeedback, GenerationAttempt, SongEmbedding, SongView, Playlist, PlaylistSong, PlaylistCollaborator, Collection, CollectionSong, Follow, Comment, SongReaction, Activity, PlayHistory, PlayEvent, PlaybackState, LyricTimestamp, LyricAnnotation, UserStreak, UserMilestone, GenerationQueueItem, Persona, GenerationPreset, PromptTemplate, PendingFeedGeneration, RssFeedSubscription, Notification, PushSubscription, Subscription, PaymentEvent, CreditUsage, CreditTopUp, AdminLog, Report, Appeal, UserFeedback, ErrorReport, RateLimitEntry, AnonRateLimitEntry, VerificationToken, InspirationDigest
