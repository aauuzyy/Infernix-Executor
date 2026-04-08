import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Zap,
  Shield,
  Code2,
  Users,
  Cpu,
  Download,
  Flame,
  Sparkles,
  History,
  Activity,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { StaggerContainer, StaggerItem, BlurIn } from '../components/Animations';

const changelog = [
  {
    version: '1.3.1',
    date: 'April 8, 2026',
    changes: [
      '🔥 Xeno DLL updated for latest Roblox version',
      '⚡ Removed Military AI tab for a cleaner interface',
      '🛠️ Version reporting fixed for accurate update webhooks',
      '✨ UI refinements and stability improvements',
    ]
  },
  {
    version: '1.3.0',
    date: 'February 25, 2026',
    changes: [
      '🔗 Discord & Website quick links added to Dashboard',
      '🎨 Theme-aware colors — entire UI follows your accent color',
      '🤖 AI Assistant reliability fix',
      '🔔 Notification system polish — always visible above all UI',
      '✨ UI consistency and glow effect improvements',
    ]
  },
  {
    version: '1.2.9',
    date: 'February 23, 2026',
    changes: [
      '🔩 Hook Function templates in toolbar (hookfunction, hookmetamethod)',
      '⚡ AutoExec quick-access button in executor toolbar',
      '🔧 Fixed Auto Attach — smarter retry, no longer breaks game UI',
      '📜 Fixed Auto Execute — added retry on failure, 5s stability delay',
      '📊 Fixed Dashboard execution counter — updates live after each run',
    ]
  },
  {
    version: '1.2.8',
    date: 'February 22, 2026',
    changes: [
      '🖼️ Custom Background — set any image as your app background',
      '🔲 Live blur slider for background intensity',
      '🪟 Monaco editor transparency with custom backgrounds',
    ]
  },
  {
    version: '1.2.5',
    date: 'February 2026',
    changes: [
      '🦠 VirusTotal Integration — scan scripts for threats',
      '🔍 Auto-Scan on drag & drop',
      '🛡️ Tab Safety Badges — scan status per tab',
      '🤖 AI Security Summary — AI analysis of scan results',
    ]
  },
];

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Blazing fast script execution.',
  },
  {
    icon: Shield,
    title: 'VirusTotal Scan',
    description: 'Scan scripts before executing.',
  },
  {
    icon: Code2,
    title: 'Monaco Editor',
    description: 'Pro-grade code editor with syntax highlighting.',
  },
  {
    icon: Users,
    title: 'Multi-Client',
    description: 'Attach to multiple Roblox instances at once.',
  },
  {
    icon: Cpu,
    title: 'Auto Attach',
    description: 'Automatically attaches to new clients.',
  },
  {
    icon: Sparkles,
    title: 'AI Assistant',
    description: 'Generate and edit scripts with AI.',
  },
  {
    icon: History,
    title: 'Execution History',
    description: 'View and re-run past scripts instantly.',
  },
  {
    icon: Activity,
    title: 'Custom Themes',
    description: '8 accent colors + custom color picker.',
  },
  {
    icon: Flame,
    title: 'Script Hub',
    description: 'Access thousands of community scripts.',
  },
];

// Ember particle component
function Embers() {
  const [embers, setEmbers] = useState([]);
  
  useEffect(() => {
    const emberCount = 28;
    const newEmbers = [];
    for (let i = 0; i < emberCount; i++) {
      newEmbers.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 4 + Math.random() * 4,
        size: 2 + Math.random() * 3,
      });
    }
    setEmbers(newEmbers);
  }, []);
  
  return (
    <>
      {embers.map((ember) => (
        <div
          key={ember.id}
          className="ember"
          style={{
            left: `${ember.left}%`,
            width: `${ember.size}px`,
            height: `${ember.size}px`,
            animationDelay: `${ember.delay}s`,
            animationDuration: `${ember.duration}s`,
          }}
        />
      ))}
    </>
  );
}

export default function Home() {
  return (
    <div className="relative bg-black min-h-screen">
      {/* Fire background */}
      <div className="fire-bg" />
      <Embers />

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180, filter: 'blur(20px)' }}
            animate={{ scale: 1, rotate: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, type: 'spring', stiffness: 70 }}
            className="w-28 h-28 mx-auto mb-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center glow-fire"
          >
            <Flame className="w-16 h-16 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="text-6xl md:text-8xl font-black mb-6 tracking-tight"
          >
            <span className="shimmer-text">Infernix</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg md:text-xl text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed"
          >
            The next-generation Roblox executor.{' '}
            <span className="text-orange-400">Powerful</span>,{' '}
            <span className="text-orange-400">secure</span>, and{' '}
            <span className="text-orange-400">incredibly fast</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.52 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/25 mb-10"
          >
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-sm text-orange-300 font-semibold tracking-wide">v1.3.1 — Now Available</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/download"
              className="flex items-center gap-2 px-8 py-4 rounded-xl btn-primary text-white font-bold text-base"
            >
              <Download className="w-5 h-5" />
              Download Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="https://discord.gg/d3CdsJnHHb"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-4 rounded-xl btn-secondary text-white font-bold text-base"
            >
              Join Discord
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-2">
        <div className="section-divider" />
      </div>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="relative py-28 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <BlurIn className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
              Why <span className="gradient-text">Infernix</span>?
            </h2>
            <p className="text-gray-500 text-lg">
              Built with everything you need, nothing you don't.
            </p>
          </BlurIn>

          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feature) => (
              <StaggerItem key={feature.title}>
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-orange-500/10 card-hover h-full">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-1 text-sm">{feature.title}</h3>
                  <p className="text-gray-600 text-xs leading-relaxed">{feature.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-2">
        <div className="section-divider" />
      </div>

      {/* ── Changelog ──────────────────────────────────────── */}
      <section className="relative py-28 z-10">
        <div className="max-w-3xl mx-auto px-6">
          <BlurIn className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
              <History className="inline-block w-9 h-9 mr-3 text-orange-500 mb-1" />
              Latest <span className="gradient-text">Updates</span>
            </h2>
            <p className="text-gray-500">See what's new in Infernix</p>
          </BlurIn>

          <div className="space-y-4">
            {changelog.map((release, index) => (
              <motion.div
                key={release.version}
                initial={{ opacity: 0, x: -30, filter: 'blur(8px)' }}
                whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: index * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-orange-500/15 card-hover"
              >
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-black tracking-wide">
                    v{release.version}
                  </span>
                  {index === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-semibold">
                      Latest
                    </span>
                  )}
                  <span className="text-gray-600 text-sm ml-auto">{release.date}</span>
                </div>
                <ul className="space-y-2">
                  {release.changes.map((change, i) => (
                    <li key={i} className="text-gray-400 text-sm flex items-start gap-2">
                      <span className="text-orange-600 mt-0.5 flex-shrink-0">›</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-2">
        <div className="section-divider" />
      </div>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="relative py-28 z-10">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <BlurIn>
            <div className="p-14 rounded-3xl bg-gradient-to-br from-orange-500/8 to-red-600/8 border border-orange-500/20">
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-8 glow-fire"
              >
                <Flame className="w-9 h-9 text-white" />
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                Ready to <span className="gradient-text">Get Started</span>?
              </h2>
              <p className="text-gray-500 text-lg mb-10 max-w-lg mx-auto">
                Download Infernix now and experience the difference.
              </p>
              <Link
                to="/download"
                className="inline-flex items-center gap-3 px-10 py-4 rounded-xl btn-primary text-white font-bold text-base"
              >
                <Download className="w-5 h-5" />
                Download Now — Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </BlurIn>
        </div>
      </section>
    </div>
  );
}
