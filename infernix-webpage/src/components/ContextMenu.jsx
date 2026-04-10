import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, RotateCcw, Link,
  Printer, Maximize, ArrowUp, Copy, BookOpen,
} from 'lucide-react';

const ITEMS = [
  { icon: ArrowLeft,   label: 'Back',              action: () => window.history.back() },
  { icon: ArrowRight,  label: 'Forward',            action: () => window.history.forward() },
  { icon: RotateCcw,   label: 'Reload',             action: () => window.location.reload() },
  null,
  { icon: Link,        label: 'Copy URL',           action: () => navigator.clipboard.writeText(window.location.href) },
  { icon: Copy,        label: 'Copy Page Title',    action: () => navigator.clipboard.writeText(document.title) },
  null,
  { icon: ArrowUp,     label: 'Scroll to Top',      action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
  { icon: Maximize,    label: 'Toggle Fullscreen',  action: () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen(); } },
  null,
  { icon: Printer,     label: 'Print Page',         action: () => window.print() },
  { icon: BookOpen,    label: 'View Source',        action: () => window.open('view-source:' + window.location.href) },
];

export default function ContextMenu() {
  const [menu, setMenu] = useState(null); // { x, y }
  const menuRef = useRef(null);

  const close = useCallback(() => setMenu(null), []);

  useEffect(() => {
    const onContext = (e) => {
      e.preventDefault();
      const x = e.clientX;
      const y = e.clientY;
      // defer so we can measure menu size against viewport
      setMenu({ x, y });
    };

    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        close();
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('contextmenu', onContext);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [close]);

  // Clamp menu to viewport once rendered
  useEffect(() => {
    if (!menu || !menuRef.current) return;
    const { width, height } = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = Math.min(menu.x, vw - width - 8);
    const y = Math.min(menu.y, vh - height - 8);
    if (x !== menu.x || y !== menu.y) setMenu({ x, y });
  }, [menu]);

  return createPortal(
    <AnimatePresence>
      {menu && (
        <motion.div
          ref={menuRef}
          key="ctx"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
          style={{ top: menu.y, left: menu.x }}
          className="ctx-menu fixed z-[9999] min-w-[210px] rounded-lg border border-white/10 shadow-xl shadow-black/60 overflow-hidden py-1"
        >
          {ITEMS.map((item, i) =>
            item === null ? (
              <div key={i} className="my-1 border-t border-white/10" />
            ) : (
              <button
                key={item.label}
                onClick={() => { item.action(); close(); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-100 cursor-default"
              >
                <item.icon size={13} className="shrink-0 opacity-60" />
                {item.label}
              </button>
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
