import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Upload, Database, CornerRightUp, LayoutTemplate, Mic, MicOff, Link, FileText, BarChart3, TrendingUp, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BentoChartPreview from '@/components/homepage-section/BentoChartPreview';
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SignedIn, useAuth, useUser } from "@clerk/clerk-react";
import { ChevronRight } from "lucide-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useToast } from "@/hooks/use-toast";
import TextareaAutosize from 'react-textarea-autosize';
import RecordingBar from '@/components/ui/recording-bar';
import { useChatStore } from "@/chat/useChatStore";
import { useFileStore } from "@/chat/useFileStore";
import { fileService, type UploadResponse } from "@/services/fileService";
import { projectService } from "@/services/projectService";
import { Message } from "@/types/message";
import { FooterSection } from '@/components/homepage-section/footer-section';
import ProjectsSection from '@/components/homepage-section/ProjectsSection';
import ProjectsSidebar from '@/components/homepage-section/ProjectsSidebar';
import TemplateModal from '@/components/homepage-section/TemplateModal';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

interface HomePageProps {
  onGetStarted: () => void;
  onProcessedDataChange?: (data: any) => void;
}

const HomePage = ({ onGetStarted, onProcessedDataChange }: HomePageProps) => {
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    if (isSignedIn && clerkUser) {
      setUser(clerkUser);
      getToken().then((tokenValue) => {
        setToken(tokenValue);
        console.log('User:', clerkUser);
        console.log('Token:', tokenValue);
      }).catch((error) => {
        console.error('Failed to get token:', error);
      });
    } else {
      setUser(null);
      setToken(null);
    }
  }, [isSignedIn, clerkUser, getToken]);
  
  // Toast hook
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Fetch projects on mount when signed in
  useEffect(() => {
    if (isSignedIn) {
      console.log('🚀 Initial project fetch on mount...');
      setIsLoadingProjects(true);
      projectService.listProjects()
        .then((response) => {
          console.log('📋 Initial projects response:', response);
          if (response.success) {
            const mappedProjects = response.projects.map((p) => ({
              id: p.id,
              title: p.latest_dashboard_id && p.dashboard_title ? p.dashboard_title : "Untitled Project",
            }));
            console.log('✅ Initial mapped projects:', mappedProjects);
            setProjects(mappedProjects);
          } else {
            toast({
              title: "Failed to load projects",
              description: response.error || "Could not fetch your projects",
              variant: "destructive",
            });
          }
        })
        .catch((error) => {
          console.error('❌ Error fetching projects:', error);
          toast({
            title: "Error",
            description: "Failed to load projects. Please try again.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsLoadingProjects(false);
        });
    } else {
      setProjects([]);
    }
  }, [isSignedIn, toast]);

  // Refresh projects when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isSignedIn) {
        refreshProjects();
      }
    };

    const handleFocus = () => {
      if (isSignedIn) {
        refreshProjects();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isSignedIn]);

  const refreshProjects = async () => {
    if (!isSignedIn) return;
    console.log('🔄 Refreshing projects list...');
    try {
      const response = await projectService.listProjects();
      console.log('📋 Projects API response:', response);
      if (response.success) {
        const parseDate = (value?: string | null) => {
          if (!value) return 0;
          const timestamp = Date.parse(value);
          return Number.isNaN(timestamp) ? 0 : timestamp;
        };
        const sortedProjects = [...response.projects].sort((a, b) => {
          const first = parseDate(b.updated_at || b.created_at);
          const second = parseDate(a.updated_at || a.created_at);
          return first - second;
        });
        const mappedProjects = sortedProjects.map((p) => ({
          id: p.id,
          title: p.name || p.dashboard_title || "Untitled Project",
        }));
        console.log('✅ Mapped projects:', mappedProjects);
        setProjects(mappedProjects);
      } else {
        console.error('❌ Failed to fetch projects:', response.error);
      }
    } catch (error) {
      console.error('❌ Error refreshing projects:', error);
    }
  };

  const openProject = (id: string) => {
    navigate(`/workspace/project?projectId=${id}`);
  };

  const renameProject = async (id: string, newTitle: string) => {
    try {
      const response = await projectService.updateProject(id, newTitle);
      if (response.success) {
        await refreshProjects();
      } else {
        toast({
          title: "Failed to rename project",
          description: response.error || "Could not update project name",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error renaming project:', error);
      toast({
        title: "Error",
        description: "Failed to rename project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const response = await projectService.deleteProject(id);
      if (response.success) {
        await refreshProjects();
      } else {
        toast({
          title: "Failed to delete project",
          description: response.error || "Could not delete project",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNewProject = async () => {
    try {
      const response = await projectService.createProject("Untitled Project");
      if (response.success && response.project) {
        // Reset chat store for new project
        useChatStore.getState().resetChat();
        navigate(`/workspace/project?projectId=${response.project.id}`);
      } else {
        toast({
          title: "Failed to create project",
          description: response.error || "Could not create new project",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    }
  };
  // Zustand stores
  const {
    inputValue,
    selectedDataSource,
    dropdownOpen,
    isListening,
    detectedLanguage,
    uploadedFile,
    isProcessing,
    selectedTemplate,
    setInputValue,
    setSelectedDataSource,
    setDropdownOpen,
    setUploadedFile,
    setIsListening,
    setDetectedLanguage,
    setSelectedTemplate,
    sendMessage,
    addMessage,
    processFileWithMessage
  } = useChatStore();
  
  const {
    uploadState,
    uploadFile,
    validateClientFile,
    removeFile
  } = useFileStore();
  
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [lottieData, setLottieData] = useState(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  
  // File upload integration
  const { uploadState: legacyUploadState, uploadCSVFile, uploadExcelFile } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const placeholders = [
    "Tell me about your data or describe the dashboard you want...",
    "Upload your CSV and I'll suggest visualizations...",
    "Connect Stripe data and create a revenue dashboard...",
    "Show me customer acquisition trends with animated charts..."
  ];

  const connectors = [
    { name: "Google Sheets", icon: "/google-sheet.png" },
    { name: "GA4", icon: "/GA4.png" },
    { name: "Meta", icon: "/meta.png" },
    { name: "Airtable", icon: "/airtable.png" },
    { name: "Stripe", icon: "/stripe.jpeg" },
    { name: "Shopify", icon: "/shopify.png" },
    { name: "HubSpot", icon: "/hubspot.jpeg" },
    { name: "PostgreSQL", icon: "/PostgreSQL.png" }
  ];

  // Function to get colors for each data source
  const getDataSourceColors = (sourceName: string) => {
    const colors: { [key: string]: { bg: string; border: string; text: string; hover: string } } = {
      "Google Sheets": { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-foreground", hover: "hover:bg-emerald-200" },
      "GA4": { bg: "bg-amber-100", border: "border-amber-300", text: "text-foreground", hover: "hover:bg-amber-200" },
      "Meta": { bg: "bg-sky-100", border: "border-sky-300", text: "text-foreground", hover: "hover:bg-sky-200" },
      "Airtable": { bg: "bg-blue-100", border: "border-blue-300", text: "text-foreground", hover: "hover:bg-blue-200" },
      "Stripe": { bg: "bg-violet-100", border: "border-violet-300", text: "text-foreground", hover: "hover:bg-violet-200" },
      "Shopify": { bg: "bg-lime-100", border: "border-lime-300", text: "text-foreground", hover: "hover:bg-lime-200" },
      "HubSpot": { bg: "bg-orange-100", border: "border-orange-300", text: "text-foreground", hover: "hover:bg-orange-200" },
      "PostgreSQL": { bg: "bg-indigo-100", border: "border-indigo-300", text: "text-foreground", hover: "hover:bg-indigo-200" }
    };
    return colors[sourceName] || { bg: "bg-accent/15", border: "border-border", text: "text-foreground", hover: "hover:bg-accent/25" };
  };

  const scrollStackCards = [
    {
      title: "Real-time Analytics",
      subtitle: "Monitor your data with live updates and interactive dashboards",
      badge: "Live Data"
    },
    {
      title: "AI-Powered Insights",
      subtitle: "Get intelligent recommendations and automated analysis",
      badge: "AI Driven"
    },
    {
      title: "Custom fdkfjdlkfdlkfjkld",
      subtitle: "Create stunning charts and graphs tailored to your needs",
      badge: "Custom"
    },
    {
      title: "Custom Visualizations",
      subtitle: "Create stunning charts and graphs tailored to your needs",
      badge: "Custom"
    },
    {
      title: "Custom Visualizations",
      subtitle: "Create stunning charts and graphs tailored to your needs",
      badge: "Custom"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load Lottie animation data
    fetch('/bg-test-5.json')
      .then(response => response.json())
      .then(data => setLottieData(data))
      .catch(error => console.error('Error loading Lottie animation:', error));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (dropdownOpen && !target.closest('.data-source-dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen]);

  const handleChatSubmit = async () => {
    // Gate by auth: show waitlist modal if not signed in
    if (!isSignedIn) {
      setWaitlistOpen(true);
      return;
    }
    if (!inputValue.trim()) return;
    if (!uploadedFile || uploadedFile.status !== 'uploaded') {
      toast({ title: "Upload required", description: "Upload a CSV before asking a question.", variant: "destructive" });
      return;
    }
    
    // Create user message with file attachment immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
      attachment: uploadedFile ? { 
        kind: "csv", 
        name: uploadedFile.filename 
      } : undefined,
      template: selectedTemplate || undefined,
    };
    
    // Add message to store synchronously before switching views
    addMessage(userMessage);
    
    // Ensure projectId exists before navigation
    if (!uploadedFile.projectId) {
      toast({ 
        title: "Project error", 
        description: "Project context missing. Please try uploading the file again.", 
        variant: "destructive" 
      });
      return;
    }
    
    // Start processing in background
    void processFileWithMessage(inputValue.trim(), onProcessedDataChange, uploadedFile.projectId);
    
    // Navigate to project workspace for unified chat + dashboard flow
    navigate(`/workspace/project?projectId=${uploadedFile.projectId}`);
  };

  const handleFileUpload = (files: FileList | null) => {
    // Upload alone should not navigate; navigation happens on prompt submit
    if (files && files.length > 0) {
      // no-op here; actual upload handled by input change handlers
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handlePlusClick = () => {
    console.log('Plus button clicked');
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleCloneTemplateClick = () => {
    setTemplateModalOpen(true);
  };

  const handleTemplateSelect = (template: { id: string; title: string; description: string; image: string; category: string }) => {
    setSelectedTemplate(template);
    setInputValue(`Use ${template.title} template to make `);
    console.log('Template selected:', template);
  };

  const handleTemplateRemove = () => {
    setSelectedTemplate(null);
    setInputValue('');
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const validationError = validateClientFile(file);
    if (validationError) {
      toast({ title: "Upload error", description: validationError, variant: "destructive" });
      return;
    }
    
    try {
      // Create new file object for upload
      const newFile = { 
        fileID: 'pending', 
        filename: file.name, 
        size: file.size, 
        ext: (file.name.split('.').pop() || '').toLowerCase(), 
        status: 'uploading' as const 
      };
      
      // Replace behavior: if an uploaded file exists, we'll delete it after new upload succeeds
      setUploadedFile(newFile);

      const res: UploadResponse = await fileService.uploadFile(file);
      if (!res.success || !res.fileID || !res.ext || res.size === undefined || !res.filename) {
        setUploadedFile({ ...newFile, status: 'error' });
        toast({ title: "Upload failed", description: res.error || 'Upload failed', variant: "destructive" });
        return;
      }

      // Delete previous file if different
      if (uploadedFile && uploadedFile.fileID && uploadedFile.fileID !== 'pending') {
        void fileService.deleteFile(uploadedFile.fileID);
      }

      const fallbackFilename = res.filename ?? file.name;
      const fallbackSize = res.size ?? file.size;
      const fallbackExt = res.ext || (file.name.split('.').pop() || '').toLowerCase();

      setUploadedFile({ 
        fileID: res.fileID, 
        filename: fallbackFilename, 
        size: fallbackSize, 
        ext: fallbackExt, 
        status: 'uploaded',
        projectId: res.asset?.project_id
      });
      toast({ title: "File uploaded", description: `${res.filename} uploaded successfully. You can now ask questions about your data.` });
    } catch (_e) {
      setUploadedFile({ 
        fileID: 'error', 
        filename: file.name, 
        size: file.size, 
        ext: (file.name.split('.').pop() || '').toLowerCase(), 
        status: 'error' 
      });
      toast({ title: "Upload error", description: "Failed to upload file. Please try again.", variant: "destructive" });
    }
    
    // Reset input
    event.target.value = '';
  };

  const handleDataSourceSelect = (source: string) => {
    setSelectedDataSource(source);
    setDropdownOpen(false);
    console.log('Data source selected:', source);
  };

  const SAMPLE_CSV = `month,revenue,orders,avg_order_value,new_customers,returning_customers,refunds,category,channel
2024-01,48200,312,154.49,189,123,14,Electronics,Organic
2024-01,31500,278,113.31,145,133,9,Apparel,Paid
2024-01,19800,201,98.51,98,103,6,Home & Kitchen,Social
2024-02,52100,341,152.79,210,131,17,Electronics,Organic
2024-02,34200,305,112.13,158,147,11,Apparel,Paid
2024-02,22100,218,101.38,112,106,7,Home & Kitchen,Social
2024-03,61400,389,157.84,241,148,19,Electronics,Organic
2024-03,39800,354,112.43,174,180,13,Apparel,Email
2024-03,26500,251,105.58,128,123,8,Home & Kitchen,Social
2024-04,58900,371,158.76,228,143,16,Electronics,Organic
2024-04,37400,331,112.99,163,168,12,Apparel,Paid
2024-04,25100,242,103.72,121,121,7,Home & Kitchen,Email
2024-05,67200,418,160.77,261,157,21,Electronics,Organic
2024-05,43100,382,112.83,188,194,15,Apparel,Paid
2024-05,29400,276,106.52,139,137,9,Home & Kitchen,Social
2024-06,72800,451,161.42,281,170,23,Electronics,Organic
2024-06,47600,419,113.60,207,212,17,Apparel,Email
2024-06,32900,303,108.58,154,149,10,Home & Kitchen,Social`;

  const handleTrySample = async () => {
    if (!isSignedIn) {
      setWaitlistOpen(true);
      return;
    }
    if (isDemoLoading) return;

    setIsDemoLoading(true);
    const demoPrompt = 'Create a comprehensive sales dashboard showing revenue trends, top categories, channel performance, and key metrics';
    setInputValue(demoPrompt);

    const file = new File([SAMPLE_CSV], 'sample-ecommerce-2024.csv', { type: 'text/csv' });

    const pendingFile = {
      fileID: 'pending',
      filename: file.name,
      size: file.size,
      ext: 'csv',
      status: 'uploading' as const,
    };
    setUploadedFile(pendingFile);

    try {
      const res: UploadResponse = await fileService.uploadFile(file);
      if (!res.success || !res.fileID || !res.asset?.project_id) {
        setUploadedFile({ ...pendingFile, status: 'error' });
        toast({ title: "Demo upload failed", description: res.error || 'Could not load sample data.', variant: "destructive" });
        setIsDemoLoading(false);
        return;
      }

      setUploadedFile({
        fileID: res.fileID,
        filename: res.filename ?? file.name,
        size: res.size ?? file.size,
        ext: 'csv',
        status: 'uploaded',
        projectId: res.asset.project_id,
      });

      const projectId = res.asset.project_id;
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: demoPrompt,
        timestamp: new Date(),
        attachment: { kind: 'csv', name: res.filename ?? file.name },
      };
      addMessage(userMessage);
      void processFileWithMessage(demoPrompt, onProcessedDataChange, projectId);
      navigate(`/workspace/project?projectId=${projectId}`);
    } catch (_e) {
      setUploadedFile({ ...pendingFile, status: 'error' });
      toast({ title: "Demo upload failed", description: "Failed to load sample data. Please try again.", variant: "destructive" });
    } finally {
      setIsDemoLoading(false);
    }
  };

  // Speech recognition hook
  const {
    transcript,
    error: speechError,
    isSupported: speechSupported,
    selectedLanguage,
    isListening: speechIsListening,
    detectedLanguage: speechDetectedLanguage,
    startListening,
    stopListening,
    resetTranscript,
    abortRecording,
    completeRecording
  } = useSpeechRecognition({
    onResult: (result) => {
      setInputValue(inputValue + (inputValue ? ' ' : '') + result);
      resetTranscript();
    },
    onError: (error) => {
      toast({
        title: "Speech Recognition Error",
        description: error,
        variant: "destructive",
      });
    },
    continuous: true
  });

  // Sync speech recognition state with chat store
  useEffect(() => {
    setIsListening(speechIsListening);
  }, [speechIsListening, setIsListening]);

  useEffect(() => {
    setDetectedLanguage(speechDetectedLanguage);
  }, [speechDetectedLanguage, setDetectedLanguage]);

  const handleMicClick = () => {
    if (!speechSupported) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleRecordingCancel = () => {
    abortRecording();
  };

  const handleRecordingConfirm = () => {
    completeRecording();
    // Clear transcript after it's been added to chatInput via onResult
    resetTranscript();
  };

  const removeUploadedFile = async (fileID: string) => {
    await removeFile(fileID);
    setUploadedFile(null);
  };

  const [projectsOpen, setProjectsOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  useEffect(() => {
    const openProjects = () => setProjectsOpen(true);
    window.addEventListener('open-projects', openProjects as EventListener);
    return () => window.removeEventListener('open-projects', openProjects as EventListener);
  }, []);

  // Refresh projects list when sidebar opens
  useEffect(() => {
    if (projectsOpen && isSignedIn) {
      console.log('Sidebar opened - refreshing projects...');
      refreshProjects();
    }
  }, [projectsOpen, isSignedIn]);

  // sidebar show/animation is handled inside ProjectsSidebar component

  const closeProjects = () => {
    setProjectsOpen(false);
    window.dispatchEvent(new Event('close-projects'));
  };

  // Allow page to scroll even when sidebar is open (no body lock)

  return (
    <div className="min-h-screen overflow-y-auto homepage-scrollbar bg-[#FFF9F5]">

      <section className="relative min-h-screen flex items-start justify-center px-6 overflow-hidden pt-24 pb-16 hero-dot-grid">

      <div className="relative z-10 max-w-6xl w-full mx-auto">
        {/* Ambient orange glow */}
        <div className="absolute -top-20 right-0 w-[600px] h-[600px] rounded-full bg-[#ff5600] opacity-[0.04] blur-[100px] pointer-events-none" aria-hidden="true" />

        {/* Two-zone hero layout */}
        <div className="relative flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_auto] items-start gap-0 mb-8">

          {/* Left zone: editorial headline */}
          <motion.div
            className="lg:col-start-1 lg:pr-16 pt-4 max-w-[560px]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-[#ff5600] mb-5">
              AI-Powered Analytics
            </p>
            <h1 className="font-outfit text-5xl md:text-6xl xl:text-[80px] font-bold leading-[1.03] tracking-[-0.02em] text-foreground mb-6">
              Turn data into<br />
              <span className="bg-gradient-to-r from-[#ff5600] via-[#ff8c42] to-[#ff5600] bg-clip-text text-transparent">
                living dashboards
              </span>
              <br />in minutes.
            </h1>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Describe what you want. Morpheus builds it — charts, metrics, and insights — instantly.
            </p>
            <div className="flex items-center gap-3 mt-8 pt-6 border-t border-border/30">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff8c42] to-[#ff5600] border-2 border-[#FFF9F5]" />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">500+</span> teams already building dashboards
              </p>
            </div>
          </motion.div>

          {/* Right zone: bento chart preview (desktop only) */}
          <motion.div
            className="hidden lg:block flex-shrink-0 relative"
            style={{ width: 'clamp(380px, 36vw, 500px)', marginRight: '-2vw' }}
            initial={{ opacity: 0, x: 48, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#FFF9F5] to-transparent pointer-events-none z-10" />
            <BentoChartPreview />
          </motion.div>
        </div>

        {/* Chat-First Interface */}
        <motion.div
          className="w-full max-w-sm sm:max-w-xl md:max-w-2xl lg:max-w-none mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Main Chat Input */}
          <div className="w-full min-h-[80px] text-md p-3 sm:p-4 bg-white border border-border/50 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-shadow duration-200 focus-within:border-[#ff5600]/30 focus-within:shadow-[0_4px_28px_rgba(255,86,0,0.12),0_0_0_1.5px_rgba(255,86,0,0.18)]">

            {/* File Chip Area — compact dismissable pill */}
            <AnimatePresence>
              {uploadedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2 }}
                  className="mb-3"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#fff5f0] border border-[#ff5600]/20 rounded-full text-xs text-foreground">
                    <FileText className="w-3.5 h-3.5 text-[#ff5600] flex-shrink-0" />
                    <span className="truncate max-w-[160px] font-medium">{uploadedFile.filename}</span>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      uploadedFile.status === 'uploading' ? 'bg-yellow-500' :
                      uploadedFile.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                      uploadedFile.status === 'processed' ? 'bg-green-500' :
                      uploadedFile.status === 'error' ? 'bg-red-500' : 'bg-green-500'
                    }`} />
                    <button
                      onClick={() => removeUploadedFile(uploadedFile.fileID)}
                      className="text-muted-foreground hover:text-foreground transition-colors ml-0.5 flex-shrink-0"
                      aria-label="Remove file"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

           {/* Textarea Row */}
            <div className="relative mb-4">
              {/* Animated cross-fading placeholder */}
              {!inputValue && !isListening && (
                <div className="absolute left-0 top-0 pointer-events-none select-none overflow-hidden" style={{ lineHeight: '1.75rem' }}>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={placeholderIndex}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="block text-lg text-muted-foreground/50"
                    >
                      {placeholders[placeholderIndex]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}
              <TextareaAutosize
                minRows={3}
                maxRows={10}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder=""
                className="w-full bg-transparent border-none outline-none resize-none text-lg placeholder:text-muted-foreground/60 caret-[#ff5600]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit();
                  }
                }}
                autoFocus
              />
            </div>
            
            {/* Recording Bar - Positioned between textarea and buttons */}
            <RecordingBar 
              isVisible={isListening}
              detectedLanguage={detectedLanguage}
              onCancel={handleRecordingCancel}
              onConfirm={handleRecordingConfirm}
            />
            
            {/* Template Tag Row - Mobile Only */}
            {selectedTemplate && (
              <div className="flex justify-start mb-3 lg:hidden">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted border border-border text-foreground">
                  <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                    <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                  </div>
                  <span className="text-sm font-medium">{selectedTemplate.title}</span>
                  <button
                    onClick={handleTemplateRemove}
                    className="w-4 h-4 flex items-center justify-center hover:bg-muted-foreground/20 rounded-sm transition-colors"
                    aria-label="Remove template"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            )}
            
            {/* Buttons Row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Left side buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Select file"
                />

                {/* Attach Button */}
                <button
                  onClick={handleAttachClick}
                  disabled={uploadState.isUploading}
                  className="px-3 py-1.5 text-sm button-outline text-foreground rounded-md disabled:opacity-50 flex items-center gap-2"
                  onMouseEnter={(e) => {
                    if (!uploadState.isUploading) {
                      e.currentTarget.classList.add('btn-primary-hover');
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.classList.remove('btn-primary-hover');
                  }}
                  aria-label="Attach file"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">{uploadState.isUploading ? 'Uploading...' : 'Attach'}</span>
                </button>

                {/* Clone Template Button */}
                <button
                  onClick={handleCloneTemplateClick}
                  className="px-3 py-1.5 text-sm button-outline text-foreground rounded-md flex items-center gap-2"
                  onMouseEnter={(e) => {
                    e.currentTarget.classList.add('btn-primary-hover');
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.classList.remove('btn-primary-hover');
                  }}
                  aria-label="Clone template"
                >
                  <LayoutTemplate className="w-4 h-4" />
                  <span className="hidden sm:inline">Template</span>
                </button>

                {/* Connect Data Source Dropdown */}
                <div className="relative data-source-dropdown">
                  <Button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={`rounded-md transition-all duration-200 px-4 py-1.5 text-sm flex items-center gap-2 h-auto ${
                      selectedDataSource 
                        ? `${getDataSourceColors(selectedDataSource).bg} ${getDataSourceColors(selectedDataSource).border} ${getDataSourceColors(selectedDataSource).text} ${getDataSourceColors(selectedDataSource).hover} border`
                        : 'button-gradient'
                    }`}
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                    aria-label="Connect data source"
                  >
                    <span className="hidden sm:inline">{selectedDataSource || "Connect data source"}</span>
                    <Link className={`w-4 h-4 transition-transform duration-200 ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`} />
                  </Button>
                  
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-background/95 backdrop-blur-sm border border-border/30 rounded-lg shadow-lg z-10">
                      <div className="py-1">
                        {connectors.map((connector) => (
                          <button
                            key={connector.name}
                            onClick={() => handleDataSourceSelect(connector.name)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors duration-200 flex items-center gap-2"
                          >
                            <img src={connector.icon} alt={connector.name} className="w-4 h-4 object-cover" />
                            {connector.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Template Tag - Desktop Only */}
                {selectedTemplate && (
                  <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted border border-border text-foreground">
                    <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                      <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                    </div>
                    <span className="text-sm font-medium">{selectedTemplate.title}</span>
                    <button
                      onClick={handleTemplateRemove}
                      className="w-4 h-4 flex items-center justify-center hover:bg-muted-foreground/20 rounded-sm transition-colors"
                      aria-label="Remove template"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Right side buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleChatSubmit}
                  disabled={!inputValue.trim() || isProcessing}
                  className="button-gradient p-3 disabled:bg-muted-foreground border-2 border-[#ff5600]/30 shadow-sm"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-border border-t-foreground rounded-full animate-spin"></div>
                      <span className="text-sm">Processing...</span>
                    </div>
                  ) : (
                    <CornerRightUp className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Action cards — 3-column grid */}
          <div className="mt-4 sm:mt-5 animate-fade-in w-full">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:gap-3">

              {/* Upload */}
              <motion.button
                variants={{ hidden: { opacity: 0, y: 16, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { delay: 0.55, duration: 0.45, ease: [0.16, 1, 0.3, 1] as any } } }}
                initial="hidden"
                animate="show"
                whileHover={{ y: -2 }}
                onClick={handleAttachClick}
                className="flex items-center gap-3 p-4 bg-white border border-border/40 rounded-xl hover:border-[#ff5600]/30 hover:shadow-[0_2px_12px_rgba(255,86,0,0.08)] transition-all duration-200 text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff5600]/15 to-[#ff5600]/5 border border-[#ff5600]/10 flex items-center justify-center group-hover:from-[#ff5600]/25 group-hover:to-[#ff5600]/10 transition-all duration-200 flex-shrink-0">
                  <Upload className="w-4 h-4 text-[#ff5600]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Upload a file</p>
                  <p className="text-xs text-muted-foreground">CSV, Excel, JSON up to 50MB</p>
                </div>
              </motion.button>

              {/* Connect data source */}
              <div className="relative data-source-dropdown-hero">
                <motion.button
                  variants={{ hidden: { opacity: 0, y: 16, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { delay: 0.63, duration: 0.45, ease: [0.16, 1, 0.3, 1] as any } } }}
                  initial="hidden"
                  animate="show"
                  whileHover={{ y: -2 }}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center gap-3 p-4 bg-white border border-border/40 rounded-xl hover:border-[#ff5600]/30 hover:shadow-[0_2px_12px_rgba(255,86,0,0.08)] transition-all duration-200 text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff5600]/15 to-[#ff5600]/5 border border-[#ff5600]/10 flex items-center justify-center group-hover:from-[#ff5600]/25 group-hover:to-[#ff5600]/10 transition-all duration-200 flex-shrink-0">
                    <Link className="w-4 h-4 text-[#ff5600]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Connect source</p>
                    <p className="text-xs text-muted-foreground truncate">Sheets, GA4, Meta…</p>
                  </div>
                </motion.button>
                {dropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-border/30 rounded-xl shadow-lg z-10 py-1">
                    {connectors.map((connector) => (
                      <button
                        key={connector.name}
                        onClick={() => handleDataSourceSelect(connector.name)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60 flex items-center gap-2 transition-colors"
                      >
                        <img src={connector.icon} alt={connector.name} className="w-4 h-4 object-cover" />
                        {connector.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Try sample */}
              <motion.button
                variants={{ hidden: { opacity: 0, y: 16, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { delay: 0.71, duration: 0.45, ease: [0.16, 1, 0.3, 1] as any } } }}
                initial="hidden"
                animate="show"
                whileHover={isDemoLoading ? {} : { y: -2 }}
                onClick={handleTrySample}
                disabled={isDemoLoading}
                className="flex items-center gap-3 p-4 bg-white border border-border/40 rounded-xl hover:border-[#ff5600]/30 hover:shadow-[0_2px_12px_rgba(255,86,0,0.08)] transition-all duration-200 text-left group disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff5600]/15 to-[#ff5600]/5 border border-[#ff5600]/10 flex items-center justify-center group-hover:from-[#ff5600]/25 group-hover:to-[#ff5600]/10 transition-all duration-200 flex-shrink-0">
                  {isDemoLoading
                    ? <div className="w-4 h-4 border-2 border-[#ff5600]/30 border-t-[#ff5600] rounded-full animate-spin" />
                    : <Sparkles className="w-4 h-4 text-[#ff5600]" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{isDemoLoading ? 'Loading...' : 'Try sample'}</p>
                  <p className="text-xs text-muted-foreground truncate">{isDemoLoading ? 'Uploading demo data' : 'Demo data'}</p>
                </div>
              </motion.button>

            </div>
          </div>
        </motion.div>
      </div>
      {/* Sentinel marks the end of the hero section for header trigger */}
      <div id="hero-sentinel" aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-px pointer-events-none" />
    </section>

    {/* Removed floating button here; header provides the button when signed in */}

    {/* Projects sidebar */}
    <ProjectsSidebar
      open={projectsOpen}
      onClose={closeProjects}
      onNewProject={handleNewProject}
      recents={projects}
      onOpenProject={openProject}
      onRenameProject={renameProject}
      onDeleteProject={deleteProject}
    />
    <TemplateModal
      open={templateModalOpen}
      onClose={() => setTemplateModalOpen(false)}
      onTemplateSelect={handleTemplateSelect}
    />
    <FooterSection />
    {/* Waitlist modal for signed-out users */}
    <Dialog open={waitlistOpen} onOpenChange={setWaitlistOpen}>
      <DialogContent className="bg-muted border border-border rounded-lg sm:rounded-xl p-5 sm:p-6 w-full max-w-[92vw] sm:max-w-xl">
        <DialogTitle className="text-2xl md:text-3xl font-semibold text-foreground">Join the waitlist to get early access</DialogTitle>
        <DialogDescription className="text-muted-foreground mt-1 text-sm md:text-base">
          Be among the first to try Morpheus when it's ready.
        </DialogDescription>
        <div className="mt-6 flex items-center gap-4">
          <img src="/logo-watermark.png" alt="Morpheus" className="w-16 h-16 rounded-md object-contain bg-transparent" />
          <div className="ml-auto">
            <Button
              onClick={() => { setWaitlistOpen(false); navigate('/waitlist'); }}
              className="button-gradient text-[#1F2937] px-5 py-2 rounded-[4px]"
            >
              Go to waitlist
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

  </div>
);
};

export default HomePage;