import { motion } from 'framer-motion';
import { Heart, Github, Globe, Code2, Palette, Cpu, Users } from 'lucide-react';

const team = [
  {
    name: 'Lead Developer',
    role: 'Core Development',
    description: 'Built the core execution engine and backend systems.',
    icon: Cpu,
  },
  {
    name: 'UI/UX Designer',
    role: 'Design & Frontend',
    description: 'Created the modern interface and user experience.',
    icon: Palette,
  },
  {
    name: 'Backend Developer',
    role: 'Infrastructure',
    description: 'Manages servers, updates, and distribution systems.',
    icon: Code2,
  },
  {
    name: 'Community Manager',
    role: 'Support & Community',
    description: 'Handles community support and feedback collection.',
    icon: Users,
  },
];

const specialThanks = [
  {
    name: 'Crystxll',
    reason: 'The one who convinced us to make Infernix! Without his inspiration, this project wouldn\'t exist.',
    highlight: true,
  },
  {
    name: 'Xeno',
    reason: 'For the amazing API and execution backend that powers Infernix.',
    link: 'https://xeno.onl',
  },
  {
    name: 'Beta Testers',
    reason: 'Our amazing community members who tested early versions and provided invaluable feedback.',
  },
  {
    name: 'Open Source Community',
    reason: 'For the incredible tools and libraries that made this project possible.',
  },
  {
    name: 'Discord Community',
    reason: 'For the continuous support, bug reports, and feature suggestions.',
  },
];

const technologies = [
  { name: 'Electron', description: 'Desktop framework' },
  { name: 'React', description: 'UI library' },
  { name: 'Vite', description: 'Build tool' },
  { name: 'Monaco Editor', description: 'Code editor' },
  { name: 'Framer Motion', description: 'Animations' },
  { name: 'Tailwind CSS', description: 'Styling' },
];

export default function Credits() {
  return (
    <div className="relative bg-black min-h-screen pt-20 pb-16">

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-14 h-14 rounded-full bg-black border border-white/15 flex items-center justify-center mx-auto mb-5">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="gradient-text">Credits</span>
          </h1>
          <p className="text-gray-500">
            Infernix wouldn't be possible without these amazing people and projects.
          </p>
        </motion.div>

        {/* Team Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            The <span className="gradient-text">Team</span>
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl bg-white/5 border border-white/5 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center mx-auto mb-3">
                  <member.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">{member.name}</h3>
                <p className="text-xs text-gray-400 mb-2">{member.role}</p>
                <p className="text-xs text-gray-500">{member.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Special Thanks */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
            <div className="flex items-center justify-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-white">Special Thanks</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {specialThanks.map((thanks) => (
                <div
                  key={thanks.name}
                  className="p-4 rounded-xl border bg-black/30 border-white/5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0">
                      <Heart className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-white text-sm mb-1">
                        {thanks.link ? (
                          <a
                            href={thanks.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white transition-colors inline-flex items-center gap-1"
                          >
                            {thanks.name}
                            <Globe className="w-3 h-3" />
                          </a>
                        ) : (
                          thanks.name
                        )}
                      </h3>
                      <p className="text-gray-500 text-xs leading-relaxed">{thanks.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Technologies */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-lg font-bold text-white mb-4 text-center">Built With</h2>
          
          <div className="flex flex-wrap justify-center gap-2">
            {technologies.map((tech) => (
              <div
                key={tech.name}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-sm"
              >
                <span className="text-white font-medium">{tech.name}</span>
                <span className="text-gray-500 ml-1">• {tech.description}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* GitHub */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center"
        >
          <Github className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Open Source</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">
            Infernix uses many open source projects. We're grateful to all the developers 
            who create and maintain these amazing tools.
          </p>
          <a
            href="https://github.com/aauuzyy/Xeno-x-Infernix"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors"
          >
            <Github className="w-4 h-4" />
            View on GitHub
          </a>
        </motion.div>
      </div>
    </div>
  );
}
