import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ShieldCheck, AlertTriangle } from 'lucide-react';

function StepRow({ step }) {
  const { status, label } = step;
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22 }}
      className="flex items-center gap-2.5 py-[3px]"
    >
      <div className="w-4 h-4 flex items-center justify-center shrink-0">
        {status === 'idle' && (
          <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
        )}
        {status === 'running' && (
          <div className="w-3.5 h-3.5 rounded-full border border-purple-400/70 border-t-transparent animate-spin" />
        )}
        {status === 'done' && (
          <Check size={12} className="text-emerald-400/80" />
        )}
        {status === 'fail' && (
          <X size={12} className="text-red-400/75" />
        )}
      </div>
      <span className={`text-[11.5px] flex-1 transition-colors duration-300 ${
        status === 'running' ? 'text-white/80' :
        status === 'done'    ? 'text-white/28' :
        status === 'fail'    ? 'text-red-400/65' :
                               'text-white/15'
      }`}>
        {label}
        {status === 'running' && (
          <motion.span
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.3, repeat: Infinity }}
          >...</motion.span>
        )}
      </span>
    </motion.div>
  );
}

export default function VerificationPanel({
  steps = [],
  attempt = 1,
  maxAttempts = 3,
  issues = [],
  passed = null,
  rightOffset = 16,
}) {
  const doneCount = steps.filter(s => s.status === 'done' || s.status === 'fail').length;
  const progress = steps.length > 0 ? doneCount / steps.length : 0;
  const finalFail = passed === false && (issues.length === 0 || attempt >= maxAttempts);
  const retrying  = passed === false && issues.length > 0 && attempt < maxAttempts;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="fixed z-[150] w-[318px] overflow-hidden rounded-2xl border border-white/[0.09] shadow-2xl"
      style={{
        bottom: '7rem',
        right: `${rightOffset}px`,
        background: 'rgba(5, 5, 9, 0.93)',
        backdropFilter: 'blur(28px)',
      }}
    >
      {/* Scan-line sweep */}
      <motion.div
        className="absolute inset-x-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.3) 50%, transparent 100%)' }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
        <div className="relative flex items-center justify-center">
          <ShieldCheck size={13} className="text-purple-400/70 relative z-10" />
          <motion.div
            className="absolute -inset-2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0.1, 0.6] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
        </div>
        <span className="text-xs font-medium text-white/50 tracking-wide">Code Verification</span>
        <div className="ml-auto flex items-center gap-1.5">
          {Array.from({ length: maxAttempts }, (_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-400 ${
                i < attempt - 1  ? 'bg-amber-400/50' :
                i === attempt - 1 ? 'bg-purple-400/70 scale-110' :
                                    'bg-white/[0.08]'
              }`}
            />
          ))}
          <span className="text-[9px] text-white/18 ml-0.5 tabular-nums">#{attempt}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3 pb-1.5">
        <div className="flex items-center gap-2">
          <div className="h-[3px] flex-1 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #a855f7, #6366f1, #3b82f6)' }}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[9px] text-white/18 w-6 text-right tabular-nums">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="px-4 py-2 space-y-[1px]">
        {steps.map(step => <StepRow key={step.id} step={step} />)}
      </div>

      {/* Issues list */}
      <AnimatePresence>
        {issues.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-2 border-t border-white/[0.06] mt-0.5">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={10} className="text-red-400/55" />
                <span className="text-[9px] text-red-400/55 font-semibold uppercase tracking-widest">
                  {issues.filter(i => i.severity === 'error').length} error&thinsp;·&thinsp;{issues.filter(i => i.severity === 'warning').length} warning
                </span>
              </div>
              {issues.slice(0, 5).map((issue, i) => (
                <div key={i} className="flex items-start gap-1.5 mb-1 last:mb-0">
                  <span className={`mt-[2px] shrink-0 text-[8px] font-bold ${
                    issue.severity === 'error' ? 'text-red-400/70' : 'text-yellow-400/55'
                  }`}>
                    {issue.severity === 'error' ? '✖' : '▲'}
                  </span>
                  <span className="text-[10.5px] text-white/32 leading-snug">{issue.message}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status footer */}
      <div className="px-4 pb-3 pt-0.5">
        {passed === null && (
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-1 h-1 rounded-full bg-purple-400/60"
              animate={{ scale: [1, 1.7, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            />
            <span className="text-[10px] text-white/18">Analyzing script...</span>
          </div>
        )}
        {retrying && (
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-1 h-1 rounded-full bg-amber-400/70"
              animate={{ scale: [1, 1.6, 1] }}
              transition={{ duration: 0.85, repeat: Infinity }}
            />
            <span className="text-[10px] text-amber-400/65">Applying fixes, re-verifying...</span>
          </div>
        )}
        {finalFail && (
          <div className="flex items-center gap-1.5">
            <X size={9} className="text-red-400/55 shrink-0" />
            <span className="text-[10px] text-red-400/55">
              {attempt >= maxAttempts ? 'Max attempts reached' : 'Verification failed'}
            </span>
          </div>
        )}
        {passed === true && (
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={10} className="text-emerald-400/70 shrink-0" />
            <span className="text-[10px] text-emerald-400/65">All checks passed</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
