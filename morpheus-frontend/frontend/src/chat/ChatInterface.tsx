import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, ResponsiveContainer } from "recharts";
import { CornerRightUp, Upload, User, Sparkles, BarChart3, Database, TrendingUp, Users, DollarSign, ChevronDown, ChevronUp, ChevronRight, Link, Mic, MicOff, FileText, LayoutTemplate, Square, Copy } from "lucide-react";
import { CONNECTORS } from "@/constants/connectors";
import TextareaAutosize from 'react-textarea-autosize';
import RecordingBarSidebar from '@/components/ui/recording-bar-sidebar';
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { fileService, type UploadResponse } from "@/services/fileService";
import { useToast } from "@/hooks/use-toast";
import { useChatStore } from "@/chat/useChatStore";
import { useFileStore } from "@/chat/useFileStore";
import TemplateModal from "@/components/homepage-section/TemplateModal";

// Helper function to map workflow-status step values to display text
const mapStepToDisplayText = (step: string): string => {
  const stepMap: Record<string, string> = {
    "load_conversation": "Loading conversation...",
    "download_asset": "Downloading file...",
    "run_workflow": "Running workflow...",
  };
  return stepMap[step] || "Processing...";
};

const DEMO_CHART_DATA = [
  { v: 40 }, { v: 65 }, { v: 52 }, { v: 80 }, { v: 71 }, { v: 90 },
];

// Rolling multiline log for loading animation
interface RollingTextProps {
  isActive: boolean;
  stopSignal: boolean;
  successText?: string;
  currentStep?: string | null;
}

const RollingText = ({ isActive, stopSignal, successText = "", currentStep = null }: RollingTextProps) => {
  const [lines, setLines] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [stopped, setStopped] = useState(false);
  const prevStepRef = useRef<string | null>(null);

  // Start when becoming active the first time
  useEffect(() => {
    if (!started && isActive) {
      setStarted(true);
      setStopped(false);
      setLines([]);
      prevStepRef.current = null;
    }
  }, [isActive, started]);

  // Watch for currentStep changes and add new line when step changes
  useEffect(() => {
    if (!started || stopped) return;
    
    if (currentStep && currentStep !== prevStepRef.current) {
      const displayText = mapStepToDisplayText(currentStep);
      setLines((prev) => {
        // Check if last line is different to avoid duplicates
        const lastLine = prev[prev.length - 1];
        if (lastLine !== displayText) {
          // Keep all historical lines (limit to last 20 to prevent memory issues)
          return [...prev, displayText].slice(-20);
        }
        return prev;
      });
      prevStepRef.current = currentStep;
    }
  }, [currentStep, started, stopped]);

  // Stop when stopSignal becomes true
  useEffect(() => {
    if (started && !stopped && stopSignal) {
      setStopped(true);
      setLines((prev) => [...prev, successText].slice(-20));
    }
  }, [stopSignal, started, stopped, successText]);

  // Render nothing until started
  if (!started && lines.length === 0) return null;

  return (
    <div className="space-y-1 text-foreground">
      {lines.map((line, i) => {
        const isLast = i === lines.length - 1 && !stopped;
        return (
          <div
            key={`${i}-${line}`}
            className={`text-sm animate-fade-in-300 ${isLast ? 'active-breathing text-gradient-sweep caret' : 'text-foreground/90'}`}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};

interface ChatInterfaceProps {
  projectId?: string;
  onProcessedDataChange?: (data: any) => void;
  onSwitchToDashboard?: () => void;
}

const ChatInterface = ({ projectId, onProcessedDataChange, onSwitchToDashboard }: ChatInterfaceProps) => {
  // Template state
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(new Set());

  // Zustand stores
  const {
    inputValue,
    isTyping,
    isProcessing,
    messages,
    uploadedFile,
    dropdownOpen,
    selectedDataSource,
    isListening,
    detectedLanguage,
    selectedTemplate,
    currentWorkflowStep,
    setInputValue,
    setIsTyping,
    setMessages,
    addMessage,
    setUploadedFile,
    setDropdownOpen,
    setSelectedDataSource,
    setIsListening,
    setTranscript,
    setDetectedLanguage,
    setSelectedTemplate,
    sendMessage,
    clearInput,
    processFileWithMessage,
    stopGeneration
  } = useChatStore();
  
  const {
    attachedCsvName,
    attachedCsvSummary,
    attachedCsvRaw,
    uploadState,
    setAttachedCsvName,
    setAttachedCsvSummary,
    setAttachedCsvRaw,
    uploadFile,
    removeFile,
    parseCsvToSummary,
    readCsvRawPreview,
    clearAttachment,
    validateClientFile
  } = useFileStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Speech recognition hook
  const {
    isSupported: speechSupported,
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

  // (removed store token listener)

  // Also listen to a global event to open the file picker directly
  useEffect(() => {
    const handler = () => {
      fileInputRef.current?.click();
    };
    window.addEventListener('nyx:open-file-picker', handler as EventListener);
    return () => window.removeEventListener('nyx:open-file-picker', handler as EventListener);
  }, []);

  // Connectors array for data source dropdown
  // Shared connectors list imported above

  const escapeHtml = (unsafe: string): string =>
    unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const parseMessageToHtml = (raw: string): string => {
    let html = escapeHtml(raw);
    // <https://example.com>
    html = html.replace(/&lt;(https?:\/\/[^\s>]+)&gt;/g, (_m, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline">${url}</a>`;
    });
    // [text](url)
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, text, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline">${text}</a>`;
    });
    // **bold**
    html = html.replace(/\*\*([^*]+)\*\*/g, (_m, text) => `<strong>${text}</strong>`);
    // Autolink bare URLs
    html = html.replace(/(^|\s)(https?:\/\/[^\s<]+)(?![^<]*>|[^<>]*<\/_a>)/g, (_m, lead, url) => {
      return `${lead}<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline">${url}</a>`;
    });
    return html;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSend = async (csvSummaryOverride?: string) => {
    if (!inputValue.trim()) return;

    // Delegate adding the user message to the store's process flow to avoid duplicates
    clearInput();
    await processFileWithMessage(inputValue.trim(), onProcessedDataChange, projectId);
  };




  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDataSourceSelect = (source: string) => {
    setSelectedDataSource(source);
    setDropdownOpen(false);
    console.log('Data source selected:', source);
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
    resetTranscript();
  };


  const removeUploadedFile = async (fileID: string) => {
    await removeFile(fileID);
    setUploadedFile(null);
  };



  // Function to get colors for each data source
  const getDataSourceColors = (sourceName: string) => {
    const colors: { [key: string]: { bg: string; border: string; text: string; hover: string } } = {
      "Google Sheets": { bg: "bg-green-500", border: "border-green-400", text: "text-foreground", hover: "hover:bg-green-600" },
      "GA4": { bg: "bg-orange-500", border: "border-orange-400", text: "text-foreground", hover: "hover:bg-orange-600" },
      "Meta": { bg: "bg-blue-600", border: "border-blue-500", text: "text-foreground", hover: "hover:bg-blue-700" },
      "Airtable": { bg: "bg-blue-400", border: "border-blue-300", text: "text-foreground", hover: "hover:bg-blue-500" },
      "Stripe": { bg: "bg-purple-600", border: "border-purple-500", text: "text-foreground", hover: "hover:bg-purple-700" },
      "Shopify": { bg: "bg-green-700", border: "border-green-600", text: "text-foreground", hover: "hover:bg-green-800" },
      "HubSpot": { bg: "bg-orange-600", border: "border-orange-500", text: "text-foreground", hover: "hover:bg-orange-700" },
      "PostgreSQL": { bg: "bg-blue-700", border: "border-blue-600", text: "text-foreground", hover: "hover:bg-blue-800" }
    };
    return colors[sourceName] || { bg: "bg-primary", border: "border-primary", text: "text-foreground", hover: "hover:bg-primary/90" };
  };

  const suggestedPrompts = [
    { text: "Act as a Data Analyst: challenge assumptions and list caveats.", icon: Database },
    { text: "Act as a Growth PM: prioritize the top 3 actions from this data.", icon: TrendingUp },
    { text: "Act as a Sales Ops lead: translate insights into pipeline plays.", icon: BarChart3 },
    { text: "Build a comprehensive dashboard from connected data", icon: Users },
    { text: "Analyze profit margins by product", icon: DollarSign },
    { text: "Add geographic revenue distribution", icon: Sparkles }
  ];

  return (
    <div className="flex flex-col h-full min-h-0 bg-muted">

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-4">
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          const isSystem = message.role === "system";
          const bubbleLayoutClass = isUser ? "flex-row-reverse" : "flex-row";
          const avatarClass = isUser
            ? "bg-muted"
            : isSystem
              ? "bg-muted border border-border"
              : "bg-transparent";
          const bubbleBgClass = isUser
            ? "bg-muted p-3"
            : isSystem
              ? "bg-muted p-3 border border-border"
              : "bg-transparent p-0";
          return (
            <div key={message.id} className="space-y-1">
              <div
                className={`chat-enter flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[90%] min-w-0 overflow-hidden group relative`}>
                  {/* Role label for assistant */}
                  {!isUser && !isSystem && (
                    <span className="block text-[10px] font-semibold tracking-widest uppercase text-[#ff5600] mb-1 ml-1">
                      Morpheus
                    </span>
                  )}

                  <div className={`text-sm whitespace-pre-wrap break-words min-w-0 overflow-hidden ${
                    isUser
                      ? "bg-[#f5f5f5] border border-border/40 rounded-2xl rounded-tr-sm px-4 py-3"
                      : isSystem
                        ? "bg-muted border border-border/40 px-3 py-2 rounded-lg"
                        : "bg-transparent p-0"
                  }`}>
                    {message.attachment && (
                      <div className="mb-2 overflow-hidden">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (uploadedFile?.fileID) {
                              window.open(`/api/v1/files/preview/${uploadedFile.fileID}`, '_blank');
                            }
                          }}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && uploadedFile?.fileID) {
                              window.open(`/api/v1/files/preview/${uploadedFile.fileID}`, '_blank');
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md border-2 border-[#ff5600]/30 bg-[#ffede2] text-[11px] text-foreground/90 overflow-hidden cursor-pointer hover:bg-[#ffe4d4] transition-colors shadow-sm"
                          title={message.attachment.name}
                          aria-label="Attached file — click to preview"
                        >
                          <FileText className="w-3.5 h-3.5 flex-shrink-0 text-[#ff5600]" />
                          <span className="truncate min-w-0">{message.attachment.name}</span>
                        </div>
                      </div>
                    )}
                    {message.template && (
                      <div className="mb-2 overflow-hidden">
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#ff5600]/15 bg-[#ffede2] text-[11px] text-foreground/90 overflow-hidden"
                          title={message.template.title}
                          aria-label="Selected template"
                        >
                          <LayoutTemplate className="w-3.5 h-3.5 flex-shrink-0 text-[#ff5600]" />
                          <span className="truncate min-w-0">{message.template.title}</span>
                        </div>
                      </div>
                    )}
                    {message.role === 'assistant' && message.dashboardCard ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as any }}
                        role="button"
                        tabIndex={0}
                        aria-label="Open dashboard"
                        onClick={() => { onSwitchToDashboard && onSwitchToDashboard(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onSwitchToDashboard && onSwitchToDashboard(); } }}
                        className="group w-full rounded-2xl border border-[#ff5600]/20 bg-gradient-to-br from-[#fff5f0] to-white overflow-hidden cursor-pointer hover:border-[#ff5600]/40 hover:shadow-[0_4px_20px_rgba(255,86,0,0.12)] transition-all duration-200 select-none"
                      >
                        <div className="h-16 px-3 pt-2 opacity-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={DEMO_CHART_DATA} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                              <Bar dataKey="v" fill="#ff5600" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="px-3 pb-3 pt-1.5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-foreground">Dashboard ready</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[160px]">
                              Source: {message.dashboardCard.sourceFileName}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[#ff5600] font-medium group-hover:gap-2 transition-all duration-150">
                            Open <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      (() => {
                        const lineCount = message.content.split('\n').length;
                        const isLong = lineCount > 10 || message.content.length > 600;
                        const isExpanded = expandedMessageIds.has(message.id);
                        return (
                          <div className="relative">
                            <div
                              className={`leading-relaxed whitespace-pre-wrap break-words [word-break:normal] [hyphens:none] [overflow-wrap:anywhere] transition-all duration-300 ${isLong && !isExpanded ? 'max-h-[15em] overflow-hidden' : ''}`}
                              dangerouslySetInnerHTML={{ __html: parseMessageToHtml(message.content) }}
                            />
                            {/* Streaming cursor for the last assistant message while typing */}
                            {message.role === 'assistant' && isTyping && index === messages.length - 1 && (
                              <motion.span
                                animate={{ opacity: [1, 0, 1] }}
                                transition={{ repeat: Infinity, duration: 1, ease: "steps(2, jump-none)" as any }}
                                className="inline-block w-[2px] h-[1em] bg-[#ff5600] ml-[2px] align-middle rounded-full"
                              />
                            )}
                            {isLong && !isExpanded && (
                              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-muted to-transparent pointer-events-none" />
                            )}
                          </div>
                        );
                      })()
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-1">
                        {message.content && (() => {
                          const lineCount = message.content.split('\n').length;
                          const isLong = lineCount > 10 || message.content.length > 600;
                          const isMessageExpanded = expandedMessageIds.has(message.id);
                          if (!isLong || message.dashboardCard) return null;
                          return (
                            <button
                              onClick={() => {
                                setExpandedMessageIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(message.id)) next.delete(message.id);
                                  else next.add(message.id);
                                  return next;
                                });
                              }}
                              className="flex items-center gap-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                              title={isMessageExpanded ? 'Collapse' : 'Expand'}
                              type="button"
                            >
                              <span className="text-[10px]">{isMessageExpanded ? 'Show less' : 'Show more'}</span>
                              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isMessageExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          );
                        })()}
                        {message.content && !message.dashboardCard && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(message.content);
                              toast({ title: "Copied", description: "Message copied to clipboard" });
                            }}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy message"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Inline Rolling Text under the last user message that started analysis */}
              {message.role === 'user'
                && index === messages.length - 1
                && uploadedFile
                && (isProcessing || uploadedFile.status === 'processing') && (
                  <div className={`flex justify-start mt-1`}>
                    <div className={`ml-8`}>
                      <RollingText
                        isActive={isProcessing || uploadedFile.status === 'processing'}
                        stopSignal={uploadedFile.status === 'processed' || (!isProcessing && !isTyping)}
                        successText=""
                        currentStep={currentWorkflowStep}
                      />
                    </div>
                  </div>
              )}
            </div>
        )})}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length <= 1 && (
        <div className="mt-auto">
          <p className="text-xs mx-2 text-muted-foreground mb-2">Quick starts:</p>
          <div className="flex flex-wrap w-full items-start gap-2 mx-2 pr-3 overflow-hidden">
            {suggestedPrompts.slice(0, 4).map((prompt, index) => (
              <button
                key={index}
                onClick={() => setInputValue(prompt.text)}
                className="inline-flex self-start px-2 py-1 text-xs text-muted-foreground/85 border border-border rounded-[1px] hover:bg-black/80 hover:text-white transition-all duration-200 text-left whitespace-normal break-words leading-snug overflow-hidden box-border max-w-full"
              >
                <span className="block min-w-0 break-words">{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Area: File chip + Input */}
      <div className="mt-auto">
        {/* File chip — dismissable pill above input */}
        <AnimatePresence>
          {uploadedFile && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="mx-2 mt-3 mb-1"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#fff5f0] border border-[#ff5600]/20 rounded-full text-xs text-foreground">
                <FileText className="w-3.5 h-3.5 text-[#ff5600] flex-shrink-0" />
                <span className="truncate max-w-[140px] font-medium">{uploadedFile.filename}</span>
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

        {/* Input Area */}
        <div className="m-2">
        {/* Glass pill input */}
        <div className="w-full min-h-[60px] text-sm p-3 pb-2 bg-white/80 backdrop-blur-xl border border-border/30 rounded-2xl resize-none transition-all duration-200 focus-within:border-[#ff5600]/30 focus-within:shadow-[0_2px_16px_rgba(255,86,0,0.10)] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          {/* Textarea Row */}
          <div className="relative mb-3">
            <TextareaAutosize
              minRows={1}
              maxRows={6}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isListening ? 'Listening...' : "Describe your dashboard..."}
              className="w-full bg-transparent border-none outline-none resize-none text-sm placeholder:text-muted-foreground/60 caret-[#ff5600]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          
          {/* Recording Bar - Positioned between textarea and buttons */}
          <RecordingBarSidebar 
            isVisible={isListening}
            detectedLanguage={detectedLanguage}
            onCancel={handleRecordingCancel}
            onConfirm={handleRecordingConfirm}
          />
          
          {/* Template Tag Row */}
          {selectedTemplate && (
            <div className="flex justify-start mb-1">
              <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-muted border border-border text-foreground">
                <div className="w-3 h-3 grid grid-cols-2 gap-0.5">
                  <div className="w-1 h-1 bg-white rounded-sm"></div>
                  <div className="w-1 h-1 bg-white rounded-sm"></div>
                  <div className="w-1 h-1 bg-white rounded-sm"></div>
                  <div className="w-1 h-1 bg-white rounded-sm"></div>
                </div>
                <span className="text-xs font-medium">{selectedTemplate.title}</span>
                <button
                  onClick={handleTemplateRemove}
                  className="w-3 h-3 flex items-center justify-center hover:bg-muted-foreground/20 rounded-sm transition-colors"
                  aria-label="Remove template"
                >
                  <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {/* Buttons Row */}
          <div className="flex items-center justify-between">
            {/* Left side - File Upload and Data Connector Buttons */}
            <div className="flex items-center gap-1.5">
              {/* Upload Button - Icon only */}
              <button
                onClick={handleFileUpload}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-[#ff5600]/10 hover:text-[#ff5600] transition-all duration-150"
                aria-label="Attach file"
              >
                <Upload className="w-4 h-4" />
              </button>

              {/* Template Button */}
              <button
                onClick={handleCloneTemplateClick}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-[#ff5600]/10 hover:text-[#ff5600] transition-all duration-150"
                aria-label="Choose template"
              >
                <LayoutTemplate className="w-4 h-4" />
              </button>

              {/* Data Connector Dropup */}
              <div className="relative data-source-dropdown">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`w-8 h-8 flex items-center justify-center gap-1 rounded-lg transition-all duration-150 ${
                    selectedDataSource
                      ? `${getDataSourceColors(selectedDataSource).bg} ${getDataSourceColors(selectedDataSource).border} ${getDataSourceColors(selectedDataSource).text} border`
                      : 'text-muted-foreground hover:bg-[#ff5600]/10 hover:text-[#ff5600]'
                  }`}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  aria-label="Connect data source"
                >
                  <Link className="w-4 h-4" />
                  <ChevronUp className={`w-3 h-3 transition-transform duration-200 ${
                    selectedDataSource ? 'text-foreground' : 'text-muted-foreground'
                  } ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {dropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-1 w-48 bg-background/95 backdrop-blur-sm border border-border/30 rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      {CONNECTORS.map((connector) => (
                        <button
                          key={connector.name}
                          onClick={() => handleDataSourceSelect(connector.name)}
                          className="w-full px-3 py-2 text-left text-sm flex items-center gap-2"
                        >
                          <img src={connector.icon} alt={connector.name} className="w-4 h-4 object-cover" />
                          {connector.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right side - Send Button */}
            <div className="flex gap-2">
              {(isProcessing || uploadedFile?.status === 'processing') ? (
                <Button
                  onClick={() => stopGeneration()}
                  className="button-gradient text-[#1F2937] p-2.5 rounded-xl"
                >
                  <Square className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isTyping}
                  className="button-gradient p-2.5 rounded-xl disabled:bg-black border border-[#ff5600]/20 shadow-sm"
                >
                  <CornerRightUp className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json,.xlsx,.xls"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
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

              const res: UploadResponse = await fileService.uploadFile(file, { projectId: projectId ?? undefined });
              if (!res.success || !res.fileID || res.asset?.status !== 'uploaded') {
                setUploadedFile({ ...newFile, status: 'error' });
                toast({
                  title: "Upload failed",
                  description: res.error || `Unexpected upload status: ${res.asset?.status ?? 'unknown'}`,
                  variant: "destructive"
                });
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
              try {
                // Persist original file for CSV export if it's CSV
                if ((file.name.split('.').pop() || '').toLowerCase() === 'csv') {
                  // store in chat store for export
                  // lazy import to avoid circulars
                  const { useChatStore } = await import('@/chat/useChatStore');
                  useChatStore.getState().setOriginalFile({ blob: file, name: file.name });
                } else {
                  const { useChatStore } = await import('@/chat/useChatStore');
                  useChatStore.getState().setOriginalFile(null);
                }
              } catch (_err) {}
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
          }}
        />
      </div>

      {/* Template Modal */}
      <TemplateModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onTemplateSelect={handleTemplateSelect}
      />
    </div>
  );
};

export default ChatInterface;