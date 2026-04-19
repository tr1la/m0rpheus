import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRotatingText } from "@/hooks/useRotatingText";
import { Link as LinkIcon, Upload, FlaskConical } from "lucide-react";
import { CONNECTORS } from "@/constants/connectors";
import { useChatStore } from "@/chat/useChatStore";

interface BlankStateProps {
  subtexts: string[];
  intervalMs?: number;
  onWatchTutorial?: () => void;
  handleFileUpload?: () => void;
  onConnectDataSource?: () => void;
  onUseSample?: () => void;
  className?: string;
}

const BlankState: React.FC<BlankStateProps> = ({
  subtexts,
  intervalMs = 3500,
  onWatchTutorial,
  handleFileUpload,
  onConnectDataSource,
  onUseSample,
  className = "",
}) => {
  const texts = useMemo(() => Array.isArray(subtexts) ? subtexts.filter(Boolean) : [], [subtexts]);
  const { activeIndex, typedText, isTyping, isAnimating, pause, resume } = useRotatingText(texts, intervalMs);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (menuOpen && menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  const selectConnector = (name: string) => {
    try {
      useChatStore.getState().setSelectedDataSource(name);
      useChatStore.getState().setDropdownOpen(true);
      const el = document.querySelector('[data-chat-root]');
      if (el && 'scrollIntoView' in el) {
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (_e) {}
    setMenuOpen(false);
  };

  return (
    <div className={`h-full flex items-center justify-center p-6 ${className}`}>
      <div className="max-w-sm w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="/logo-watermark.png"
            alt="Morpheus"
            className="w-10 h-10 mx-auto mb-3 object-contain"
          />
          <h2 className="font-outfit text-xl font-bold text-foreground mb-2">
            Ready to analyze
          </h2>
          <div
            aria-live="polite"
            className="min-h-[1.5rem] text-sm text-muted-foreground font-mono"
            onMouseEnter={resume}
            onMouseLeave={resume}
            onFocus={resume}
            onBlur={resume}
          >
            <span className="inline-block">
              {typedText}
              <span className={`ml-0.5 inline-block w-[1ch] text-[#ff5600] ${isTyping ? 'opacity-100' : 'opacity-0'} animate-pulse`}>│</span>
            </span>
          </div>
        </div>

        {/* Bento action cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Upload — full width */}
          {handleFileUpload && (
            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onClick={handleFileUpload}
              className="col-span-2 flex items-center gap-3 p-4 bg-white border border-border/50 rounded-xl hover:border-[#ff5600]/30 hover:shadow-[0_2px_12px_rgba(255,86,0,0.08)] transition-all duration-200 text-left group"
            >
              <div className="w-9 h-9 bg-[#ff5600]/10 rounded-lg flex items-center justify-center group-hover:bg-[#ff5600]/20 transition-colors flex-shrink-0">
                <Upload className="w-4 h-4 text-[#ff5600]" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Upload a file</p>
                <p className="text-xs text-muted-foreground">CSV, Excel, JSON up to 50MB</p>
              </div>
            </motion.button>
          )}

          {/* Connect data source */}
          <div className="relative" ref={menuRef}>
            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="w-full flex items-center gap-3 p-4 bg-white border border-border/50 rounded-xl hover:border-[#ff5600]/30 hover:shadow-[0_2px_12px_rgba(255,86,0,0.08)] transition-all duration-200 text-left group"
            >
              <div className="w-9 h-9 bg-[#ff5600]/10 rounded-lg flex items-center justify-center group-hover:bg-[#ff5600]/20 transition-colors flex-shrink-0">
                <LinkIcon className="w-4 h-4 text-[#ff5600]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Connect source</p>
                <p className="text-xs text-muted-foreground truncate">Sheets, GA4, Meta…</p>
              </div>
            </motion.button>
            {menuOpen && (
              <div role="menu" className="absolute mt-1 left-0 w-56 bg-background/95 backdrop-blur-sm border border-border/30 rounded-lg shadow-lg z-20">
                <div className="py-1">
                  {CONNECTORS.map((connector) => (
                    <button
                      role="menuitem"
                      key={connector.name}
                      onClick={() => selectConnector(connector.name)}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted/50"
                    >
                      <img src={connector.icon} alt={connector.name} className="w-4 h-4 object-cover" />
                      {connector.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Try sample data */}
          {onUseSample && (
            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onClick={onUseSample}
              className="flex items-center gap-3 p-4 bg-white border border-border/50 rounded-xl hover:border-[#ff5600]/30 hover:shadow-[0_2px_12px_rgba(255,86,0,0.08)] transition-all duration-200 text-left group"
            >
              <div className="w-9 h-9 bg-[#ff5600]/10 rounded-lg flex items-center justify-center group-hover:bg-[#ff5600]/20 transition-colors flex-shrink-0">
                <FlaskConical className="w-4 h-4 text-[#ff5600]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Try sample</p>
                <p className="text-xs text-muted-foreground truncate">Demo data</p>
              </div>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlankState;
