import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogIn, User as UserIcon, ChevronsUpDown, LogOut, PanelLeftOpen, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, useUser, useClerk, UserProfile } from "@clerk/clerk-react";
// Clerk uses default light theme
import { cn } from "@/lib/utils";
import AccountCenterModal from "@/components/homepage-section/AccountCenterModal";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const Header = () => {
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [accountCenterOpen, setAccountCenterOpen] = useState(false);
  const [accountCenterTab, setAccountCenterTab] = useState<"account">("account");
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const { signOut } = useClerk();
  const [showProjectsBtn, setShowProjectsBtn] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleOpen = () => setShowProjectsBtn(false);
    const handleClose = () => setShowProjectsBtn(true);
    window.addEventListener('open-projects', handleOpen as EventListener);
    window.addEventListener('close-projects', handleClose as EventListener);
    return () => {
      window.removeEventListener('open-projects', handleOpen as EventListener);
      window.removeEventListener('close-projects', handleClose as EventListener);
    };
  }, []);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && userProfileOpen) {
        setUserProfileOpen(false);
      }
    };
    if (userProfileOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [userProfileOpen]);

  const displayName = user?.fullName || user?.firstName || "User";
  const email = user?.primaryEmailAddress?.emailAddress || "user@example.com";
  const avatarUrl = user?.imageUrl;

  const toggleUserMenu = () => setUserMenuOpen(prev => !prev);
  const handleManageAccount = () => {
    setUserMenuOpen(false);
    setUserProfileOpen(true);
  };
  const handleLogout = async () => {
    try {
      setUserMenuOpen(false);
      await signOut();
    } catch (e) {
      console.error("Error signing out:", e);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] mx-4">
      {/* My projects floating button aligned with header but outside the glass panel */}
      <SignedIn>
        {showProjectsBtn && (
        <div className="hidden lg:block fixed left-6 top-6 z-[110]">
          <button
            onMouseEnter={(e) => e.currentTarget.classList.add('hovered')}
            onMouseLeave={(e) => e.currentTarget.classList.remove('hovered')}
            onClick={() => window.dispatchEvent(new Event('open-projects'))}
            className="button-outline text-foreground group inline-flex items-center gap-2 px-3 py-2 rounded-md"
          >
            <span className="text-sm text-foreground">My projects</span>
            <PanelLeftOpen className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
        )}
      </SignedIn>
      
      <div className={cn(
        "flex h-14 items-center justify-between px-4 rounded-xl mx-auto mt-4 transition-all duration-300 ease-in-out",
        scrolled
          ? "max-w-xl bg-white/85 backdrop-blur-xl border border-border/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
          : "2xl:max-w-6xl xl:max-w-4xl lg:max-w-2xl md:w-full glass-panel"
      )}>
        {/* Left side - Logo and brand */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {/* Logo for signed-in users - only show on lg+ screens */}
            <SignedIn>
              <div className="hidden lg:block w-32 h-auto rounded-lg flex items-center justify-center hover:cursor-pointer">
                <img 
                  src="/logo-full-horizon.png"
                  alt="Morpheus Logo" 
                  className="w-full h-full object-contain"
                  onClick={() => navigate("/")}
                />
              </div>
            </SignedIn>
            
            {/* Logo for non-signed-in users - show on all screen sizes */}
            <SignedOut>
              <div className="w-12 md:w-32 h-auto rounded-lg flex items-center justify-center hover:cursor-pointer">
                <img 
                  src="/logo-watermark.png"
                  alt="Morpheus Logo"
                  className="block md:hidden w-full h-full object-contain"
                  onClick={() => navigate("/")}
                />
                <img 
                  src="/logo-full-horizon.png"
                  alt="Morpheus Logo"
                  className="hidden md:block w-full h-full object-contain"
                  onClick={() => navigate("/")}
                />
              </div>
            </SignedOut>
            
            <SignedIn>
              {showProjectsBtn && (
                <div className="lg:hidden">
                  <button
                    onMouseEnter={(e) => e.currentTarget.classList.add('hovered')}
                    onMouseLeave={(e) => e.currentTarget.classList.remove('hovered')}
                    onClick={() => window.dispatchEvent(new Event('open-projects'))}
                    className="button-outline text-foreground group inline-flex items-center gap-2 px-3 py-2 rounded-[4px]"
                  >
                    <span className="text-sm text-foreground">My projects</span>
                    <PanelLeftOpen className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              )}
            </SignedIn>
            <button
              className="md:hidden inline-flex items-center justify-center ml-1 p-2 rounded-[4px] hover:bg-muted transition-colors"
              aria-label="Open menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </div>

        </div>

        {/* Center - Navigation menu */}

        {/* Right side - waitlist and login */}
        <div className="flex items-center gap-4">
          {/* Waitlist CTA (only when signed out) */}
          <SignedOut>
            <button 
              onClick={() => navigate("/waitlist")}
              className="button-gradient text-[#1F2937] px-4 py-2 font-medium transition-all text-sm duration-200 flex items-center gap-2 rounded-[4px]"
            >
              Join waitlist
            </button>
          </SignedOut>

          <SignedOut>
            <button 
              onClick={() => navigate("/login")}
              className="button-outline text-foreground px-4 py-2 font-medium transition-all text-sm duration-200 flex items-center gap-2 rounded-[4px]"
            >
              Login
              <LogIn className="w-4 h-4" />
            </button>
          </SignedOut>
          <SignedIn>
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={toggleUserMenu}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-lg transition-colors"
                aria-label="Toggle user menu"
              >
                <div className="w-8 h-8 shrink-0 aspect-square bg-accent rounded-full flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-accent-foreground" />
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[160px] truncate">{displayName}</span>
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* User Menu Dropdown */}
              <div className={cn(
                "absolute right-0 top-full mt-2 z-50 bg-muted border border-border rounded-lg shadow-lg min-w-64 w-auto max-w-80 transition-all duration-200 ease-in-out",
                userMenuOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
              )}>
                <div className="p-2">
                  {/* User Info Header */}
                  <div className="flex items-center gap-3 p-2 mb-2">
                    <div className="w-8 h-8 shrink-0 aspect-square bg-accent rounded-full flex items-center justify-center overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-accent-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col items-start justify-start min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground break-words">{displayName}</p>
                      <p className="text-xs text-muted-foreground break-words">{email}</p>
                    </div>
                  </div>

                  <div className="border-t border-border my-2"></div>

                  {/* Menu Items */}
                  <div className="space-y-1">
                    <button 
                      onClick={() => { setUserMenuOpen(false); setAccountCenterTab("account"); setAccountCenterOpen(true); }}
                      className="w-full flex items-center gap-2 p-2 hover:bg-background rounded-md transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Manage Account</span>
                    </button>
                    <button className="w-full flex items-center gap-2 p-2 hover:bg-background rounded-md transition-colors" onClick={handleLogout}>
                      <LogOut className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Log out</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </SignedIn>
        </div>
      </div>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="md:hidden w-[60vw] max-w-xs bg-muted border-r border-border p-4 z-[300]" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="space-y-2">

          </div>
        </SheetContent>
      </Sheet>
      {userProfileOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-foreground/40" 
            onClick={() => setUserProfileOpen(false)}
          />
          <div className="relative z-10 bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border border-border">
            <div className="px-4 pt-3 pb-2 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Manage Account</h2>
                <button
                  onClick={() => setUserProfileOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-[4px] hover:bg-muted transition-colors"
                  aria-label="Close profile"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex flex-1 overflow-y-auto p-2">
              <UserProfile 
                appearance={{
                  elements: {
                    rootBox: "w-full h-full",
                    card: "shadow-none border-none bg-transparent",
                    navbar: "border-none",
                    navbarButton: "text-muted-foreground hover:text-foreground hover:bg-muted",
                    navbarButtonActive: "text-foreground bg-muted",
                    page: "p-4 bg-background",
                    pageScrollBox: "p-0 bg-background",
                    formButtonPrimary: "button-gradient",
                    formFieldInput: "bg-white border-border text-foreground placeholder-muted-foreground",
                    formFieldLabel: "text-foreground",
                    identityPreview: "bg-muted border-border",
                    identityPreviewText: "text-foreground",
                    identityPreviewEditButton: "text-accent hover:text-accent/80",
                    formFieldSuccessText: "text-green-700",
                    formFieldErrorText: "text-red-600",
                    footer: "border-none",
                    footerActionLink: "text-accent hover:text-accent/80",
                    main: "bg-background",
                    profileSection: "bg-background",
                    profileSectionTitle: "text-foreground",
                    profileSectionContent: "bg-background",
                    profileSectionContentText: "text-foreground",
                    profileSectionContentButton: "text-foreground",
                    profileSectionContentButtonPrimary: "button-gradient",
                    profileSectionContentButtonSecondary: "bg-muted text-foreground border-border",
                    profileSectionContentButtonDanger: "bg-red-600 text-white",
                    profileSectionContentButtonSuccess: "bg-green-600 text-white",
                    profileSectionContentButtonWarning: "bg-yellow-500 text-foreground",
                    profileSectionContentButtonInfo: "bg-blue-500 text-white",
                    profileSectionContentButtonLink: "text-accent hover:text-accent/80",
                    profileSectionContentButtonGhost: "text-foreground hover:bg-muted",
                    profileSectionContentButtonOutline: "border-border text-foreground hover:bg-muted",
                    profileSectionContentButtonSolid: "bg-muted text-foreground hover:bg-border",
                    profileSectionContentButtonSubtle: "text-muted-foreground hover:text-foreground hover:bg-muted",
                    profileSectionContentButtonDestructive: "bg-red-600 text-white hover:bg-red-700",
                    profileSectionContentButtonConstructive: "bg-green-600 text-white hover:bg-green-700",
                    profileSectionContentButtonNeutral: "bg-muted text-foreground hover:bg-border",
                    profileSectionContentButtonBrand: "button-gradient",
                    profileSectionContentButtonPrimaryBrand: "button-gradient",
                    profileSectionContentButtonSecondaryBrand: "bg-muted text-foreground border-border",
                    profileSectionContentButtonTertiaryBrand: "text-foreground hover:bg-muted",
                    profileSectionContentButtonQuaternaryBrand: "text-muted-foreground hover:text-foreground",
                    profileSectionContentButtonGhostBrand: "text-foreground hover:bg-muted",
                    profileSectionContentButtonOutlineBrand: "border-border text-foreground hover:bg-muted",
                    profileSectionContentButtonSolidBrand: "bg-muted text-foreground hover:bg-border",
                    profileSectionContentButtonSubtleBrand: "text-muted-foreground hover:text-foreground hover:bg-muted",
                    profileSectionContentButtonDestructiveBrand: "bg-red-600 text-white hover:bg-red-700",
                    profileSectionContentButtonConstructiveBrand: "bg-green-600 text-white hover:bg-green-700",
                    profileSectionContentButtonNeutralBrand: "bg-muted text-foreground hover:bg-border"
                  },
                  variables: {
                    colorText: "#1F2937",
                    colorBackground: "#FFF9F5",
                  },
                  layout: {
                    unsafe_disableDevelopmentModeWarnings: true,
                    animations: true,
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
      <AccountCenterModal 
        open={accountCenterOpen}
        activeTab={accountCenterTab}
        onChangeTab={(t) => setAccountCenterTab(t)}
        onClose={() => setAccountCenterOpen(false)}
      />
    </header>
  );
};

export default Header;

// User Profile Modal (global to header)
// Rendered at the end to ensure it overlays content
// Keep outside component to avoid JSX nesting warnings
// We attach it conditionally below the default export via IIFE in runtime
