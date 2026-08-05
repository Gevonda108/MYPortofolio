import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  achievements,
  contacts,
  projects,
  roles,
  skillGroups,
  stats,
  supportLinks,
  terminalCommands,
  timeline,
} from './content';

const sectionOrder = ['about', 'skills', 'achievements', 'projects', 'support', 'suggestions', 'reviews', 'timeline', 'contact'];

const sectionTitles = {
  about: 'About',
  skills: 'Skills',
  achievements: 'Achievements',
  projects: 'Projects',
  support: 'Support Me',
  suggestions: 'Suggestions',
  reviews: 'Reviews',
  timeline: 'Timeline',
  contact: 'Contact',
};

const FEEDBACK_API_URL = import.meta.env.VITE_FEEDBACK_API_URL || '';

function App() {
  const [activeSection, setActiveSection] = useState('about');
  const [loaded, setLoaded] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [suggestions, setSuggestions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const sectionRefs = useRef({});

  useEffect(() => {
    const timer = window.setTimeout(() => setLoaded(true), 1100);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const value = scrollable > 0 ? window.scrollY / scrollable : 0;
      setScrollProgress(value);
    };

    const handlePointer = (event) => {
      setPointer({ x: event.clientX, y: event.clientY });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointermove', handlePointer, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointermove', handlePointer);
    };
  }, []);

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        const [suggestionsResponse, reviewsResponse] = await Promise.all([
          fetch(`${FEEDBACK_API_URL}/api/suggestions`),
          fetch(`${FEEDBACK_API_URL}/api/reviews`),
        ]);

        if (suggestionsResponse.ok) {
          const nextSuggestions = await suggestionsResponse.json();
          setSuggestions(nextSuggestions);
        }

        if (reviewsResponse.ok) {
          const nextReviews = await reviewsResponse.json();
          setReviews(nextReviews);
        }
      } catch {
        setSuggestions([]);
        setReviews([]);
      }
    };

    loadFeedback();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          setActiveSection(visible.target.id);
        }
      },
      { rootMargin: '-35% 0px -40% 0px', threshold: [0.18, 0.3, 0.45, 0.6] },
    );

    sectionOrder.forEach((section) => {
      if (sectionRefs.current[section]) {
        observer.observe(sectionRefs.current[section]);
      }
    });

    return () => observer.disconnect();
  }, []);

  const spotlight = {
    background: `radial-gradient(600px circle at ${pointer.x}px ${pointer.y}px, rgba(59,130,246,0.10), transparent 42%)`,
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const registerSection = (id) => (node) => {
    if (node) sectionRefs.current[id] = node;
  };

  const saveSuggestion = async (username, message) => {
    try {
      const response = await fetch(`${FEEDBACK_API_URL}/api/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, message }),
      });

      if (response.ok) {
        const entry = await response.json();
        setSuggestions((current) => [entry, ...current]);
        return true;
      }
    } catch {
      return false;
    }

    return false;
  };

  const saveReview = async ({ name, review, stars, help }) => {
    try {
      const response = await fetch(`${FEEDBACK_API_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, review, stars, help }),
      });

      if (response.ok) {
        const entry = await response.json();
        setReviews((current) => [entry, ...current]);
        return true;
      }
    } catch {
      return false;
    }

    return false;
  };

  const isLoading = !loaded;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg text-text selection:bg-accent/30 selection:text-white">
      <AnimatedBackground spotlight={spotlight} />
      <ScrollProgress progress={scrollProgress} />
      <CustomCursor pointer={pointer} />
      <LoadingScreen visible={isLoading} />

      <div className={`relative transition-opacity duration-700 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <Navbar activeSection={activeSection} onNavigate={scrollToSection} />

        <main className="mx-auto flex w-full max-w-7xl flex-col gap-28 px-5 pb-16 pt-28 sm:px-8 lg:px-10">
          <Hero onNavigate={scrollToSection} />
          <section id="about" ref={registerSection('about')} className="scroll-mt-28">
            <About />
          </section>
          <section id="skills" ref={registerSection('skills')} className="scroll-mt-28">
            <Skills />
          </section>
          <section id="achievements" ref={registerSection('achievements')} className="scroll-mt-28">
            <Achievements />
          </section>
          <section id="projects" ref={registerSection('projects')} className="scroll-mt-28">
            <Projects />
          </section>
          <section id="support" ref={registerSection('support')} className="scroll-mt-28">
            <SupportSection />
          </section>
          <section id="suggestions" ref={registerSection('suggestions')} className="scroll-mt-28">
            <SuggestionsSection suggestions={suggestions} onSubmit={saveSuggestion} />
          </section>
          <section id="reviews" ref={registerSection('reviews')} className="scroll-mt-28">
            <ReviewsSection reviews={reviews} onSubmit={saveReview} />
          </section>
          <section id="timeline" ref={registerSection('timeline')} className="scroll-mt-28">
            <TimelineSection />
          </section>
          <section id="terminal" className="scroll-mt-28">
            <TerminalSection />
          </section>
          <section id="contact" ref={registerSection('contact')} className="scroll-mt-28">
            <Contact />
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}

function AnimatedBackground({ spotlight }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, index) => ({
        id: index,
        left: `${(index * 19) % 100}%`,
        top: `${(index * 13 + 17) % 100}%`,
        delay: `${index * 0.4}s`,
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.09),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(34,197,94,0.08),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25 [mask-image:linear-gradient(to_bottom,transparent,black_16%,black_84%,transparent)]" />
      <div className="absolute -left-32 top-8 h-72 w-72 rounded-full bg-accent/[0.18] blur-[120px] animate-drift" />
      <div className="absolute right-0 top-28 h-80 w-80 rounded-full bg-emerald-500/12 blur-[140px] animate-float" />
      <div className="absolute bottom-0 left-1/2 h-72 w-96 -translate-x-1/2 rounded-full bg-sky-500/10 blur-[150px] animate-float" />
      <div className="absolute inset-0 transition-[background] duration-200" style={spotlight} />
      <div className="absolute inset-0 opacity-60">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="absolute h-1 w-1 rounded-full bg-white/[0.35] shadow-[0_0_16px_rgba(255,255,255,0.45)]"
            style={{ left: particle.left, top: particle.top, animation: `float 7s ease-in-out infinite`, animationDelay: particle.delay }}
          />
        ))}
      </div>
    </div>
  );
}

function ScrollProgress({ progress }) {
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-1 bg-white/5">
      <div className="h-full origin-left bg-gradient-to-r from-accent via-sky-400 to-accent2 transition-transform duration-200" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}

function CustomCursor({ pointer }) {
  const x = useMotionValue(pointer.x);
  const y = useMotionValue(pointer.y);
  const smoothX = useSpring(x, { stiffness: 250, damping: 28, mass: 0.2 });
  const smoothY = useSpring(y, { stiffness: 250, damping: 28, mass: 0.2 });
  const translateX = useTransform(smoothX, (value) => value - 14);
  const translateY = useTransform(smoothY, (value) => value - 14);

  useEffect(() => {
    x.set(pointer.x);
    y.set(pointer.y);
  }, [pointer.x, pointer.y, x, y]);

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[70] hidden h-7 w-7 rounded-full border border-white/20 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_0_30px_rgba(59,130,246,0.18)] backdrop-blur-sm lg:block"
      style={{ x: translateX, y: translateY }}
    />
  );
}

function LoadingScreen({ visible }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center bg-bg"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45 } }}
        >
          <div className="flex flex-col items-center gap-5">
            <motion.div
              className="grid h-20 w-20 place-items-center rounded-3xl border border-white/10 bg-white/5 text-3xl font-semibold shadow-glow backdrop-blur"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            >
              G
            </motion.div>
            <div className="h-1.5 w-44 overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent via-sky-400 to-accent2"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Navbar({ activeSection, onNavigate }) {
  return (
    <header className="fixed inset-x-0 top-0 z-[55] border-b border-white/[0.08] bg-bg/65 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <button
          onClick={() => onNavigate('about')}
          className="group flex items-center gap-3 text-left"
          aria-label="Go to hero section"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-lg font-semibold shadow-glow transition-transform duration-300 group-hover:-translate-y-0.5">
            G
          </span>
          <span className="hidden flex-col sm:flex">
            <span className="text-sm font-semibold text-white">Raden Gevonda</span>
            <span className="text-xs text-muted">Engineer portfolio</span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-1 md:flex">
          {sectionOrder.map((section) => (
            <NavChip
              key={section}
              active={activeSection === section}
              label={sectionTitles[section]}
              onClick={() => onNavigate(section)}
            />
          ))}
        </nav>

        <a
          href="https://github.com/Gevonda108"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent/[0.12] hover:shadow-glow"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}

function NavChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm transition-all duration-300 ${
        active ? 'bg-white text-bg shadow-[0_0_0_1px_rgba(255,255,255,0.14)]' : 'text-muted hover:bg-white/[0.06] hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

function Hero({ onNavigate }) {
  const [roleIndex, setRoleIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const portraitRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-8, 8]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRoleIndex((current) => (current + 1) % roles.length);
    }, 2800);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const target = roles[roleIndex];
    let index = 0;
    setTypedText('');

    const timer = window.setInterval(() => {
      index += 1;
      setTypedText(target.slice(0, index));
      if (index >= target.length) {
        window.clearInterval(timer);
      }
    }, 55);

    return () => window.clearInterval(timer);
  }, [roleIndex]);

  const updateTilt = (event) => {
    const rect = portraitRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
    x.set(offsetX);
    y.set(offsetY);
  };

  const resetTilt = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <section className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted backdrop-blur"
        >
          <span className="h-2 w-2 rounded-full bg-accent2 shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
          Grade 9 student building real things
        </motion.div>

        <div className="space-y-5">
          <p className="text-sm uppercase tracking-[0.4em] text-muted">Hello, I&apos;m</p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-7xl">
            Raden Gevonda Geizco Gurnita
          </h1>
          <div className="flex min-h-16 items-center gap-3 text-2xl font-medium text-white sm:text-3xl lg:text-4xl">
            <span className="text-muted">I build</span>
            <span className="font-mono text-accent">{typedText}</span>
            <span className="inline-block h-8 w-0.5 animate-pulse bg-accent" />
          </div>
          <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
            I am a Grade 9 developer passionate about building useful software, exploring cybersecurity, and creating polished digital experiences. I started learning Python in 2022 at age 11 and have continued expanding my skills in web development, Linux, databases, and automation.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            onClick={() => onNavigate('projects')}
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-bg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_22px_50px_rgba(59,130,246,0.18)]"
          >
            View Projects
          </button>
          <button
            onClick={() => onNavigate('contact')}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/[0.45] hover:bg-accent/[0.12]"
          >
            Contact Me
          </button>
        </div>
      </div>

      <motion.div
        ref={portraitRef}
        onMouseMove={updateTilt}
        onMouseLeave={resetTilt}
        className="relative mx-auto w-full max-w-lg"
        style={{ perspective: 1000 }}
      >
        <motion.div
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-glow backdrop-blur-xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.16),transparent_38%)]" />
          <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-card">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_30%,transparent_70%,rgba(255,255,255,0.05))]" />
            <div className="grid min-h-[32rem] place-items-center p-6 sm:min-h-[36rem]">
              <div className="relative flex aspect-square w-full max-w-[22rem] flex-col items-center justify-center">
                <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-full border border-white/10 shadow-[0_0_80px_rgba(59,130,246,0.22)]">
                  <img 
                    src="/profile.jpg" 
                    alt="Raden Gevonda profile" 
                    className="h-full w-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.18),transparent_40%),radial-gradient(circle_at_70%_70%,rgba(34,197,94,0.12),transparent_40%)]" />
                </div>
                <div className="text-center">
                  <p className="text-sm uppercase tracking-[0.35em] text-muted">Profile Portrait</p>
                  <p className="mt-2 font-mono text-xs text-white/[0.65]">Polished student engineer</p>
                </div>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg via-bg/70 to-transparent" />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function About() {
  return (
    <SectionCard>
      <SectionHeader eyebrow="About" title="A focused student engineer with real momentum." />
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <p className="text-lg leading-8 text-muted">
            <span className="text-white">Raden Gevonda Geizco Gurnita</span> is a Grade 9 developer interested in software development, cybersecurity, penetration testing, Linux, automation, web development, and AI tools.
          </p>
          <p className="text-lg leading-8 text-muted">
            Started learning Python in 2022 at age 11, then expanded into websites, data handling, and practical engineering habits. The result is a style that is technical, clean, and ambitious without feeling overbuilt.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {stats.map((stat) => (
            <AnimatedStat key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function AnimatedStat({ label, value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 shadow-glow backdrop-blur"
    >
      <div className="text-3xl font-semibold tracking-[-0.04em] text-white">{value}</div>
      <div className="mt-2 text-sm text-muted">{label}</div>
    </motion.div>
  );
}

function Skills() {
  return (
    <SectionCard>
      <SectionHeader eyebrow="Skills" title="Categorized tools and technologies." />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {skillGroups.map((group) => (
          <motion.div
            key={group.title}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.25 }}
            className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 shadow-glow"
          >
            <h3 className="text-lg font-semibold text-white">{group.title}</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              {group.items.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white/90 transition-colors duration-300 hover:border-accent/[0.45] hover:bg-accent/[0.12]"
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </SectionCard>
  );
}

function Achievements() {
  const [zoomedImage, setZoomedImage] = useState(null);

  const closeZoom = () => setZoomedImage(null);

  return (
    <SectionCard>
      <SectionHeader eyebrow="Achievements" title="Verified milestones and course results." />
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {achievements.map((group) => (
          <motion.div
            key={group.category}
            whileHover={{ y: -6 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.05] shadow-2xl shadow-slate-950/20"
          >
            <div className="bg-gradient-to-r from-sky-500/20 via-cyan-400/15 to-emerald-400/20 p-4 sm:p-5">
              <h3 className="text-lg font-semibold text-white sm:text-xl">{group.category}</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">{group.description}</p>
            </div>
            <div className="space-y-4 p-4 sm:space-y-5">
              {group.items.map((item) => (
                <article key={item.title} className="overflow-hidden rounded-[1.3rem] border border-white/10 bg-[#0f1720] shadow-glow">
                  <button
                    type="button"
                    onClick={() => setZoomedImage(item.image || '/achievements/placeholder.svg')}
                    className="group relative block w-full cursor-zoom-in overflow-hidden"
                    aria-label={`Zoom ${item.title} certificate`}
                  >
                    <span className="absolute right-2.5 top-2.5 z-10 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur">
                      Tap to zoom
                    </span>
                    <img
                      src={item.image || '/achievements/placeholder.svg'}
                      alt={`${item.title} certificate`}
                      className="aspect-[4/3] w-full object-contain bg-[#0b0f17] p-2.5 transition duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src = '/achievements/placeholder.svg';
                      }}
                    />
                  </button>
                  <div className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h4 className="text-base font-semibold leading-6 text-white sm:text-lg">{item.title}</h4>
                        <p className="mt-1 text-sm leading-6 text-muted">{item.subtitle}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center rounded-full bg-accent/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent shadow-[0_0_0_1px_rgba(34,197,94,0.2)]">
                        {item.result.includes('Took') ? 'Ranked' : 'Completed'}
                      </span>
                    </div>
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-muted">
                      <p>{item.result}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.24em] text-white/50">{item.period}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {zoomedImage ? (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 p-3 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeZoom}
          >
            <motion.div
              className="relative max-h-[90vh] w-full max-w-[96vw] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#020817] p-3 shadow-[0_0_120px_rgba(15,23,42,0.6)] sm:rounded-[2rem] sm:p-5 md:max-w-4xl lg:max-w-6xl"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeZoom}
                className="absolute right-3 top-3 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white transition hover:bg-slate-900"
              >
                Close
              </button>
              <img
                src={zoomedImage}
                alt="Zoomed achievement"
                className="h-[78vh] w-full object-contain"
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </SectionCard>
  );
}

function Projects() {
  return (
    <SectionCard>
      <SectionHeader eyebrow="Projects" title="Selected work that shows range and intent." />
      <div className="grid gap-6 xl:grid-cols-2">
        {projects.map((project, index) => (
          <ProjectCard key={project.title} project={project} index={index} />
        ))}
      </div>
    </SectionCard>
  );
}

function ProjectCard({ project, index }) {
  const [readmeOpen, setReadmeOpen] = useState(false);
  const [readmeContent, setReadmeContent] = useState('');
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [readmeError, setReadmeError] = useState('');

  useEffect(() => {
    if (!readmeOpen || !project.readmeApiUrl) return;

    let active = true;
    const controller = new AbortController();

    const loadReadme = async () => {
      setReadmeLoading(true);
      setReadmeError('');

      try {
        const response = await fetch(project.readmeApiUrl, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Unable to load README (${response.status})`);
        }

        const payload = await response.json();
        if (!payload.content) {
          throw new Error('README content is unavailable for this repository.');
        }

        const decoded = window.atob(payload.content.replace(/\s/g, ''));
        if (active) {
          setReadmeContent(decoded);
        }
      } catch (error) {
        if (active) {
          setReadmeError(error.message || 'README preview is unavailable right now.');
        }
      } finally {
        if (active) {
          setReadmeLoading(false);
        }
      }
    };

    loadReadme();

    return () => {
      active = false;
      controller.abort();
    };
  }, [project.readmeApiUrl, readmeOpen]);

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 0.55, delay: index * 0.08 }}
        whileHover={{ y: -6, scale: 1.01 }}
        className="group overflow-hidden rounded-[1.8rem] border border-white/10 bg-card shadow-glow"
      >
        <div className={`relative overflow-hidden border-b border-white/10 bg-gradient-to-br ${project.accent} p-4 sm:p-5`}>
          <ProjectArtwork project={project} />
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">{project.title}</h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted sm:text-base">{project.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {project.technologies.map((technology) => (
              <span
                key={technology}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/[0.85] transition-all duration-300 group-hover:border-accent/40 group-hover:bg-accent/10"
              >
                {technology}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <ProjectButton href={project.href} label="View Repo" />
            {project.readmeApiUrl ? (
              <button
                type="button"
                onClick={() => setReadmeOpen(true)}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
              >
                Preview README
              </button>
            ) : null}
            <ProjectButton href="#contact" label="Contact" accent />
          </div>
        </div>
      </motion.article>

      <AnimatePresence>
        {readmeOpen ? (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setReadmeOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#020817] p-4 shadow-[0_0_120px_rgba(15,23,42,0.64)] sm:p-5"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">README preview</p>
                  <h4 className="mt-2 text-xl font-semibold text-white">{project.title}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setReadmeOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 max-h-[70vh] overflow-auto rounded-[1.2rem] border border-white/10 bg-slate-950/80 p-6">
                {readmeLoading ? (
                  <p className="text-sm text-muted">Loading README preview…</p>
                ) : readmeError ? (
                  <p className="text-sm text-rose-300">{readmeError}</p>
                ) : (
                  <div className="prose prose-invert max-w-none text-slate-200">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        h1: ({ ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4 text-white border-b border-white/10 pb-3 first:mt-0" {...props} />,
                        h2: ({ ...props }) => <h2 className="text-2xl font-semibold mt-6 mb-3 text-white border-b border-white/10 pb-2" {...props} />,
                        h3: ({ ...props }) => <h3 className="text-xl font-semibold mt-5 mb-2 text-white" {...props} />,
                        h4: ({ ...props }) => <h4 className="text-lg font-semibold mt-4 mb-2 text-white/90" {...props} />,
                        p: ({ ...props }) => <p className="leading-7 mb-4 text-slate-300" {...props} />,
                        ul: ({ ...props }) => <ul className="list-disc list-inside mb-4 space-y-2 text-slate-300" {...props} />,
                        ol: ({ ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-slate-300" {...props} />,
                        li: ({ ...props }) => <li className="ml-2" {...props} />,
                        code: ({ inline, ...props }) => inline ? (
                          <code className="bg-white/10 rounded px-2 py-1 text-accent font-mono text-sm" {...props} />
                        ) : (
                          <code className="block bg-white/5 border border-white/10 rounded-lg p-3 mb-4 overflow-x-auto text-sm font-mono text-slate-200" {...props} />
                        ),
                        pre: ({ ...props }) => <div {...props} />,
                        blockquote: ({ ...props }) => <blockquote className="border-l-4 border-accent/50 pl-4 py-2 my-4 text-slate-300 italic bg-white/5 rounded-r-lg pr-4" {...props} />,
                        a: ({ ...props }) => <a className="text-accent hover:underline" target="_blank" rel="noreferrer" {...props} />,
                        table: ({ ...props }) => <table className="w-full border-collapse border border-white/10 mb-4" {...props} />,
                        thead: ({ ...props }) => <thead className="bg-white/5" {...props} />,
                        th: ({ ...props }) => <th className="border border-white/10 px-3 py-2 text-left text-white" {...props} />,
                        td: ({ ...props }) => <td className="border border-white/10 px-3 py-2" {...props} />,
                        hr: () => <hr className="border-t border-white/10 my-6" />,
                      }}
                    >
                      {readmeContent}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ProjectArtwork({ project }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-[1.4rem] border border-white/[0.12] bg-[#0d0d10]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.18),transparent_40%)]" />
      <motion.div
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_25%,transparent_75%,rgba(255,255,255,0.04))]"
        animate={{ x: ['-10%', '10%', '-10%'] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 p-4 sm:p-5">
        <div className="flex h-full flex-col rounded-[1.1rem] border border-white/[0.08] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/[0.55]">preview</span>
          </div>

          <div className="mt-4 grid flex-1 gap-3 sm:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-white/[0.08] bg-bg/80 p-3">
              <div className="h-3 w-24 rounded-full bg-white/10" />
              <div className="mt-4 space-y-2">
                <div className="h-2.5 w-full rounded-full bg-white/10" />
                <div className="h-2.5 w-5/6 rounded-full bg-white/[0.08]" />
                <div className="h-2.5 w-2/3 rounded-full bg-white/[0.08]" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-accent/15 p-3 text-left text-[10px] text-white/80">Tasks</div>
                <div className="rounded-xl bg-accent2/15 p-3 text-left text-[10px] text-white/80">Focus</div>
                <div className="col-span-2 rounded-xl bg-white/[0.06] p-3 text-left text-[10px] text-white/80">Status dashboard</div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(59,130,246,0.14),rgba(17,17,19,0.82))] p-4">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.18),transparent_18%),radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.14),transparent_18%)]" />
              <div className="relative flex h-full flex-col justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/[0.55]">{project.title}</p>
                  <div className="mt-3 grid gap-2">
                    <div className="h-3 w-20 rounded-full bg-white/[0.12]" />
                    <div className="h-3 w-32 rounded-full bg-white/10" />
                    <div className="h-3 w-16 rounded-full bg-white/[0.08]" />
                  </div>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div className="flex -space-x-2">
                    <span className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.12]" />
                    <span className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.08]" />
                    <span className="h-9 w-9 rounded-full border border-white/10 bg-white/5" />
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white/70">live view</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectButton({ href, label, accent = false }) {
  const isExternal = href && href.startsWith('http');
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noreferrer' : undefined}
      className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
        accent
          ? 'border border-accent/[0.35] bg-accent/[0.12] text-white hover:-translate-y-0.5 hover:bg-accent/[0.18] hover:shadow-glow'
          : 'border border-white/10 bg-white/5 text-white hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      {label}
    </a>
  );
}

function TimelineSection() {
  return (
    <SectionCard>
      <SectionHeader eyebrow="Timeline" title="A steady, realistic progression." />
      <div className="relative space-y-6 pl-5 sm:pl-8">
        <div className="absolute left-2 top-2 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-accent via-white/20 to-transparent sm:left-4" />
        {timeline.map((entry, index) => (
          <motion.div
            key={entry.year}
            initial={{ opacity: 0, x: -18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.5, delay: index * 0.07 }}
            className="relative rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-glow backdrop-blur"
          >
            <div className="absolute -left-[1.1rem] top-6 h-4 w-4 rounded-full border border-accent/40 bg-bg shadow-[0_0_0_6px_rgba(59,130,246,0.12)] sm:-left-[1.55rem]" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-mono text-sm text-accent">{entry.year}</div>
                <h3 className="mt-1 text-xl font-semibold text-white">{entry.title}</h3>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">{entry.description}</p>
          </motion.div>
        ))}
      </div>
    </SectionCard>
  );
}

function TerminalSection() {
  return (
    <SectionCard>
      <SectionHeader eyebrow="Interactive Terminal" title="A lightweight terminal that feels alive." />
      <Terminal />
    </SectionCard>
  );
}

function Terminal() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([
    { type: 'output', value: 'guest@gevonda:~$ help' },
    { type: 'output', value: terminalCommands.help },
  ]);
  const [typing, setTyping] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const command = 'vibe';
    const interval = window.setInterval(() => {
      setTyping(command.slice(0, index + 1));
      setIndex((current) => {
        if (current + 1 >= command.length) {
          window.clearInterval(interval);
          return current;
        }
        return current + 1;
      });
    }, 180);

    return () => window.clearInterval(interval);
  }, [index]);

  useEffect(() => {
    if (!typing || typing !== 'vibe') return;
    const timeout = window.setTimeout(() => {
      setHistory((current) => [
        ...current,
        { type: 'output', value: 'guest@gevonda:~$ vibe' },
        { type: 'output', value: terminalCommands.vibe },
      ]);
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [typing]);

  const runCommand = (value) => {
    const command = value.trim().toLowerCase();
    if (!command) return;

    if (command === 'clear') {
      setHistory([]);
      setInput('');
      return;
    }

    const response = terminalCommands[command] ?? 'Command not found. Try help.';
    setHistory((current) => [...current, { type: 'output', value: `guest@gevonda:~$ ${command}` }, { type: 'output', value: response }]);
    setInput('');
  };

  return (
    <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0b0b0e] shadow-glow">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full bg-red-400/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        </div>
        <div className="font-mono text-xs text-muted">guest@gevonda:~</div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="max-h-[22rem] overflow-y-auto rounded-[1.4rem] border border-white/[0.08] bg-black/20 p-4 font-mono text-sm leading-7 text-white/[0.85] sm:p-5">
          {history.map((line, idx) => (
            <motion.div key={`${line.type}-${idx}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="whitespace-pre-wrap">
              {line.value}
            </motion.div>
          ))}
          <div className="mt-2 flex items-center gap-2 text-white/90">
            <span className="text-accent2">guest@gevonda:~$</span>
            <span className="inline-flex items-center gap-1">
              <span>{typing || input}</span>
              <span className="terminal-cursor" />
            </span>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            runCommand(input);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type a command like vibe or help"
            className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 font-mono text-sm text-white outline-none transition-colors duration-300 placeholder:text-white/[0.35] focus:border-accent/[0.45] focus:bg-white/[0.07]"
          />
          <button
            type="submit"
            className="h-12 rounded-2xl border border-accent/[0.35] bg-accent/[0.12] px-5 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/[0.18]"
          >
            Run
          </button>
        </form>
      </div>
    </div>
  );
}

function SupportSection() {
  return (
    <SectionCard>
      <div className="overflow-hidden rounded-[1.8rem] border border-accent/20 bg-[linear-gradient(135deg,rgba(59,130,246,0.16),rgba(34,197,94,0.12))] p-5 sm:p-7 lg:p-8">
        <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr] lg:items-end">
          <div className="max-w-2xl space-y-3.5">
            <div className="inline-flex items-center rounded-full border border-accent/30 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-accent">
              Support Me
            </div>
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl lg:text-4xl">
              Your support helps me keep creating, learning, and shipping more projects.
            </h3>
            <p className="text-sm leading-7 text-slate-200/90 sm:text-base sm:leading-8">
              If my work has helped you, inspired you, or made something easier, a small contribution means a lot. It helps fund more ideas, better projects, and longer hours of building.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/40 px-4 py-3.5 text-sm text-slate-300 shadow-glow">
              <p className="font-semibold text-white">Every support, even small, is appreciated.</p>
              <p className="mt-1">Thank you for believing in the journey.</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/35 px-4 py-3.5 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.24em] text-accent/85">Fast support links</p>
              <p className="mt-1">All buttons open safely in a new tab on any device.</p>
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {supportLinks.map((link) => (
            <motion.a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              whileHover={{ y: -6, scale: 1.01 }}
              className="group flex h-full flex-col rounded-[1.25rem] border border-white/10 bg-slate-950/35 p-5 shadow-[0_12px_40px_rgba(2,6,23,0.28)] transition-all duration-300 hover:border-accent/45 hover:bg-accent/[0.12] sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.3em] text-muted">{link.label}</div>
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-white/90">
                  {link.label.slice(0, 2)}
                </div>
              </div>
              <div className="mt-3 text-base font-semibold leading-7 text-white sm:text-xl">{link.value}</div>
              <div className="mt-3 text-sm leading-7 text-slate-300">{link.note}</div>
              <div className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-accent/40 sm:w-auto sm:justify-start">
                Support now
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function SuggestionsSection({ suggestions, onSubmit }) {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !message.trim()) return;

    setStatus('saving');
    const success = await onSubmit(username.trim(), message.trim());

    if (!success) {
      setStatus('error');
      return;
    }

    setUsername('');
    setMessage('');
    setStatus('success');
  };

  return (
    <SectionCard>
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(34,197,94,0.10))] p-6 sm:p-8">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center rounded-full border border-accent/30 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-accent">
            Suggestions
          </div>
          <h3 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
            Share ideas, feedback, or feature requests with me.
          </h3>
          <p className="text-base leading-8 text-slate-200/90">
            Your ideas help shape what I build next, and now they’re visible to other visitors too.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 rounded-[1.6rem] border border-white/10 bg-slate-950/35 p-5 shadow-glow sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="suggestion-username">
                Username
              </label>
              <input
                id="suggestion-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Your name or nickname"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors duration-300 placeholder:text-white/35 focus:border-accent/45 focus:bg-white/10"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="suggestion-text">
                Suggestion
              </label>
              <textarea
                id="suggestion-text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your suggestion here..."
                rows="4"
                className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors duration-300 placeholder:text-white/35 focus:border-accent/45 focus:bg-white/10"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-300">
              {status === 'success' ? 'Thanks for your suggestion! It is now visible to other visitors.' : null}
              {status === 'error' ? 'Could not save your suggestion right now. Please try again.' : null}
              {status === 'saving' ? 'Saving your suggestion...' : null}
              {status === 'idle' ? 'Your ideas help shape what I build next.' : null}
            </p>
            <button
              type="submit"
              disabled={status === 'saving'}
              className="inline-flex items-center justify-center rounded-full border border-accent/35 bg-accent/15 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/25"
            >
              {status === 'saving' ? 'Submitting...' : 'Submit suggestion'}
            </button>
          </div>
        </form>

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-xl font-semibold text-white">Newest suggestions</h4>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
              {suggestions.length} shared
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {suggestions.length > 0 ? (
              suggestions.map((item) => (
                <div key={item.id} className="rounded-[1.45rem] border border-white/10 bg-slate-950/40 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{item.username}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.28em] text-accent/80">Idea shared</p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/45">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.message}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300 lg:col-span-2">
                No suggestions yet. Be the first to share one.
              </div>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function ReviewsSection({ reviews, onSubmit }) {
  const [name, setName] = useState('');
  const [review, setReview] = useState('');
  const [stars, setStars] = useState(5);
  const [help, setHelp] = useState('');
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || !review.trim() || !help.trim()) return;

    setStatus('saving');
    const success = await onSubmit({ name: name.trim(), review: review.trim(), stars, help: help.trim() });

    if (!success) {
      setStatus('error');
      return;
    }

    setName('');
    setReview('');
    setStars(5);
    setHelp('');
    setStatus('success');
  };

  return (
    <SectionCard>
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(34,197,94,0.12),rgba(59,130,246,0.12))] p-6 sm:p-8">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center rounded-full border border-accent/30 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-accent">
            Reviews
          </div>
          <h3 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
            Leave a review after I helped you.
          </h3>
          <p className="text-base leading-8 text-slate-200/90">
            Share your experience, rate the support you received, and mention what I helped you with.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 rounded-[1.6rem] border border-white/10 bg-slate-950/35 p-5 shadow-glow sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="review-name">
                Your name
              </label>
              <input
                id="review-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Who are you?"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors duration-300 placeholder:text-white/35 focus:border-accent/45 focus:bg-white/10"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="review-stars">
                Rating
              </label>
              <div id="review-stars" className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStars(value)}
                    className={`text-2xl transition ${value <= stars ? 'text-amber-400' : 'text-slate-500'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="review-help">
                What did I help you with?
              </label>
              <input
                id="review-help"
                value={help}
                onChange={(event) => setHelp(event.target.value)}
                placeholder="Example: helped me fix a bot or explain Python"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors duration-300 placeholder:text-white/35 focus:border-accent/45 focus:bg-white/10"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="review-text">
                Review
              </label>
              <textarea
                id="review-text"
                value={review}
                onChange={(event) => setReview(event.target.value)}
                placeholder="Tell others how I helped you..."
                rows="4"
                className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors duration-300 placeholder:text-white/35 focus:border-accent/45 focus:bg-white/10"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-300">
              {status === 'success' ? 'Thanks for the review! It has been added to the community feedback.' : null}
              {status === 'error' ? 'Could not save your review right now. Please try again.' : null}
              {status === 'saving' ? 'Saving your review...' : null}
              {status === 'idle' ? 'Your review helps others trust the support I offer.' : null}
            </p>
            <button
              type="submit"
              disabled={status === 'saving'}
              className="inline-flex items-center justify-center rounded-full border border-accent/35 bg-accent/15 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/25"
            >
              {status === 'saving' ? 'Submitting...' : 'Submit review'}
            </button>
          </div>
        </form>

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-xl font-semibold text-white">Newest reviews</h4>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
              {reviews.length} reviews
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {reviews.length > 0 ? (
              reviews.map((item) => (
                <div key={item.id} className="rounded-[1.45rem] border border-white/10 bg-slate-950/40 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.28em] text-accent/80">Community review</p>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <span key={`${item.id}-${index}`}>{index < item.stars ? '★' : '☆'}</span>
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">Helped with: {item.help}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.review}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300 lg:col-span-2">
                No reviews yet. Be the first to leave one.
              </div>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function Contact() {
  return (
    <SectionCard>
      <SectionHeader eyebrow="Contact" title="Simple, modern contact paths." />
      <div className="grid gap-5 md:grid-cols-3">
        {contacts.map((contact) => (
          <motion.a
            key={contact.label}
            href={contact.href}
            target={contact.href.startsWith('http') ? '_blank' : undefined}
            rel={contact.href.startsWith('http') ? 'noreferrer' : undefined}
            whileHover={{ y: -6, scale: 1.01 }}
            className="group rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 shadow-glow transition-colors duration-300 hover:border-accent/40 hover:bg-accent/[0.08]"
          >
            <div className="text-sm uppercase tracking-[0.35em] text-muted">{contact.label}</div>
            <div className="mt-4 text-xl font-semibold text-white">{contact.value}</div>
            <div className="mt-2 text-sm leading-7 text-muted">{contact.note}</div>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white">
              Connect
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </div>
          </motion.a>
        ))}
      </div>
    </SectionCard>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-white/[0.03] py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="space-y-2">
            <p className="text-lg font-medium text-white">Built and designed by Raden Gevonda Geizco Gurnita.</p>
            <p className="text-sm text-muted">Powered by curiosity, code, and continuous learning.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['React', 'Tailwind CSS', 'Framer Motion'].map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/[0.85]">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function SectionCard({ children }) {
  return <div className="rounded-[2rem] border border-white/10 bg-card/85 p-5 shadow-glow backdrop-blur sm:p-7 lg:p-8">{children}</div>;
}

function SectionHeader({ eyebrow, title }) {
  return (
    <div className="mb-7 space-y-3">
      <div className="text-sm uppercase tracking-[0.35em] text-muted">{eyebrow}</div>
      <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{title}</h2>
    </div>
  );
}

export default App;