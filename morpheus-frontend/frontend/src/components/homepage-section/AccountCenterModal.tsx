import React, { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, LogIn, User as UserIcon } from "lucide-react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import AccountSettings from "@/components/homepage-section/AccountSettings";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type AccountCenterTab = "account";

interface AccountCenterModalProps {
  open: boolean;
  activeTab: AccountCenterTab;
  onChangeTab: (tab: AccountCenterTab) => void;
  onClose: () => void;
}

const AccountCenterModal: React.FC<AccountCenterModalProps> = ({ open, activeTab, onChangeTab, onClose }) => {
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { user, isSignedIn } = useUser();

  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);
  const startYRef = useRef<number | null>(null);

  // Responsive: detect desktop to avoid mounting mobile Sheet overlay on desktop
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  useEffect(() => {
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(min-width: 640px)') : null;
    const update = () => setIsDesktop(!!mq && mq.matches);
    update();
    if (mq) {
      try {
        mq.addEventListener('change', update);
      } catch {
        // Safari fallback
        // @ts-ignore
        mq.addListener(update);
      }
    }
    return () => {
      if (mq) {
        try {
          mq.removeEventListener('change', update);
        } catch {
          // @ts-ignore
          mq.removeListener(update);
        }
      }
    };
  }, []);

  // Mobile two-sheet state
  const [isShowingMobileContent, setIsShowingMobileContent] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<AccountCenterTab>(activeTab);

  // Reset mobile flow on open
  useEffect(() => {
    if (open) {
      const isDesktopOrUp = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 640px)').matches;
      setMobileActiveTab(activeTab);
      setDragY(0);
      // On mobile (< sm), open directly into the content sheet for the selected tab
      setIsShowingMobileContent(!isDesktopOrUp);
    } else {
      setIsShowingMobileContent(false);
      setDragY(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    startYRef.current = e.clientY;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
  };

  const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || startYRef.current == null) return;
    const delta = e.clientY - startYRef.current;
    setDragY(delta > 0 ? delta : 0);
  };

  const onHandlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const displayName = user?.fullName || user?.firstName || "User";
  const email = user?.primaryEmailAddress?.emailAddress || "user@example.com";
  const avatarUrl = user?.imageUrl;

  const sidebarItems = useMemo(() => {
    const items: { key: AccountCenterTab; label: string; icon: React.ReactNode }[] = [];
    if (isSignedIn) {
      items.push(
        { key: "account" as AccountCenterTab, label: "Manage Account", icon: <UserIcon className="w-4 h-4" /> },
      );
    }
    return items;
  }, [isSignedIn]);

  if (!open) return null;

  return (
    <>
      {/* Mobile: Single Sheet toggling between Settings list and Content (sm:hidden) */}
      {open && !isDesktop && (
        <Sheet open={open} onOpenChange={(v) => { if (!v) { setIsShowingMobileContent(false); onClose(); } }}>
          <SheetContent side="bottom" className="sm:hidden h-[80vh] w-full bg-muted border-t border-border rounded-t-xl overflow-hidden p-0">
            {/* Drag Handle */}
            <div
              className="w-full flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing select-none"
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
            >
              <div className="h-1.5 w-12 rounded-full bg-muted" />
            </div>
            {/* Content with drag translate */}
            <div style={{ transform: `translateY(${dragY}px)`, transition: draggingRef.current ? 'none' : 'transform 200ms ease' }}>
              {/* Settings List View */}
              {!isShowingMobileContent && (
                <div className="relative z-10 w-full h-[calc(80vh-20px)] bg-muted overflow-hidden">

                  {/* Header user info */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-4 h-4 text-foreground" />
                        )}
                      </div>
                      <div className="flex flex-col items-start justify-start min-w-0 whitespace-nowrap">
                        <p className="text-sm font-semibold text-foreground">{displayName}</p>
                        <p className="text-xs text-muted-foreground">{email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Settings list */}
                  <div className="p-3">
                    <div className="space-y-1">
                      {sidebarItems.map(item => (
                        <button
                          key={item.key}
                          onClick={() => { setMobileActiveTab(item.key); onChangeTab(item.key); setIsShowingMobileContent(true); }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-3 rounded-md text-sm hover:bg-muted ${mobileActiveTab === item.key ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                        >
                          <span className="flex items-center gap-2"><span className="text-muted-foreground">{item.icon}</span><span>{item.label}</span></span>
                          <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-border my-3"></div>
                    {isSignedIn ? (
                      <button
                        onClick={async () => { await signOut(); onClose(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log out</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => { onClose(); navigate('/login'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Content View */}
              {isShowingMobileContent && (
                <div className="relative z-10 w-full h-[calc(80vh-20px)] bg-muted overflow-hidden flex flex-col">
                  {/* Top bar with Back (no close icon on mobile) */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <button
                      onClick={() => { setIsShowingMobileContent(false); setDragY(0); }}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md px-2 py-1"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                      <span>Back to settings</span>
                    </button>
                  </div>

                  {/* Content body */}
            <div className="flex-1 overflow-y-auto">
              {isSignedIn && <AccountSettings />}
            </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop/Tablet Centered Dialog (hidden on mobile) */}
      <div className="hidden sm:flex fixed inset-0 z-[260] items-center justify-center p-4">
        <div className="fixed inset-0 bg-foreground/5 hidden sm:block" onClick={onClose} />
        <div className="relative z-10 w-full max-w-6xl h-[80vh] bg-muted rounded-xl border border-border shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-[max-content_1fr]">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Sidebar */}
          <aside className="border-r border-border bg-muted h-full">
            <div className="p-3">
              {/* User Info */}
              <div className="flex items-center gap-3 p-2 mb-2">
                <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-foreground" />
                  )}
                </div>
                <div className="flex flex-col items-start justify-start min-w-0 whitespace-nowrap">
                  <p className="text-sm font-semibold text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>
              </div>
              <div className="h-px w-full bg-border my-2" />
              <div className="space-y-1">
                {sidebarItems.map(item => (
                  <button
                    key={item.key}
                    onClick={() => onChangeTab(item.key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted ${activeTab === item.key ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                  >
                    <span className="text-muted-foreground">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-border my-3"></div>
              {isSignedIn ? (
                <button
                  onClick={async () => { await signOut(); onClose(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              ) : (
                <button
                  onClick={() => { onClose(); navigate('/login'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </button>
              )}
            </div>
          </aside>

          {/* Content */}
          <section className="h-full overflow-y-auto">
            {isSignedIn && <AccountSettings />}
          </section>
        </div>
      </div>
    </>
  );
};

export default AccountCenterModal;


