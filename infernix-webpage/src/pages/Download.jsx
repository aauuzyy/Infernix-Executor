import { motion } from 'framer-motion';
import {
  Download as DownloadIcon,
  ArrowRight,
  Flame,
  Users,
  Zap,
  Code2,
  RefreshCw,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Multi-Client',
    description: 'Attach to multiple Roblox instances.',
  },
  {
    icon: Code2,
    title: 'Monaco Editor',
    description: 'Pro-grade editor with syntax highlighting.',
  },
  {
    icon: Zap,
    title: 'AI Assistant',
    description: 'Generate and edit scripts with AI.',
  },
];

const changelog = [
  {
    version: '1.3.3',
    date: 'April 18, 2026',
    type: 'release',
    changes: [
      'Pulses rings on loading screen',
      'Sidebar slides out when on Assistant tab',
      'AI auto-navigates when navigation intent detected',
      'Smooth tab scroll animation',
      'Grid background more visible',
      'Copy/Send to Editor hover fix',
    ],
  },
  {
    version: '1.3.0',
    date: 'February 25, 2026',
    type: 'release',
    changes: [
      'Discord & Website quick links on Dashboard',
      'Theme-aware colors — all UI glows follow your accent color',
      'AI Assistant reliability fix',
      'Notification system — always visible above all overlays',
      'UI polish and glow improvements',
      'Bug fixes and stability improvements',
    ],
  },
  {
    version: '1.2.9',
    date: 'February 23, 2026',
    type: 'release',
    changes: [
      'Hook Function templates in toolbar',
      'AutoExec quick-access button in executor',
      'Fixed Auto Attach — smarter retry logic',
      'Fixed Auto Execute — retry on failure + 5s stability delay',
      'Fixed Dashboard execution counter (live updates)',
      'Fixed GIF backgrounds — animated GIFs blur correctly',
    ],
  },
  {
    version: '1.2.8',
    date: 'February 22, 2026',
    type: 'release',
    changes: [
      'Custom Background — any image as app background',
      'Live blur intensity slider',
      'Monaco editor transparency with custom backgrounds',
      'Background persists across restarts',
    ],
  },
  {
    version: '1.2.5',
    date: 'February 2026',
    type: 'release',
    changes: [
      'VirusTotal Integration — scan scripts for threats',
      'Auto-Scan on drag & drop',
      'Tab Safety Badges — scan status on each tab',
      'AI Security Summary — AI analysis of scan results',
    ],
  },
  {
    version: '1.2.4',
    date: 'February 2026',
    type: 'release',
    changes: [
      'Dynamic Syntax Colors — editor colors adapt to accent',
      'Execution History Panel — view and re-run past scripts',
      'Accent-based bracket and parentheses coloring',
    ],
  },
  {
    version: '1.2.3',
    date: 'February 2026',
    type: 'release',
    changes: [
      'Custom Themes — 8 accent color presets + color picker',
      'Auto-Update System — detects new releases from GitHub',
      'ScriptHub virtualization — smooth with 1000s of scripts',
    ],
  },
];

export default function Download() {
  const handleDownload = () => {
    window.open('https://link-target.net/2362148/5lENK2TunG9L', '_blank');
  };

  return (
    <div className="relative min-h-screen pt-20 pb-16">

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
          >
            <span className="text-sm text-gray-300">Latest Release</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold mb-3 text-white"
          >
            Download <span className="gradient-text">Infernix</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500"
          >
            Get started in seconds.
          </motion.p>
        </div>

        {/* Main Download Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid lg:grid-cols-3 gap-5 mb-8"
        >
          {/* Download Section */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-black border border-white/15 flex items-center justify-center">
                <Flame className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Infernix v1.3.3</h2>
                <p className="text-gray-500 text-sm">April 18, 2026 — Latest Release</p>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {features.map((feature) => (
                <div key={feature.title} className="p-3 rounded-lg bg-white/5">
                  <feature.icon className="w-5 h-5 text-gray-400 mb-2" />
                  <h3 className="font-medium text-white text-sm">{feature.title}</h3>
                  <p className="text-xs text-gray-500">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Download Button */}
            <motion.button
              onClick={handleDownload}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg btn-primary text-white font-semibold"
            >
              <DownloadIcon className="w-5 h-5" />
              Download Now
              <ArrowRight className="w-5 h-5" />
            </motion.button>

            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-gray-400" />
                Windows 10/11
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-gray-400" />
                Free Forever
              </span>
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-gray-400" />
                Auto Updates
              </span>
            </div>
          </div>

          {/* Latest Updates */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              What's New in v1.3.3
            </h3>
            <div className="space-y-2">
              {changelog[0].changes.slice(0, 5).map((change, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="p-3 rounded-lg bg-white/5 text-sm text-gray-400"
                >
                  {change}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Changelog */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h3 className="text-xl font-bold text-white mb-6">Changelog</h3>
          <div className="space-y-4">
            {changelog.map((release) => (
              <div key={release.version} className="p-6 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-lg font-bold text-white">v{release.version}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    release.type === 'release'
                      ? 'bg-white/10 text-gray-300'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {release.type === 'release' ? 'Release' : 'Beta'}
                  </span>
                  <span className="text-sm text-gray-500">{release.date}</span>
                </div>
                <ul className="space-y-1">
                  {release.changes.map((change, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-400 text-sm">
                      <CheckCircle2 className="w-3 h-3 text-gray-500 flex-shrink-0" />
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Help */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Need help?{' '}
            <a
              href="https://discord.gg/d3CdsJnHHb"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-gray-300 inline-flex items-center gap-1"
            >
              Join our Discord
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
