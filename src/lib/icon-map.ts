/**
 * Canonical Heroicons → Lucide migration map (Wave A1).
 *
 * DESIGN.md specifies Lucide icons at 22px / stroke 1.5. This module is the
 * single source of truth for that convention and for the per-symbol mapping
 * every migration batch consumes — icon swaps are lookup-not-decision.
 *
 * How to migrate a file:
 *   1. For each `XxxIcon` imported from `@heroicons/react/24/outline` (or
 *      `/24/solid`), look up `HEROICON_TO_LUCIDE.XxxIcon` and import that
 *      symbol from `lucide-react`.
 *   2. Render via the `Icon` wrapper (`@/components/ui/Icon`) which applies
 *      the size-22 / stroke-1.5 defaults:
 *        `<XMarkIcon className="w-5 h-5" />`
 *        → `<Icon icon={X} className="w-5 h-5" />`
 *      Tailwind `w-*` / `h-*` classes still win over the `size` attribute, so
 *      keeping the existing className preserves current rendered sizes.
 *   3. Solid variants: Lucide has no filled set. For active/toggled states
 *      that used `@heroicons/react/24/solid` (Heart, Star, Bookmark, Play,
 *      thumbs, …), render the same Lucide icon with `fill="currentColor"`.
 *   4. Check `HEROICON_TO_LUCIDE_NOTES` — entries listed there have no clean
 *      1:1 equivalent; the chosen target (and any deliberate-upgrade
 *      alternative) is documented per symbol. Visually verify those swaps.
 *
 * Keys cover every Heroicon symbol imported anywhere under src/ (enforced by
 * icon-map.test.ts, which scans the source tree). Values are verified to be
 * real lucide-react exports by the same test.
 */

/** DESIGN.md icon convention: Lucide, 22px, stroke 1.5. */
export const ICON_SIZE = 22;
export const ICON_STROKE_WIDTH = 1.5;

export const HEROICON_TO_LUCIDE = {
  AdjustmentsHorizontalIcon: "SlidersHorizontal",
  ArchiveBoxIcon: "Archive",
  ArchiveBoxXMarkIcon: "ArchiveX",
  ArrowDownTrayIcon: "Download",
  ArrowLeftIcon: "ArrowLeft",
  ArrowPathIcon: "RefreshCw",
  ArrowPathRoundedSquareIcon: "Repeat",
  ArrowRightIcon: "ArrowRight",
  ArrowTopRightOnSquareIcon: "ExternalLink",
  ArrowUpOnSquareStackIcon: "Share",
  ArrowUpTrayIcon: "Upload",
  ArrowUturnLeftIcon: "Undo2",
  ArrowsRightLeftIcon: "ArrowLeftRight",
  BackwardIcon: "Rewind",
  Bars3Icon: "Menu",
  BellAlertIcon: "BellRing",
  BellIcon: "Bell",
  BoltIcon: "Zap",
  BookOpenIcon: "BookOpen",
  BookmarkIcon: "Bookmark",
  CalendarDaysIcon: "CalendarDays",
  CalendarIcon: "Calendar",
  ChartBarIcon: "ChartColumn",
  ChartPieIcon: "ChartPie",
  ChatBubbleLeftEllipsisIcon: "MessageSquareMore",
  ChatBubbleLeftIcon: "MessageSquare",
  CheckBadgeIcon: "BadgeCheck",
  CheckCircleIcon: "CircleCheck",
  CheckIcon: "Check",
  ChevronDownIcon: "ChevronDown",
  ChevronLeftIcon: "ChevronLeft",
  ChevronRightIcon: "ChevronRight",
  ChevronUpDownIcon: "ChevronsUpDown",
  ChevronUpIcon: "ChevronUp",
  CircleStackIcon: "Database",
  ClipboardDocumentIcon: "ClipboardCopy",
  ClipboardDocumentListIcon: "ClipboardList",
  ClipboardIcon: "Clipboard",
  ClockIcon: "Clock",
  CloudArrowDownIcon: "CloudDownload",
  CodeBracketIcon: "Code",
  Cog6ToothIcon: "Settings",
  CommandLineIcon: "SquareTerminal",
  ComputerDesktopIcon: "Monitor",
  CreditCardIcon: "CreditCard",
  CubeIcon: "Box",
  CurrencyDollarIcon: "CircleDollarSign",
  DocumentDuplicateIcon: "Copy",
  DocumentTextIcon: "FileText",
  EllipsisVerticalIcon: "EllipsisVertical",
  EnvelopeIcon: "Mail",
  ExclamationCircleIcon: "CircleAlert",
  ExclamationTriangleIcon: "TriangleAlert",
  EyeIcon: "Eye",
  EyeSlashIcon: "EyeOff",
  FaceSmileIcon: "Smile",
  FilmIcon: "Film",
  FireIcon: "Flame",
  FlagIcon: "Flag",
  ForwardIcon: "FastForward",
  FunnelIcon: "Funnel",
  GlobeAltIcon: "Globe",
  HandThumbDownIcon: "ThumbsDown",
  HandThumbUpIcon: "ThumbsUp",
  HeartIcon: "Heart",
  HomeIcon: "House",
  InformationCircleIcon: "Info",
  KeyIcon: "Key",
  LightBulbIcon: "Lightbulb",
  LinkIcon: "Link",
  ListBulletIcon: "List",
  LockClosedIcon: "Lock",
  MagnifyingGlassIcon: "Search",
  MegaphoneIcon: "Megaphone",
  MicrophoneIcon: "Mic",
  MoonIcon: "Moon",
  MusicalNoteIcon: "Music",
  PaintBrushIcon: "Paintbrush",
  PauseIcon: "Pause",
  PencilIcon: "Pencil",
  PencilSquareIcon: "SquarePen",
  PhotoIcon: "Image",
  PlayIcon: "Play",
  PlusCircleIcon: "CirclePlus",
  PlusIcon: "Plus",
  PresentationChartLineIcon: "Presentation",
  QueueListIcon: "ListMusic",
  RectangleStackIcon: "Layers",
  RssIcon: "Rss",
  ScaleIcon: "Scale",
  ScissorsIcon: "Scissors",
  ServerStackIcon: "Server",
  ShareIcon: "Share2",
  ShieldCheckIcon: "ShieldCheck",
  ShieldExclamationIcon: "ShieldAlert",
  SignalSlashIcon: "WifiOff",
  SparklesIcon: "Sparkles",
  SpeakerWaveIcon: "Volume2",
  SpeakerXMarkIcon: "VolumeX",
  Squares2X2Icon: "LayoutGrid",
  StarIcon: "Star",
  StopIcon: "Square",
  SunIcon: "Sun",
  SwatchIcon: "SwatchBook",
  TagIcon: "Tag",
  TicketIcon: "Ticket",
  TrashIcon: "Trash2",
  TrophyIcon: "Trophy",
  UserCircleIcon: "CircleUserRound",
  UserGroupIcon: "UsersRound",
  UserMinusIcon: "UserMinus",
  UserPlusIcon: "UserPlus",
  UsersIcon: "Users",
  XCircleIcon: "CircleX",
  XMarkIcon: "X",
} as const satisfies Record<string, string>;

export type HeroiconName = keyof typeof HEROICON_TO_LUCIDE;

/**
 * Symbols WITHOUT a clean 1:1 Lucide equivalent. The map above picks the
 * closest target; the note explains the trade-off and, where relevant, a
 * deliberate-upgrade alternative. Every swap listed here needs a visual check
 * at 22px / stroke 1.5.
 */
export const HEROICON_TO_LUCIDE_NOTES: Partial<Record<HeroiconName, string>> = {
  ArrowUpOnSquareStackIcon:
    'Mapped to "Share" (iOS arrow-up-out-of-box); the stacked-squares detail is lost. Used for the Share action in swipable-song-row/LibraryView.',
  BackwardIcon:
    'Glyph-faithful "Rewind" (double triangle). Player previous-track controls may deliberately upgrade to "SkipBack".',
  ForwardIcon:
    'Glyph-faithful "FastForward" (double triangle). Player next-track / "play next" controls may deliberately upgrade to "SkipForward".',
  PresentationChartLineIcon:
    'Lucide "Presentation" is a bare board without the chart line. Use "ChartLine" instead where chart semantics matter more than the board.',
  QueueListIcon:
    'Mapped to "ListMusic" (music-domain queue, per blueprint). Generic non-music lists should use "List" instead.',
  RectangleStackIcon:
    'Metaphor swap: stacked rectangles → "Layers" (stacked diamonds). Closest stack metaphor Lucide offers.',
  SignalSlashIcon:
    'Radio-mast-with-slash → "WifiOff". Same offline semantics, different glyph family.',
  StopIcon:
    'Mapped to "Square" (media-stop glyph). Lucide has no dedicated rounded stop icon.',
  UserGroupIcon:
    'Heroicons shows 3 people, "UsersRound" shows 2. Kept distinct from UsersIcon → "Users".',
};
