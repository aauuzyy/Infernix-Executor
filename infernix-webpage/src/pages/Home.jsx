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
import { StaggerContainer, StaggerItem, BlurIn } from '../components/Animations';

const changelog = [
  {
    version: '1.3.1',
    date: 'April 8, 2026',
    changes: [
      'Xeno DLL updated for latest Roblox version',
      'Removed Military AI tab for a cleaner interface',
      'Version reporting fixed for accurate update webhooks',
      'UI refinements and stability improvements',
    ]
  },
  {
    version: '1.3.0',
    date: 'February 25, 2026',
    changes: [
      'Discord & Website quick links added to Dashboard',
      'Theme-aware colors — entire UI follows your accent color',
      'AI Assistant reliability fix',
      'Notification system polish — always visible above all UI',
      'UI consistency and glow effect improvements',
    ]
  },
  {
    version: '1.2.9',
    date: 'February 23, 2026',
    changes: [
      'Hook Function templates in toolbar (hookfunction, hookmetamethod)',
      'AutoExec quick-access button in executor toolbar',
      'Fixed Auto Attach — smarter retry, no longer breaks game UI',
      'Fixed Auto Execute — added retry on failure, 5s stability delay',
      'Fixed Dashboard execution counter — updates live after each run',
    ]
  },
  {
    version: '1.2.8',
    date: 'February 22, 2026',
    changes: [
      'Custom Background — set any image as your app background',
      'Live blur slider for background intensity',
      'Monaco editor transparency with custom backgrounds',
    ]
  },
  {
    version: '1.2.5',
    date: 'February 2026',
    changes: [
      'VirusTotal Integration — scan scripts for threats',
      'Auto-Scan on drag & drop',
      'Tab Safety Badges — scan status per tab',
      'AI Security Summary — AI analysis of scan results',
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

export default function Home() {
  return (
    <div className="relative bg-black min-h-screen">

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative pt-32 pb-16 z-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ scale: 0, filter: 'blur(20px)' }}
            animate={{ scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, type: 'spring', stiffness: 80 }}
            className="w-20 h-20 mx-auto mb-7 rounded-full bg-black border border-white/15 flex items-center justify-center"
          >
            <Flame className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-black mb-4 tracking-tight"
          >
            <span className="shimmer-text">Infernix</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="text-base md:text-lg text-gray-500 max-w-md mx-auto mb-6 leading-relaxed"
          >
            The next-generation Roblox executor.{' '}
            <span className="text-white">Powerful</span>,{' '}
            <span className="text-white">secure</span>, and{' '}
            <span className="text-white">fast</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.44 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6"
          >
            <Link
              to="/download"
              className="flex items-center gap-2 px-7 py-3 rounded-xl btn-primary text-black font-bold text-sm"
            >
              <Download className="w-4 h-4" />
              Download Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://discord.gg/d3CdsJnHHb"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-7 py-3 rounded-xl btn-secondary text-white font-bold text-sm"
            >
              Join Discord
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.56 }}
            className="flex items-center justify-center gap-4 text-xs text-gray-600"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              v1.3.1
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              Windows 10/11
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              Free Forever
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              Auto Updates
            </span>
          </motion.div>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-2">
        <div className="section-divider" />
      </div>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="py-14 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <BlurIn className="text-center mb-8">
            <h2 className="text-2xl font-black text-white tracking-tight">
              Why <span className="gradient-text">Infernix</span>?
            </h2>
          </BlurIn>

          <StaggerContainer className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {features.map((feature) => (
              <StaggerItem key={feature.title}>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 card-hover h-full">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center mb-3">
                    <feature.icon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-white font-semibold mb-0.5 text-xs">{feature.title}</h3>
                  <p className="text-gray-600 text-[11px] leading-relaxed">{feature.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-2">
        <div className="section-divider" />
      </div>

      {/* ── Changelog + CTA ────────────────────────────────── */}
      <section className="py-14 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">

            {/* Changelog */}
            <div>
              <BlurIn className="mb-6">
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Latest <span className="gradient-text">Updates</span>
                </h2>
              </BlurIn>

              <div className="space-y-3">
                {changelog.slice(0, 3).map((release, index) => (
                  <motion.div
                    key={release.version}
                    initial={{ opacity: 0, x: -20, filter: 'blur(6px)' }}
                    whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ delay: index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/5 card-hover"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-white text-black text-[11px] font-black tracking-wide">
                        v{release.version}
                      </span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-gray-400 text-[11px] font-semibold">
                          Latest
                        </span>
                      )}
                      <span className="text-gray-600 text-xs ml-auto">{release.date}</span>
                    </div>
                    <ul className="space-y-1">
                      {release.changes.map((change, i) => (
                        <li key={i} className="text-gray-500 text-xs flex items-start gap-1.5">
                          <span className="text-gray-600 mt-px flex-shrink-0">›</span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="mt-3"
              >
                <Link
                  to="/download"
                  className="text-xs text-gray-600 hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  View full changelog <ArrowRight className="w-3 h-3" />
                </Link>
              </motion.div>
            </div>

            {/* CTA Panel */}
            <BlurIn>
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-center sticky top-24">
                <div className="w-12 h-12 rounded-xl bg-black border border-white/15 flex items-center justify-center mx-auto mb-4">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-black text-white mb-2 tracking-tight">
                  Ready to start?
                </h3>
                <p className="text-gray-500 text-xs mb-5 leading-relaxed">
                  Download Infernix free and experience the difference.
                </p>
                <Link
                  to="/download"
                  className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl btn-primary text-black font-bold text-sm mb-3"
                >
                  <Download className="w-4 h-4" />
                  Download Now
                </Link>
                <a
                  href="https://discord.gg/d3CdsJnHHb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl bg-[#5865F2] text-white font-semibold text-xs hover:bg-[#4752C4] transition-colors"
                >
                  Join Discord
                </a>
              </div>
            </BlurIn>
          </div>
        </div>
      </section>
    </div>
  );
}
