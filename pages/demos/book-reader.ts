/**
 * Living Book Reader
 *
 * Each page's text is laid out precisely with Pretext's layoutWithLines() API —
 * no DOM height measurements in the hot path. As the reader turns the page,
 * the engine scores the incoming text for mood (action, romance, dark, mystery,
 * wonder, adventure, peaceful) and drives a matching particle / ambient-light
 * system on a canvas layer behind the book. Lines reveal themselves one by one
 * with a staggered fade-in so readers feel text arriving in real time.
 */

import { layoutWithLines, prepareWithSegments } from '../../src/layout.ts'

// ── Types ──────────────────────────────────────────────────────────────────

type Mood = 'action' | 'dark' | 'romance' | 'mystery' | 'wonder' | 'adventure' | 'peaceful'

type BookPage = {
  chapter: string
  title: string
  source: string
  text: string
}

type MoodTheme = {
  label: string
  emoji: string
  /** CSS background gradient for the outer stage */
  bg: string
  /** Main page background tint */
  pageBg: string
  /** Accent colour (spine, chapter label) */
  accent: string
  /** Particle colour [r, g, b] */
  particleRgb: [number, number, number]
  /** Particle behaviour */
  particleStyle: 'sparks' | 'fireflies' | 'rain' | 'motes' | 'stars' | 'leaves' | 'snowflakes'
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number // 0–1, decreases each frame
  size: number
  alpha: number
  /** Extra for specific styles */
  angle?: number
  spin?: number
  length?: number
}

// ── Book content (public-domain passages) ──────────────────────────────────

const PAGES: BookPage[] = [
  {
    chapter: 'Chapter I',
    title: 'Down the Rabbit-Hole',
    source: "Alice's Adventures in Wonderland — Lewis Carroll, 1865",
    text: `Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversations?"

So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself "Oh dear! Oh dear! I shall be too late!" But when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet.`,
  },
  {
    chapter: 'Act II, Scene II',
    title: 'The Balcony Scene',
    source: 'Romeo and Juliet — William Shakespeare, c. 1595',
    text: `But, soft! what light through yonder window breaks?
It is the east, and Juliet is the sun.
Arise, fair sun, and kill the envious moon,
Who is already sick and pale with grief,
That thou, her maid, art far more fair than she.

She speaks yet she says nothing: what of that?
Her eye discourses; I will answer it.
I am too bold, 'tis not to me she speaks.
Two of the fairest stars in all the heaven,
Having some business, do entreat her eyes
To twinkle in their spheres till they return.`,
  },
  {
    chapter: 'Chapter I',
    title: 'Jonathan Harker\'s Journal',
    source: 'Dracula — Bram Stoker, 1897',
    text: `The castle is on the very edge of a terrible precipice. A stone falling from the window would fall a thousand feet before hitting anything. I went to look out of the window once, and the sheer drop made my head reel. The bats which had been sheltering in the keep flew out and flapped silently away in the shadow of the night.

My feelings were not calmed by seeing strange figures moving about in the dark courtyard below, and by glimpsing pale faces peering from the shadows. The howl of wolves, which had seemed to me first as the sound of the wind, now carried a dreadful meaning that chilled my blood. I was a prisoner, and the castle was my prison.`,
  },
  {
    chapter: 'Chapter II',
    title: 'The Curse of the Baskervilles',
    source: 'The Hound of the Baskervilles — Arthur Conan Doyle, 1902',
    text: `"Mr. Holmes, they were the footprints of a gigantic hound!" It was a whisper that carried with it all the weight of a man's terror. Dr. Mortimer leaned forward, his eyes fixed upon Sherlock Holmes with an expression compounded of curiosity and some undefined dread.

Holmes remained perfectly still, as was his custom when listening to a client. The thin blue smoke of his pipe curled upward in silence while I watched his face for any flicker of reaction. None came. Only when the doctor had finished did Holmes stir, tapping the tips of his fingers together.

"You interest me exceedingly, Dr. Mortimer," he said at last. "Pray continue."`,
  },
  {
    chapter: 'Opening',
    title: 'Call me Ishmael',
    source: 'Moby-Dick — Herman Melville, 1851',
    text: `Call me Ishmael. Some years ago — never mind how long precisely — having little money in my pocket and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation.

Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street and methodically knocking people's hats off — then, I account it high time to get to sea as soon as I can.`,
  },
  {
    chapter: 'Chapter I',
    title: 'Introduction',
    source: 'The Time Machine — H. G. Wells, 1895',
    text: `The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us. His grey eyes shone and twinkled, and his usually pale face was flushed and animated.

"You must follow me carefully. I shall have to controvert one or two ideas that are almost universally accepted. The geometry, for instance, they taught you at school is founded on a misconception."

"Is not that rather a large thing to expect us to begin upon?" said Filby, an argumentative person with red hair. I think that at that time none of us quite believed in the Time Machine. The fact is, the Time Traveller was one of those men who are too clever to be believed.`,
  },
  {
    chapter: 'Chapter XIII',
    title: 'Treasure',
    source: 'Treasure Island — Robert Louis Stevenson, 1883',
    text: `And then, all of a sudden, out of the middle of the trees, with a great bound and a yell, Silver's men rushed upon us. There were only six of them, but they came on so fast and fiercely, with such a din of shouting and steel, that I was scattered to the winds before I knew what was happening.

Jim fired his pistol at the nearest man and the shot rang out above the roar of the surf. I saw Long John's face, pitiless and cool, as he leveled his cutlass. "Stand fast!" he bellowed to his men. "Let them come to us!" They were desperate fighters, each and every one, and I knew we had met our match.`,
  },
  {
    chapter: 'Chapter II',
    title: 'Where I Lived, and What I Lived For',
    source: 'Walden — Henry David Thoreau, 1854',
    text: `I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.

The morning wind forever blows, the poem of creation is uninterrupted; but few are the ears that hear it. Olympus is but the outside of the earth everywhere. Every morning was a cheerful invitation to make my life of equal simplicity — and I may say innocence — with Nature herself.

I love a broad margin to my life. Sometimes, in a summer morning, having taken my accustomed bath, I sat in my sunny doorway from sunrise till noon, rapt in a reverie.`,
  },
]

// ── Mood keyword scoring ───────────────────────────────────────────────────

const MOOD_KEYWORDS: Record<Mood, string[]> = {
  action: [
    'ran', 'rush', 'fight', 'battle', 'thunder', 'fire', 'storm', 'attack', 'sword', 'war',
    'rage', 'fury', 'charge', 'blast', 'crash', 'shot', 'shout', 'fierce', 'bold', 'fast',
    'leap', 'dash', 'strike', 'cut', 'bound', 'yell', 'desperate',
  ],
  dark: [
    'dark', 'shadow', 'death', 'fear', 'horror', 'blood', 'curse', 'dread', 'pale', 'grim',
    'grave', 'night', 'sinister', 'evil', 'terrible', 'precipice', 'prison', 'chill', 'wolf',
    'howl', 'bat', 'cold', 'prisoner', 'terror',
  ],
  romance: [
    'love', 'heart', 'kiss', 'tender', 'warmth', 'embrace', 'desire', 'longing', 'soft',
    'gentle', 'beauty', 'eyes', 'smile', 'together', 'fair', 'sun', 'arise', 'light', 'juliet',
    'romeo', 'balcony', 'twinkle', 'heaven',
  ],
  mystery: [
    'strange', 'unknown', 'secret', 'curious', 'puzzle', 'hidden', 'disappear', 'vanish',
    'silent', 'whisper', 'clue', 'suspect', 'footprint', 'gigantic', 'hound', 'holmes',
    'wonder', 'expression', 'dread',
  ],
  wonder: [
    'amazing', 'wonderful', 'discover', 'marvel', 'miracle', 'astonish', 'extraordinary',
    'infinite', 'light', 'dream', 'vision', 'star', 'time', 'machine', 'geometry', 'clever',
    'expound', 'recondite', 'twinkle', 'sphere',
  ],
  adventure: [
    'journey', 'quest', 'explore', 'discover', 'horizon', 'voyage', 'seek', 'found', 'path',
    'road', 'travel', 'wild', 'adventure', 'rabbit', 'follow', 'ran', 'hurried', 'sudden',
    'world', 'sail', 'sea', 'watery',
  ],
  peaceful: [
    'quiet', 'still', 'calm', 'peace', 'rest', 'gentle', 'soft', 'slow', 'breath', 'meadow',
    'garden', 'flower', 'morning', 'sunlight', 'woods', 'lake', 'deliberately', 'simplicity',
    'nature', 'sunshine', 'reverie', 'summer', 'margin', 'silence', 'wind', 'poem',
  ],
}

function detectMood(text: string): Mood {
  const lower = text.toLowerCase()
  const scores: Record<Mood, number> = {
    action: 0, dark: 0, romance: 0, mystery: 0, wonder: 0, adventure: 0, peaceful: 0,
  }

  for (const mood of Object.keys(scores) as Mood[]) {
    for (const word of MOOD_KEYWORDS[mood]) {
      let pos = lower.indexOf(word)
      while (pos !== -1) {
        scores[mood]++
        pos = lower.indexOf(word, pos + word.length)
      }
    }
  }

  let best: Mood = 'adventure'
  let bestScore = -1
  for (const mood of Object.keys(scores) as Mood[]) {
    if (scores[mood] > bestScore) {
      bestScore = scores[mood]
      best = mood
    }
  }
  return best
}

// ── Mood themes ────────────────────────────────────────────────────────────

const THEMES: Record<Mood, MoodTheme> = {
  adventure: {
    label: 'Whimsical Adventure',
    emoji: '🐇',
    bg: 'radial-gradient(ellipse at 50% 60%, #1a2a0e 0%, #0d0a07 100%)',
    pageBg: '#f8f3e8',
    accent: '#5a7a28',
    particleRgb: [160, 220, 80],
    particleStyle: 'leaves',
  },
  romance: {
    label: 'Tender Romance',
    emoji: '🌹',
    bg: 'radial-gradient(ellipse at 50% 50%, #2a0a14 0%, #0d0507 100%)',
    pageBg: '#fdf0f0',
    accent: '#8a2840',
    particleRgb: [255, 120, 150],
    particleStyle: 'fireflies',
  },
  dark: {
    label: 'Dark & Eerie',
    emoji: '🦇',
    bg: 'radial-gradient(ellipse at 50% 30%, #0d0810 0%, #050307 100%)',
    pageBg: '#f0edf4',
    accent: '#3a1a5a',
    particleRgb: [80, 40, 120],
    particleStyle: 'rain',
  },
  mystery: {
    label: 'Creeping Mystery',
    emoji: '🔍',
    bg: 'radial-gradient(ellipse at 40% 50%, #0e100a 0%, #07080d 100%)',
    pageBg: '#f4f2ec',
    accent: '#4a3a10',
    particleRgb: [180, 160, 60],
    particleStyle: 'motes',
  },
  wonder: {
    label: 'Scientific Wonder',
    emoji: '⚙️',
    bg: 'radial-gradient(ellipse at 50% 40%, #081020 0%, #04080d 100%)',
    pageBg: '#eef3fa',
    accent: '#1a4a7a',
    particleRgb: [80, 160, 255],
    particleStyle: 'stars',
  },
  action: {
    label: 'High-Seas Action',
    emoji: '⚔️',
    bg: 'radial-gradient(ellipse at 50% 50%, #200808 0%, #0d0404 100%)',
    pageBg: '#faf0ee',
    accent: '#8a2010',
    particleRgb: [255, 120, 40],
    particleStyle: 'sparks',
  },
  peaceful: {
    label: 'Quiet Reflection',
    emoji: '🌿',
    bg: 'radial-gradient(ellipse at 50% 70%, #081408 0%, #050a05 100%)',
    pageBg: '#f2f8f0',
    accent: '#2a5a20',
    particleRgb: [120, 200, 100],
    particleStyle: 'snowflakes',
  },
}

// ── Particle engine ────────────────────────────────────────────────────────

const MAX_PARTICLES = 80
const particles: Particle[] = []

function spawnParticle(style: MoodTheme['particleStyle'], W: number, H: number): Particle {
  switch (style) {
    case 'sparks':
      return {
        x: W * (0.2 + Math.random() * 0.6),
        y: H * (0.4 + Math.random() * 0.5),
        vx: (Math.random() - 0.5) * 4,
        vy: -2 - Math.random() * 4,
        life: 1,
        size: 1 + Math.random() * 2,
        alpha: 0.9,
        length: 4 + Math.random() * 8,
        angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.2,
      }
    case 'fireflies':
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        life: 1,
        size: 2 + Math.random() * 3,
        alpha: 0,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.04,
      }
    case 'rain':
      return {
        x: Math.random() * W,
        y: -10,
        vx: -0.4 + Math.random() * 0.2,
        vy: 3 + Math.random() * 3,
        life: 1,
        size: 1,
        alpha: 0.25 + Math.random() * 0.3,
        length: 8 + Math.random() * 12,
      }
    case 'motes':
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.5,
        life: 1,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.6,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.02,
      }
    case 'stars':
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: 0,
        vy: 0,
        life: Math.random(), // stagger initial life phase
        size: 1 + Math.random() * 2.5,
        alpha: 0,
        angle: Math.random() * Math.PI * 2,
        spin: 0,
      }
    case 'leaves':
      return {
        x: Math.random() * W,
        y: -10,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 0.8 + Math.random() * 1.4,
        life: 1,
        size: 3 + Math.random() * 4,
        alpha: 0.7,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.06,
      }
    case 'snowflakes':
      return {
        x: Math.random() * W,
        y: -10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 0.4 + Math.random() * 0.8,
        life: 1,
        size: 2 + Math.random() * 3,
        alpha: 0.5 + Math.random() * 0.4,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.03,
      }
  }
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  style: MoodTheme['particleStyle'],
  rgb: [number, number, number],
): void {
  const [r, g, b] = rgb

  ctx.save()
  ctx.globalAlpha = p.alpha

  switch (style) {
    case 'sparks': {
      const len = (p.length ?? 8) * p.life
      const a = p.angle ?? 0
      const grd = ctx.createLinearGradient(
        p.x, p.y, p.x + Math.cos(a) * len, p.y + Math.sin(a) * len,
      )
      grd.addColorStop(0, `rgba(${r},${g},${b},${p.alpha})`)
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.beginPath()
      ctx.strokeStyle = grd
      ctx.lineWidth = p.size
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len)
      ctx.stroke()
      break
    }
    case 'fireflies': {
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
      glow.addColorStop(0, `rgba(${r},${g},${b},${p.alpha})`)
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${p.alpha * 0.8})`
      ctx.fill()
      break
    }
    case 'rain': {
      const len = p.length ?? 10
      ctx.strokeStyle = `rgba(${r},${g},${b},${p.alpha})`
      ctx.lineWidth = p.size
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + p.vx * 4, p.y + len)
      ctx.stroke()
      break
    }
    case 'motes': {
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5)
      grd.addColorStop(0, `rgba(${r},${g},${b},${p.alpha})`)
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'stars': {
      // Twinkle: life oscillates from 0→1→0
      const twinkle = Math.abs(Math.sin(p.life * Math.PI))
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
      grd.addColorStop(0, `rgba(255,255,255,${twinkle * 0.9})`)
      grd.addColorStop(0.4, `rgba(${r},${g},${b},${twinkle * 0.5})`)
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'leaves': {
      ctx.translate(p.x, p.y)
      ctx.rotate(p.angle ?? 0)
      ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'snowflakes': {
      ctx.translate(p.x, p.y)
      ctx.rotate(p.angle ?? 0)
      ctx.strokeStyle = `rgba(${r},${g},${b},${p.alpha})`
      ctx.lineWidth = 0.8
      for (let i = 0; i < 6; i++) {
        const a2 = (i / 6) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(a2) * p.size, Math.sin(a2) * p.size)
        ctx.stroke()
      }
      break
    }
  }

  ctx.restore()
}

function tickParticle(p: Particle, style: MoodTheme['particleStyle'], dt: number, H: number): boolean {
  // Returns false when the particle should be removed
  switch (style) {
    case 'sparks':
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 0.12 * dt // gravity
      p.vx *= 0.98
      p.life -= 0.022 * dt
      p.alpha = p.life * 0.9
      return p.life > 0
    case 'fireflies': {
      const spin = p.spin ?? 0.03
      p.angle = (p.angle ?? 0) + spin * dt
      p.x += Math.cos(p.angle) * 0.4 * dt + p.vx * dt
      p.y += Math.sin(p.angle) * 0.4 * dt + p.vy * dt
      // Pulse alpha
      p.life += 0.015 * dt
      p.alpha = 0.5 + 0.5 * Math.sin(p.life * Math.PI * 2 * 0.3)
      return true // fireflies live forever, recycled by position
    }
    case 'rain':
      p.x += p.vx * dt
      p.y += p.vy * dt
      return p.y < H
    case 'motes':
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.angle = (p.angle ?? 0) + (p.spin ?? 0.02) * dt
      p.life -= 0.008 * dt
      p.alpha = p.life * 0.6
      return p.life > 0
    case 'stars':
      // Twinkle cycle: life advances slowly
      p.life += 0.012 * dt
      if (p.life > 1) p.life = 0
      return true
    case 'leaves':
      p.x += p.vx * dt + Math.sin(p.life * 5) * 0.3 * dt
      p.y += p.vy * dt
      p.angle = (p.angle ?? 0) + (p.spin ?? 0.05) * dt
      p.life -= 0.006 * dt
      p.alpha = Math.min(1, p.life * 5) * 0.7
      return p.life > 0
    case 'snowflakes':
      p.x += p.vx * dt + Math.sin(p.life * 3) * 0.4 * dt
      p.y += p.vy * dt
      p.angle = (p.angle ?? 0) + (p.spin ?? 0.03) * dt
      p.life -= 0.005 * dt
      return p.life > 0
  }
}

// ── Canvas/render state ────────────────────────────────────────────────────

let currentTheme: MoodTheme = THEMES.adventure
let lastTime = 0
let spawnAccum = 0

function initParticles(theme: MoodTheme, W: number, H: number): void {
  particles.length = 0
  const seed = theme.particleStyle === 'stars' ? 60 : theme.particleStyle === 'fireflies' ? 40 : 30
  for (let i = 0; i < seed; i++) {
    const p = spawnParticle(theme.particleStyle, W, H)
    // Stagger initial positions so not all born at top
    if (theme.particleStyle === 'rain' || theme.particleStyle === 'leaves' || theme.particleStyle === 'snowflakes') {
      p.y = Math.random() * H
      p.life = Math.random()
    }
    particles.push(p)
  }
}

function renderCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, now: number): void {
  const W = canvas.width
  const H = canvas.height
  const dt = Math.min((now - lastTime) / 16.67, 3) // normalise to 60fps ticks
  lastTime = now

  ctx.clearRect(0, 0, W, H)

  // Spawn new particles up to cap
  spawnAccum += dt
  const spawnRate = currentTheme.particleStyle === 'sparks' ? 2.5
    : currentTheme.particleStyle === 'rain' ? 2
    : currentTheme.particleStyle === 'leaves' ? 0.4
    : 0.25

  while (spawnAccum >= 1 / spawnRate && particles.length < MAX_PARTICLES) {
    particles.push(spawnParticle(currentTheme.particleStyle, W, H))
    spawnAccum -= 1 / spawnRate
  }
  if (spawnAccum > 4) spawnAccum = 0

  // Update + draw
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]!
    const alive = tickParticle(p, currentTheme.particleStyle, dt, H)
    if (!alive) {
      particles.splice(i, 1)
      continue
    }
    drawParticle(ctx, p, currentTheme.particleStyle, currentTheme.particleRgb)
  }

  requestAnimationFrame(t => renderCanvas(canvas, ctx, t))
}

// ── DOM & layout state ─────────────────────────────────────────────────────

const BOOK_FONT = '17px "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif'
const LINE_HEIGHT = 28

let currentPageIndex = 0
let isAnimating = false

// Cached prepared handles keyed by page index (avoid re-preparing on resize)
const preparedCache: Map<number, ReturnType<typeof prepareWithSegments>> = new Map()

// ── Theme transition ───────────────────────────────────────────────────────

function applyTheme(theme: MoodTheme): void {
  currentTheme = theme
  document.body.style.background = theme.bg
  const root = document.documentElement
  root.style.setProperty('--page-bg', theme.pageBg)
  root.style.setProperty('--accent', theme.accent)
}

// ── Pretext-powered line layout ────────────────────────────────────────────

function renderPageContent(pageIndex: number, animate: boolean): void {
  const page = PAGES[pageIndex]!
  const body = document.getElementById('page-body')!

  // Measure available width from the container (one DOM read, tolerated on page turn)
  const bookEl = document.getElementById('book')!
  const availableWidth = bookEl.getBoundingClientRect().width - 56 // 28px padding × 2

  if (availableWidth <= 0) return

  // Prepare text (cached per page index to avoid redundant canvas work on resize)
  if (!preparedCache.has(pageIndex)) {
    preparedCache.set(pageIndex, prepareWithSegments(page.text, BOOK_FONT))
  }
  const prepared = preparedCache.get(pageIndex)!

  // Layout all lines with Pretext — zero DOM measurements in this call
  const { lines } = layoutWithLines(prepared, availableWidth, LINE_HEIGHT)

  // Clear previous lines
  body.innerHTML = ''
  body.style.height = `${lines.length * LINE_HEIGHT}px`

  // Create absolutely positioned spans for each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const span = document.createElement('span')
    span.className = 'book-line'
    span.textContent = line.text
    span.style.top = `${18 + i * LINE_HEIGHT}px`
    body.appendChild(span)
  }

  // Stagger-animate lines in
  if (animate) {
    const spans = body.querySelectorAll<HTMLSpanElement>('.book-line')
    spans.forEach((span, i) => {
      // Reset to hidden in case any were previously visible
      span.classList.remove('visible')
      setTimeout(() => {
        span.classList.add('visible')
      }, 80 + i * 38)
    })
  } else {
    // Show all immediately (e.g. on initial load)
    const spans = body.querySelectorAll<HTMLSpanElement>('.book-line')
    spans.forEach(span => span.classList.add('visible'))
  }
}

// ── Page navigation ────────────────────────────────────────────────────────

function goToPage(nextIndex: number, direction: 'left' | 'right'): void {
  if (isAnimating) return
  if (nextIndex < 0 || nextIndex >= PAGES.length) return

  isAnimating = true

  const book = document.getElementById('book')!
  const flipClass = direction === 'right' ? 'turning-right' : 'turning-left'

  book.classList.add(flipClass)

  // After half the flip duration, swap content
  setTimeout(() => {
    currentPageIndex = nextIndex
    updatePageMeta()
    updateNavButtons()

    const page = PAGES[nextIndex]!
    const mood = detectMood(page.text)
    const theme = THEMES[mood]

    // Transition particles to new mood
    const canvas = document.getElementById('canvas') as HTMLCanvasElement
    initParticles(theme, canvas.width, canvas.height)
    applyTheme(theme)

    // Update mood badge
    const badge = document.getElementById('mood-badge')!
    badge.textContent = `${theme.emoji} ${theme.label}`

    // Render new page lines with Pretext, animate them in
    renderPageContent(nextIndex, true)
  }, 360) // half of 720ms animation

  // Remove animation class after it finishes
  setTimeout(() => {
    book.classList.remove(flipClass)
    isAnimating = false
  }, 720)
}

function updatePageMeta(): void {
  const page = PAGES[currentPageIndex]!

  const chapterLabel = document.getElementById('chapter-label')!
  const chapterTitle = document.getElementById('chapter-title')!
  const bookSource = document.getElementById('book-source')!
  const pageNumber = document.getElementById('page-number')!
  const dotsContainer = document.getElementById('progress-dots')!

  chapterLabel.textContent = page.chapter
  chapterTitle.textContent = page.title
  bookSource.textContent = page.source
  pageNumber.textContent = `${currentPageIndex + 1} / ${PAGES.length}`

  // Rebuild progress dots
  dotsContainer.innerHTML = ''
  for (let i = 0; i < PAGES.length; i++) {
    const dot = document.createElement('span')
    dot.className = 'progress-dot' + (i === currentPageIndex ? ' active' : '')
    dotsContainer.appendChild(dot)
  }
}

function updateNavButtons(): void {
  const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement
  const nextBtn = document.getElementById('next-btn') as HTMLButtonElement
  prevBtn.disabled = currentPageIndex === 0
  nextBtn.disabled = currentPageIndex === PAGES.length - 1
}

// ── Resize handler ─────────────────────────────────────────────────────────

let resizeRaf: number | null = null

function scheduleReflow(): void {
  if (resizeRaf !== null) cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = null
    renderPageContent(currentPageIndex, false)
    resizeCanvas()
  })
}

function resizeCanvas(): void {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

// ── Boot ───────────────────────────────────────────────────────────────────

function boot(): void {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!

  resizeCanvas()
  window.addEventListener('resize', scheduleReflow)

  // Wire nav buttons
  document.getElementById('prev-btn')!.addEventListener('click', () => {
    goToPage(currentPageIndex - 1, 'right')
  })
  document.getElementById('next-btn')!.addEventListener('click', () => {
    goToPage(currentPageIndex + 1, 'left')
  })

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      goToPage(currentPageIndex + 1, 'left')
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      goToPage(currentPageIndex - 1, 'right')
    }
  })

  // Render first page
  const firstPage = PAGES[0]!
  const firstMood = detectMood(firstPage.text)
  const firstTheme = THEMES[firstMood]

  applyTheme(firstTheme)
  initParticles(firstTheme, canvas.width, canvas.height)

  document.getElementById('mood-badge')!.textContent = `${firstTheme.emoji} ${firstTheme.label}`

  updatePageMeta()
  updateNavButtons()

  // Wait for fonts before laying out text so measurements use the loaded typeface
  document.fonts.ready.then(() => {
    renderPageContent(0, true)
  })

  // Start the particle render loop
  requestAnimationFrame(t => {
    lastTime = t
    renderCanvas(canvas, ctx, t)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true })
} else {
  boot()
}
