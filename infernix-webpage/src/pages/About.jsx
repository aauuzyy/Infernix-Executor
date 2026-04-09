import { motion } from 'framer-motion';
import { Flame, Target, Heart, Shield, Zap, Users, Code2, Globe } from 'lucide-react';
import { BlurIn, StaggerContainer, StaggerItem } from '../components/Animations';

const values = [
  {
    icon: Target,
    title: 'Our Mission',
    description: 'Provide the most reliable executor for the community.',
  },
  {
    icon: Heart,
    title: 'Community First',
    description: 'Built and shaped by community feedback.',
  },
  {
    icon: Shield,
    title: 'Security Focused',
    description: 'Regular updates and secure practices.',
  },
];

const features = [
  {
    icon: Zap,
    title: 'Lightning Performance',
    description: 'Built from the ground up for speed.',
  },
  {
    icon: Code2,
    title: 'Modern Technology',
    description: 'Electron, React, and custom backend.',
  },
  {
    icon: Users,
    title: 'Multi-Client',
    description: 'Execute across multiple instances.',
  },
  {
    icon: Globe,
    title: 'Script Hub',
    description: 'Access thousands of scripts.',
  },
];

export default function About() {
  return (
    <div className="relative min-h-screen pt-20 pb-16">

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0, filter: 'blur(20px)' }}
            animate={{ scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, type: 'spring', stiffness: 80 }}
            className="w-16 h-16 rounded-full bg-black border border-white/15 flex items-center justify-center mx-auto mb-5"
          >
            <Flame className="w-8 h-8 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl md:text-4xl font-black mb-3 tracking-tight text-white"
          >
            About <span className="gradient-text">Infernix</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-gray-500 text-lg"
          >
            Our mission and the team behind the executor.
          </motion.p>
        </div>

        {/* Values */}
        <StaggerContainer className="grid md:grid-cols-3 gap-3 mb-10">
          {values.map((value) => (
            <StaggerItem key={value.title}>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 card-hover text-center h-full">
                <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center mx-auto mb-3">
                  <value.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-bold mb-2">{value.title}</h3>
                <p className="text-gray-500 text-sm">{value.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Divider */}
        <div className="section-divider mb-10" />
        <BlurIn>
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 mb-10">
            <h2 className="text-2xl font-black text-white mb-6 text-center tracking-tight">Our Story</h2>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>
                Infernix was born from a simple idea:{' '}
                <span className="text-white font-semibold">what if there was an executor that just worked?</span>
              </p>
              <p>
                We started as developers passionate about creating tools for the community. After months of
                development and feedback from testers, Infernix is ready.
              </p>
              <p>
                Our executor combines{' '}
                <span className="text-white font-semibold">cutting-edge technology</span> with a{' '}
                <span className="text-white font-semibold">user-first design</span>.
              </p>
            </div>
          </div>
        </BlurIn>

        {/* Features */}
        <h2 className="text-xl font-black text-white mb-5 text-center tracking-tight">
          What Makes Us <span className="gradient-text">Different</span>
        </h2>
        <div className="grid md:grid-cols-2 gap-3 mb-10">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 card-hover flex gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-white/[0.08] flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold mb-1">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="section-divider mb-10" />

        {/* Discord CTA */}
        <BlurIn>
          <div className="p-7 rounded-3xl bg-white/[0.03] border border-white/5 text-center">
            <Flame className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Join Our Community</h2>
            <p className="text-gray-400 mb-8">Connect with users, get support, and share scripts.</p>
            <a
              href="https://discord.gg/NjRH3q7A"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#5865F2] text-white font-bold hover:bg-[#4752C4] transition-all hover:shadow-lg hover:shadow-indigo-500/20"
            >
              Join Discord
            </a>
          </div>
        </BlurIn>
      </div>
    </div>
  );
}
