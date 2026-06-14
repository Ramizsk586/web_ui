import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  HelpCircle, 
  Cpu, 
  Settings, 
  RefreshCw, 
  Layers, 
  AlertCircle,
  Play,
  Square,
  Check,
  Terminal,
  Copy,
  ExternalLink,
  ChevronRight,
  Loader2,
  Sliders,
  Sparkles,
  Gauge,
  Zap,
  TrendingUp,
  Info
} from 'lucide-react';

interface LocalModelConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: { id: string; name: string } | null;
  onLoadModel: (config: any) => void;
  showToast: (msg: string) => void;
}

export const LocalModelConfigModal: React.FC<LocalModelConfigModalProps> = ({
  isOpen,
  onClose,
  model,
  onLoadModel,
  showToast
}) => {
  if (!isOpen || !model) return null;

  // Persisted state key
  const storageKey = `lumina_model_settings_${model.id}`;

  // Current sub-view: 'config' vs 'serverGuide'
  const [setupStep, setSetupStep] = useState<'config' | 'serverGuide'>('config');

  // State initialization
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rememberSettings, setRememberSettings] = useState(true);

  // Core settings state
  const [contextLength, setContextLength] = useState(32768);
  const [gpuOffload, setGpuOffload] = useState(18);
  const [customTotalLayers, setCustomTotalLayers] = useState<number>(() => {
    const idLower = model.id.toLowerCase();
    if (idLower.includes('gemma')) return 28;
    if (idLower.includes('llama-3.2-1b')) return 24;
    if (idLower.includes('minicpm')) return 24;
    if (idLower.includes('qwen2.5-coder-1.5b')) return 32;
    if (idLower.includes('lfm') || idLower.includes('liquid')) return 18;
    return 32;
  });
  const [cpuThreads, setCpuThreads] = useState(8);
  const [evalBatchSize, setEvalBatchSize] = useState(2048);
  const [physicalBatchSize, setPhysicalBatchSize] = useState(512);
  const [maxConcurrent, setMaxConcurrent] = useState(4);
  const [unifiedKVCache, setUnifiedKVCache] = useState(true);
  const [ropeFreqBase, setRopeFreqBase] = useState('Auto');
  const [ropeFreqScale, setRopeFreqScale] = useState('Auto');
  const [offloadKV, setOffloadKV] = useState(true);
  const [keepInMemory, setKeepInMemory] = useState(true);
  const [tryMmap, setTryMmap] = useState(true);
  const [flashAttn, setFlashAttn] = useState(true);
  const [seed, setSeed] = useState('Random Seed');
  const [kCacheQuant, setKCacheQuant] = useState('q8_0');
  const [vCacheQuant, setVCacheQuant] = useState('q8_0');

  // Advanced Universal llama.cpp GPU Offload Calculator Settings
  const [vramSizeGb, setVramSizeGb] = useState<number>(12);
  const [backendType, setBackendType] = useState<'CUDA' | 'Vulkan' | 'Metal' | 'ROCm'>('CUDA');
  const [gpuCount, setGpuCount] = useState<number>(1);
  const [tensorSplit, setTensorSplit] = useState<string>('100');
  const [quantType, setQuantType] = useState<string>(() => {
    const fn = model.id.toLowerCase();
    if (fn.includes('q4_k_m')) return 'Q4_K_M';
    if (fn.includes('q8_0')) return 'Q8_0';
    if (fn.includes('q5_k_m')) return 'Q5_K_M';
    if (fn.includes('q3_k_l') || fn.includes('q3_k_m')) return 'Q3_K_M';
    if (fn.includes('fp16')) return 'FP16';
    return 'Q4_K_M';
  });
  const [archOverride, setArchOverride] = useState<string>('Auto');
  const [calcMode, setCalcMode] = useState<'Auto Calculate' | 'Maximum Safe Offload' | 'Maximum Performance Offload' | 'Balanced Mode' | 'Manual Mode'>('Balanced Mode');
  const [showDebugBreakdown, setShowDebugBreakdown] = useState<boolean>(true);
  const [safetyMarginMb, setSafetyMarginMb] = useState<number>(1024);

  // Path mapping settings state - detect actual OS user
  const [osUser, setOsUser] = useState(() => localStorage.getItem('lumina_local_os_user') || '');

  // Detect actual OS username on mount
  useEffect(() => {
    const detectOsUser = async () => {
      try {
        // First check if we have a saved user
        const saved = localStorage.getItem('lumina_local_os_user');
        if (saved && saved !== 'YOU') {
          setOsUser(saved);
          return;
        }
        
        // Try to get from OS info endpoint
        const osRes = await fetch('/api/os/info');
        if (osRes.ok) {
          const osInfo = await osRes.json();
          if (osInfo?.homeDir) {
            const parts = osInfo.homeDir.replace(/\\/g, '/').split('/');
            const userIndex = parts.indexOf('Users');
            if (userIndex >= 0 && userIndex < parts.length - 1) {
              const detectedUser = parts[userIndex + 1];
              if (detectedUser && detectedUser !== 'YOU') {
                setOsUser(detectedUser);
                localStorage.setItem('lumina_local_os_user', detectedUser);
                return;
              }
            }
          }
        }
      } catch {}
      
      // Fallback: use YOU if detection fails
      setOsUser('YOU');
    };
    
    detectOsUser();
  }, []);
  const [localHost, setLocalHost] = useState(() => localStorage.getItem(`lumina_local_host_${model.id}`) || '127.0.0.1');
  const [localPort, setLocalPort] = useState(() => localStorage.getItem(`lumina_local_port_${model.id}`) || '1234');

  const defaultPathInfo = useMemo(() => {
    let pub = 'publisher';
    let folder = 'ModelName-GGUF';
    let file = 'model-Q4_K_M.gguf';

    if (model.id.includes('/')) {
      const parts = model.id.split('/');
      pub = parts[0];
      const after = parts[1];
      folder = after;
      file = `${after.toLowerCase().replace('-gguf', '')}-Q4_K_M.gguf`;
    }
    return { publisher: pub, modelFolder: folder, modelFile: file };
  }, [model.id]);

  const [modelPublisher, setModelPublisher] = useState(() => localStorage.getItem(`lumina_local_pub_${model.id}`) || defaultPathInfo.publisher);
  const [modelFolder, setModelFolder] = useState(() => localStorage.getItem(`lumina_local_folder_${model.id}`) || defaultPathInfo.modelFolder);
  const [modelFile, setModelFile] = useState(() => localStorage.getItem(`lumina_local_file_${model.id}`) || defaultPathInfo.modelFile);

  // Resolve actual model path: prefer stored path from downloadedModels, fall back to constructed path
  const resolvedModelPath = useMemo(() => {
    try {
      const downloaded = JSON.parse(localStorage.getItem('lumina_downloaded_models') || '[]');
      const match = downloaded.find((m: any) => m.id === model.id);
      if (match?.path) return match.path.replace(/\\/g, '/');
    } catch {}
    return `C:/Users/${osUser || 'skabd'}/.lumina/models/${modelPublisher}/${modelFolder}/${modelFile}`;
  }, [model.id, modelPublisher, modelFolder, modelFile, osUser]);

  // Detect model capabilities from model ID/name keywords
  const detectedCapabilities = useMemo(() => {
    const combined = (model.id + ' ' + model.name).toLowerCase();
    const isVision = /vlm|vision|\bvl\b|llava|clip|moondream|smolvlm|minicpm-v|qwen-vl|internvl|cogvlm|paligemma|idefics|bakllava|fuyu/.test(combined);
    const isVideo = /video/.test(combined);
    const isAudio = /\baudio\b|whisper|\bspeech\b|\basr\b|\btts\b|wav2vec/.test(combined);
    return { isVision, isVideo, isAudio, isMultimodal: isVision || isVideo || isAudio };
  }, [model.id, model.name]);

  // Projector file found — check downloads list AND scan disk via server
  const [foundProjectorPath, setFoundProjectorPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const findProjector = async () => {
      // 1. Check lumina_downloaded_models list first (fast, synchronous)
      try {
        const downloaded = JSON.parse(localStorage.getItem('lumina_downloaded_models') || '[]');
        const match = downloaded.find((m: any) => m.id === model.id);
        if (match?.path) {
          const sep = match.path.includes('\\') ? '\\' : '/';
          const dir = match.path.substring(0, match.path.lastIndexOf(sep));
          const files = downloaded.filter((m: any) => m.path && (m.path.startsWith(dir + '\\') || m.path.startsWith(dir + '/')));
          const projFile = files.find((m: any) => {
            const f = (m.file || m.path?.split(/[\\/]/).pop() || '').toLowerCase();
            return f.includes('mmproj') || f.includes('projector');
          });
          if (projFile?.path) {
            if (!cancelled) setFoundProjectorPath(projFile.path.replace(/\\/g, '/'));
            return;
          }
        }
      } catch {}

      // 2. Ask server to scan the model's actual directory on disk
      try {
        const res = await fetch('/api/llama/find-mmproj', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelPath: resolvedModelPath }),
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setFoundProjectorPath(data.found ? data.path : null);
          return;
        }
      } catch {}

      if (!cancelled) setFoundProjectorPath(null);
    };

    findProjector();
    return () => { cancelled = true; };
  }, [model.id, resolvedModelPath]);

  // Suggested projector path based on naming conventions (may not exist yet)
  const suggestedProjectorPath = useMemo(() => {
    const modelDir = resolvedModelPath.substring(0, resolvedModelPath.lastIndexOf('/'));
    const modelBase = resolvedModelPath.substring(resolvedModelPath.lastIndexOf('/') + 1);
    const baseName = modelBase.replace(/[-_](Q\d[^.]*|q\d[^.]*|f16|f32|fp16|fp32)\.gguf$/i, '').replace(/\.gguf$/i, '');
    return `${modelDir}/${baseName}-mmproj-f16.gguf`;
  }, [resolvedModelPath]);

  const [useProjector, setUseProjector] = useState(false);
  const [projectorPath, setProjectorPath] = useState('');
  // Track whether user has manually edited the projector path
  const [projectorPathManual, setProjectorPathManual] = useState(false);

  useEffect(() => {
    if (projectorPathManual) return;
    if (foundProjectorPath) {
      // Actual file found in downloads — enable automatically
      setProjectorPath(foundProjectorPath);
      setUseProjector(true);
    } else if (detectedCapabilities.isMultimodal) {
      // Model name signals vision/video/audio — pre-fill suggested path so user notices it's needed
      setProjectorPath(suggestedProjectorPath);
      setUseProjector(true);
    } else {
      // No projector found and model doesn't appear multimodal — pre-fill but leave disabled
      setProjectorPath(suggestedProjectorPath);
      setUseProjector(false);
    }
  }, [foundProjectorPath, suggestedProjectorPath, detectedCapabilities.isMultimodal, projectorPathManual]);

  // Connection tester state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionState, setConnectionState] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle');
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [visionVerificationState, setVisionVerificationState] = useState<'idle' | 'verifying' | 'active' | 'inactive' | 'error'>('idle');

  // Auto-start state
  const [serverStarting, setServerStarting] = useState(false);
  const [serverPid, setServerPid] = useState<number | null>(null);
  const [serverLog, setServerLog] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverChecking, setServerChecking] = useState(false);

  const checkServerStatus = useCallback(async () => {
    setServerChecking(true);
    try {
      const res = await fetch('/api/llama/status');
      const data = await res.json();
      if (data.running && data.pid) {
        setServerPid(data.pid);
        setConnectionState('connected');
        setServerLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Server already running (PID: ${data.pid})`]);
      } else {
        setServerPid(null);
        setConnectionState('idle');
      }
    } catch {
      // Server endpoint unavailable - keep current state
    } finally {
      setServerChecking(false);
    }
  }, []);

  // Check server status when modal opens or user navigates to serverGuide
  useEffect(() => {
    if (isOpen || setupStep === 'serverGuide') {
      checkServerStatus();
    }
  }, [isOpen, setupStep, checkServerStatus]);

  // GGUF GPU layers recommended auto-tuner state
  const [metadataLoading, setMetadataLoading] = useState(false);
   const [gpuRecommendation, setGpuRecommendation] = useState<{
    vramTotal?: string;
    modelSize?: string;
    totalLayers?: number;
    bytesPerLayer?: string;
    recommendedLayers?: number;
    fullyOffloaded?: boolean;
    architecture?: string;
    name?: string;
    error?: string;
    metadata?: {
      context_length?: number | string | null;
      file_size?: number;
      attention_head_count?: number | null;
      feed_forward_length?: number | null;
    };
  } | null>(null);

  const fetchGpuRecommendation = async () => {
    setMetadataLoading(true);
    try {
      const res = await fetch("/api/llama/gpu-recommendation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ modelPath: resolvedModelPath }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGpuRecommendation(data);

          if (typeof data.recommendedLayers === 'number') {
            if (typeof data.totalLayers === 'number' && data.totalLayers > 0) {
              setCustomTotalLayers(data.totalLayers);
            }
            setGpuOffload(data.recommendedLayers);
          }
        } else {
          setGpuRecommendation({ error: data.error || "Failed to analyze" });
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setGpuRecommendation({ error: errData?.error || `HTTP ${res.status}` });
      }
    } catch (e: any) {
      setGpuRecommendation({ error: e.message });
    } finally {
      setMetadataLoading(false);
    }
  };

  // Run auto-tune on mount / change with a slight edit debounce
  useEffect(() => {
    if (!isOpen || !model) return;
    const timer = setTimeout(() => {
      fetchGpuRecommendation();
    }, 1000);
    return () => clearTimeout(timer);
  }, [isOpen, model.id, modelPublisher, modelFolder, modelFile, osUser]);

  // Load saved settings if any
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.contextLength !== undefined) setContextLength(parsed.contextLength);
        if (parsed.gpuOffload !== undefined) setGpuOffload(parsed.gpuOffload);
        if (parsed.customTotalLayers !== undefined) {
          setCustomTotalLayers(parsed.customTotalLayers);
        } else if (parsed.totalLayers !== undefined) {
          setCustomTotalLayers(parsed.totalLayers);
        } else {
          // Fallback guess
          const idLower = model.id.toLowerCase();
          if (idLower.includes('gemma')) setCustomTotalLayers(28);
          else if (idLower.includes('llama-3.2-1b')) setCustomTotalLayers(24);
          else if (idLower.includes('minicpm')) setCustomTotalLayers(24);
          else if (idLower.includes('qwen2.5-coder-1.5b')) setCustomTotalLayers(32);
          else if (idLower.includes('lfm') || idLower.includes('liquid')) setCustomTotalLayers(18);
          else setCustomTotalLayers(32);
        }
        if (parsed.cpuThreads !== undefined) setCpuThreads(parsed.cpuThreads);
        if (parsed.evalBatchSize !== undefined) setEvalBatchSize(parsed.evalBatchSize);
        if (parsed.physicalBatchSize !== undefined) setPhysicalBatchSize(parsed.physicalBatchSize);
        if (parsed.maxConcurrent !== undefined) setMaxConcurrent(parsed.maxConcurrent);
        if (parsed.unifiedKVCache !== undefined) setUnifiedKVCache(parsed.unifiedKVCache);
        if (parsed.ropeFreqBase !== undefined) setRopeFreqBase(parsed.ropeFreqBase);
        if (parsed.ropeFreqScale !== undefined) setRopeFreqScale(parsed.ropeFreqScale);
        if (parsed.offloadKV !== undefined) setOffloadKV(parsed.offloadKV);
        if (parsed.keepInMemory !== undefined) setKeepInMemory(parsed.keepInMemory);
        if (parsed.tryMmap !== undefined) setTryMmap(parsed.tryMmap);
        if (parsed.flashAttn !== undefined) setFlashAttn(parsed.flashAttn);
        if (parsed.seed !== undefined) setSeed(parsed.seed);
        if (parsed.kCacheQuant !== undefined) setKCacheQuant(parsed.kCacheQuant);
        if (parsed.vCacheQuant !== undefined) setVCacheQuant(parsed.vCacheQuant);
        if (parsed.osUser !== undefined) setOsUser(parsed.osUser);
        if (parsed.localHost !== undefined) setLocalHost(parsed.localHost);
        if (parsed.localPort !== undefined) setLocalPort(parsed.localPort);
        if (parsed.modelPublisher !== undefined) setModelPublisher(parsed.modelPublisher);
        if (parsed.modelFolder !== undefined) setModelFolder(parsed.modelFolder);
        if (parsed.modelFile !== undefined) setModelFile(parsed.modelFile);
      } else {
        // Fallback guess on fresh load / switch
        const idLower = model.id.toLowerCase();
        let defaultLayers = 32;
        if (idLower.includes('gemma')) defaultLayers = 28;
        else if (idLower.includes('llama-3.2-1b')) defaultLayers = 24;
        else if (idLower.includes('minicpm')) defaultLayers = 24;
        else if (idLower.includes('qwen2.5-coder-1.5b')) defaultLayers = 32;
        else if (idLower.includes('lfm') || idLower.includes('liquid')) defaultLayers = 18;
        setCustomTotalLayers(defaultLayers);
        setGpuOffload(defaultLayers); // Default to full offload of that count
      }
    } catch (e) {
      console.warn("Failed to read model configuration settings", e);
    }
  }, [storageKey, model.id]);

  // Determine model details
  const modelSpecs = useMemo(() => {
    const idLower = model.id.toLowerCase();
    let maxTokens = 32768;
    let fallbackSizeGb = 1.6;
    let layersCount = customTotalLayers;

    if (idLower.includes('gemma')) {
      maxTokens = 8192;
      fallbackSizeGb = 2.7;
    } else if (idLower.includes('llama-3.2-1b')) {
      maxTokens = 131072;
      fallbackSizeGb = 1.25;
    } else if (idLower.includes('minicpm')) {
      maxTokens = 8192;
      fallbackSizeGb = 1.15;
    } else if (idLower.includes('qwen2.5-coder-1.5b')) {
      maxTokens = 32768;
      fallbackSizeGb = 1.62;
    } else if (idLower.includes('lfm') || idLower.includes('liquid')) {
      maxTokens = 32768;
      fallbackSizeGb = 0.38;
    }

    // Overwrite with actual parsed metadata if available
    if (gpuRecommendation && !gpuRecommendation.error) {
      if (gpuRecommendation.totalLayers) {
        // We sync customTotalLayers elsewhere or let it be customTotalLayers
      }
      if (gpuRecommendation.modelSize) {
        const sizeMb = parseFloat(gpuRecommendation.modelSize);
        if (!isNaN(sizeMb)) {
          fallbackSizeGb = sizeMb / 1024;
        }
      }
      if (gpuRecommendation.metadata?.context_length) {
        const parsedCtx = Number(gpuRecommendation.metadata.context_length);
        if (!isNaN(parsedCtx) && parsedCtx > 0) {
          maxTokens = parsedCtx;
        }
      }
    }

    return { maxTokens, fallbackSizeGb, layersCount };
  }, [model.id, gpuRecommendation, customTotalLayers]);

  // Limit context length target if it exceeds model-supported bounds
  useEffect(() => {
    if (contextLength > modelSpecs.maxTokens) {
      setContextLength(modelSpecs.maxTokens);
    }
  }, [modelSpecs.maxTokens, contextLength]);

  // Limit GPU Offload layers dynamically to support models of different bounds
  useEffect(() => {
    if (gpuOffload > customTotalLayers) {
      setGpuOffload(customTotalLayers);
    }
  }, [customTotalLayers, gpuOffload]);

  // Handle Dynamic Memory calculation & Universal Llama.cpp offload calculator math
  const memoryUsage = useMemo(() => {
    const totalModelSizeGb = gpuRecommendation?.modelSize
      ? parseFloat(gpuRecommendation.modelSize) / 1024
      : modelSpecs.fallbackSizeGb;
      
    const weightsGb = totalModelSizeGb;

    // 1. Architecture details
    const idLower = model.id.toLowerCase();
    const detectedArch = archOverride !== 'Auto' ? archOverride : 
                     idLower.includes('gemma') ? 'Gemma' : 
                     idLower.includes('llama') ? 'Llama' : 
                     idLower.includes('qwen') ? 'Qwen' : 
                     idLower.includes('deepseek') ? 'DeepSeek' : 
                     idLower.includes('phi') ? 'Phi' : 
                     idLower.includes('yi') ? 'Yi' : 
                     idLower.includes('mistral') ? 'Mistral' : 'Llama';
    
    const profiles: Record<string, any> = {
      Llama: { hiddenDim: 4096, attentionHeads: 32, kvHeads: 8, vocabSize: 128256, expertCount: 0 },
      Mistral: { hiddenDim: 4096, attentionHeads: 32, kvHeads: 8, vocabSize: 32000, expertCount: 0 },
      Gemma: { hiddenDim: 3072, attentionHeads: 8, kvHeads: 8, vocabSize: 256000, expertCount: 0 },
      Qwen: { hiddenDim: 3584, attentionHeads: 28, kvHeads: 4, vocabSize: 152064, expertCount: 0 },
      DeepSeek: { hiddenDim: 7168, attentionHeads: 128, kvHeads: 128, vocabSize: 129280, expertCount: 0, moe: { experts: 256, active: 8 } },
      Phi: { hiddenDim: 3072, attentionHeads: 32, kvHeads: 32, vocabSize: 32064, expertCount: 0 },
      Yi: { hiddenDim: 4096, attentionHeads: 32, kvHeads: 32, vocabSize: 64000, expertCount: 0 },
      'Command-R': { hiddenDim: 8192, attentionHeads: 64, kvHeads: 8, vocabSize: 255000, expertCount: 0 }
    };

    const activeArch = {
      type: detectedArch,
      ...(profiles[detectedArch] || profiles.Llama)
    };

    // Override with scanner data if available
    if (gpuRecommendation?.metadata) {
      if (gpuRecommendation.architecture) {
        activeArch.type = gpuRecommendation.architecture;
      }
      if (gpuRecommendation.metadata.attention_head_count) {
        activeArch.attentionHeads = Number(gpuRecommendation.metadata.attention_head_count);
      }
    }

    // 2. Backend Overhead
    let backendOverheadGb = 0;
    if (backendType === 'CUDA') backendOverheadGb = 1.1 * gpuCount;
    else if (backendType === 'Vulkan') backendOverheadGb = 0.7 * gpuCount;
    else if (backendType === 'Metal') backendOverheadGb = 0.4 * gpuCount;
    else if (backendType === 'ROCm') backendOverheadGb = 1.4 * gpuCount;

    // 3. Compute Buffer Gb
    const headDim = activeArch.hiddenDim / activeArch.attentionHeads || 128;
    const computeBufferMb = (evalBatchSize * activeArch.hiddenDim * 2) / 1e6 + (physicalBatchSize * 512) / 1e3 + (contextLength > 8192 ? (contextLength * 3) / 1000 : 120);
    const computeBufferGb = parseFloat(((computeBufferMb * (customTotalLayers / 32) * (weightsGb > 10 ? Math.min(2.5, weightsGb / 10) : 1)) / 1024).toFixed(3));

    // 4. KV Cache Per Layer Calculation
    let datatypeSizeKb = 2; // FP16 default
    const kvQuant = kCacheQuant === 'Auto' ? 'q8_0' : kCacheQuant;
    if (kvQuant === 'q8_0') datatypeSizeKb = 1.0;
    else if (kvQuant === 'q4_0') datatypeSizeKb = 0.5;
    const flashFactor = flashAttn ? 0.5 : 1.0;

    const kvCachePerLayerBytes = 2 * contextLength * activeArch.kvHeads * headDim * datatypeSizeKb * flashFactor;
    const kvCacheTotalGb = (kvCachePerLayerBytes * customTotalLayers) / (1024 * 1024 * 1024);

    // 5. Build Layer Memory Map
    const embedProjGb = Math.min(weightsGb * 0.18, (activeArch.hiddenDim * activeArch.vocabSize * (quantType === 'FP16' ? 2 : quantType === 'Q8_0' ? 1.0 : 0.5)) / (1024 * 1024 * 1024));
    const baseLayerGb = (weightsGb - embedProjGb) / customTotalLayers;
    const layerMemoryMap: { index: number; sizeMb: number }[] = [];
    for (let i = 0; i < customTotalLayers; i++) {
      let mult = 1.0;
      if (i === 0) mult = 1.15;
      else if (i === customTotalLayers - 1) mult = 1.10;
      else {
        mult = 1.0 + 0.05 * Math.sin((i / customTotalLayers) * Math.PI * 2);
      }
      if (activeArch.moe) {
        mult *= 1.4;
      }
      layerMemoryMap.push({
        index: i,
        sizeMb: parseFloat((baseLayerGb * mult * 1024).toFixed(1)),
      });
    }

    // 6. Sequential greedy solver to find max layers for different target profiles
    const totalHardwareVramGb = vramSizeGb * gpuCount;

    const getLayersForVramCapacity = (targetUtilization: number) => {
      const targetCapMb = (totalHardwareVramGb * 1024 * targetUtilization) - (backendOverheadGb * 1024);
      let availMb = targetCapMb - (computeBufferGb * 1024) - embedProjGb * 1024;
      if (availMb < 0) return 0;
      
      let layersFit = 0;
      for (let i = 0; i < layerMemoryMap.length; i++) {
        const costMb = layerMemoryMap[i].sizeMb;
        // if kv cache is offloaded, it costs memory per layer
        const kvCostMb = offloadKV ? (kvCachePerLayerBytes / (1024 * 1024)) : 0;
        const totalCostMb = costMb + kvCostMb;
        if (availMb >= totalCostMb) {
          layersFit++;
          availMb -= totalCostMb;
        } else {
          break;
        }
      }
      return layersFit;
    };

    const predictedMaxOffloadPerf = getLayersForVramCapacity(0.96);
    const predictedMaxOffloadSafe = getLayersForVramCapacity(0.90);
    const predictedMaxOffloadBalanced = getLayersForVramCapacity(0.82);

    // 7. Calculate exact allocation under CURRENT SLIDER settings (gpuOffload)
    const layerFraction = customTotalLayers > 0 ? gpuOffload / customTotalLayers : 0;
    
    let currentGpuWeightsGb = 0;
    if (gpuOffload > 0) {
      currentGpuWeightsGb = embedProjGb + (weightsGb - embedProjGb) * layerFraction;
    }
    const currentCpuWeightsGb = weightsGb - currentGpuWeightsGb;

    const currentGpuKvGb = offloadKV ? kvCacheTotalGb * layerFraction : 0;
    const currentCpuKvGb = kvCacheTotalGb - currentGpuKvGb;

    const activeGpuBufferGb = gpuOffload > 0 ? computeBufferGb : 0;
    const activeBackendOverheadGb = gpuOffload > 0 ? backendOverheadGb : 0;

    const totalGpuMemUsedGb = currentGpuWeightsGb + currentGpuKvGb + activeGpuBufferGb + activeBackendOverheadGb;
    const totalCpuMemUsedGb = currentCpuWeightsGb + currentCpuKvGb + (gpuOffload === 0 ? computeBufferGb : 0);

    const freeHardwareVramGb = Math.max(0, totalHardwareVramGb - totalGpuMemUsedGb);
    const vramRatio = totalHardwareVramGb > 0 ? Math.min(100, (totalGpuMemUsedGb / totalHardwareVramGb) * 100) : 0;

    let vramStatusColor = 'emerald';
    if (vramRatio > 95) vramStatusColor = 'red';
    else if (vramRatio > 85) vramStatusColor = 'amber';

    return {
      gpuMem: totalGpuMemUsedGb.toFixed(2),
      cpuMem: totalCpuMemUsedGb.toFixed(2),
      totalMem: (totalGpuMemUsedGb + totalCpuMemUsedGb).toFixed(2),
      kvCacheGb: kvCacheTotalGb.toFixed(2),
      
      weightsGb,
      activeArch,
      backendOverheadGb,
      computeBufferGb,
      kvCacheTotalGb,
      totalHardwareVramGb,
      freeVramGb: freeHardwareVramGb.toFixed(2),
      vramRatio: parseFloat(vramRatio.toFixed(1)),
      vramStatusColor,
      predictedMaxOffloadPerf,
      predictedMaxOffloadSafe,
      predictedMaxOffloadBalanced,
      layerMemoryMap,
      embedProjGb,
      kvCachePerLayerMb: parseFloat((kvCachePerLayerBytes / (1024 * 1024)).toFixed(2))
    };
  }, [
    modelSpecs,
    gpuOffload,
    contextLength,
    offloadKV,
    flashAttn,
    kCacheQuant,
    gpuRecommendation,
    vramSizeGb,
    backendType,
    gpuCount,
    quantType,
    archOverride,
    calcMode,
    customTotalLayers,
    evalBatchSize,
    physicalBatchSize
  ]);

  // Synchronise slider based on requested Calculator Optimization profile
  useEffect(() => {
    if (calcMode === 'Manual Mode') return;
    
    let target = 0;
    if (calcMode === 'Maximum Performance Offload') {
      target = memoryUsage.predictedMaxOffloadPerf;
    } else if (calcMode === 'Maximum Safe Offload') {
      target = memoryUsage.predictedMaxOffloadSafe;
    } else if (calcMode === 'Balanced Mode') {
      target = memoryUsage.predictedMaxOffloadBalanced;
    } else if (calcMode === 'Auto Calculate') {
      target = memoryUsage.predictedMaxOffloadSafe;
    }
    
    const finalVal = Math.max(0, Math.min(customTotalLayers, target));
    if (gpuOffload !== finalVal) {
      setGpuOffload(finalVal);
    }
  }, [
    calcMode,
    customTotalLayers,
    memoryUsage.predictedMaxOffloadPerf,
    memoryUsage.predictedMaxOffloadSafe,
    memoryUsage.predictedMaxOffloadBalanced,
    gpuOffload
  ]);

  // Generate the CLI parameters on the fly matching user specifications
  const generatedCommand = useMemo(() => {
    const kCache = kCacheQuant === 'Auto' ? 'q8_0' : kCacheQuant.toLowerCase();
    const vCache = vCacheQuant === 'Auto' ? 'q8_0' : vCacheQuant.toLowerCase();
    
    // Attempt to parse actual binary location from installed config, falling back to typical user directory
    let binaryPath = '';
    try {
      const raw = localStorage.getItem('lumina_llama_installed_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.binaries) {
          binaryPath = parsed.binaries.find((b: string) => {
            const lower = b.toLowerCase();
            return (lower.includes('llama-server') && lower.endsWith('.exe')) || lower.replace(/\\/g, '/').includes('/server.exe');
          }) || parsed.binaries.find((b: string) => {
            const lower = b.toLowerCase();
            return lower.includes('llama-server') || lower.replace(/\\/g, '/').includes('/server.exe');
          }) || '';
        }
      }
    } catch {}

    if (!binaryPath) {
      binaryPath = `C:\\Users\\${osUser || 'skabd'}\\.lumina\\llama\\llama.cpp\\llama-server.exe`;
    }

    // PowerShell call operator formatting & "exe" -m "model" ...
    let cmd = `& "${binaryPath}"`;
    cmd += ` -m "${resolvedModelPath}"`;
    if (useProjector && projectorPath) {
      cmd += ` --mmproj "${projectorPath}"`;
    }
    cmd += ` -ngl ${gpuOffload}`;
    cmd += ` -c ${contextLength}`;
    cmd += ` --cache-type-k ${kCache}`;
    cmd += ` --cache-type-v ${vCache}`;
    cmd += ` -t ${cpuThreads}`;
    cmd += ` --host ${localHost}`;
    cmd += ` --port ${localPort}`;
    
    // --flash-attn removed
    if (seed && seed !== 'Random Seed' && String(seed) !== '-1') {
      cmd += ` --seed ${seed}`;
    }
    if (!tryMmap) {
      cmd += ` --no-mmap`;
    }
    if (maxConcurrent && maxConcurrent > 0) {
      cmd += ` --parallel ${maxConcurrent}`;
    }
    // Removed --slot-save-state: not a valid llama-server argument in recent builds
    if (ropeFreqBase && ropeFreqBase !== 'Auto' && String(ropeFreqBase).trim() !== '') {
      cmd += ` --rope-freq-base ${ropeFreqBase}`;
    }
    if (ropeFreqScale && ropeFreqScale !== 'Auto' && String(ropeFreqScale).trim() !== '') {
      cmd += ` --rope-freq-scale ${ropeFreqScale}`;
    }
    if (!offloadKV) {
      cmd += ` --no-kv-offload`;
    }
    if (keepInMemory) {
      cmd += ` --mlock`;
    }
    if (evalBatchSize && evalBatchSize > 0) {
      cmd += ` -b ${evalBatchSize}`;
    }
    if (physicalBatchSize && physicalBatchSize > 0) {
      cmd += ` -ub ${physicalBatchSize}`;
    }
    return cmd;
  }, [
    osUser, 
    modelPublisher, 
    modelFolder, 
    modelFile, 
    gpuOffload, 
    contextLength, 
    kCacheQuant, 
    vCacheQuant, 
    cpuThreads, 
    localHost, 
    localPort, 
    flashAttn, 
    seed, 
    tryMmap,
    maxConcurrent,
    unifiedKVCache,
    ropeFreqBase,
    ropeFreqScale,
    offloadKV,
    keepInMemory,
    evalBatchSize,
    physicalBatchSize,
    resolvedModelPath,
    useProjector,
    projectorPath
  ]);

  // Reset to default
  const handleUseDefaults = () => {
    setContextLength(32768);
    setGpuOffload(99);
    setCpuThreads(8);
    setEvalBatchSize(2048);
    setPhysicalBatchSize(512);
    setMaxConcurrent(4);
    setUnifiedKVCache(true);
    setRopeFreqBase('Auto');
    setRopeFreqScale('Auto');
    setOffloadKV(true);
    setKeepInMemory(true);
    setTryMmap(true);
    setFlashAttn(true);
    setSeed('Random Seed');
    setKCacheQuant('q8_0');
    setVCacheQuant('q8_0');
    // Don't reset osUser - keep the detected OS username
    setLocalHost('127.0.0.1');
    setModelPublisher(defaultPathInfo.publisher);
    setModelFolder(defaultPathInfo.modelFolder);
    setModelFile(defaultPathInfo.modelFile);
    setLocalPort('1234');
    showToast("Properties reset to default local model parameters");
  };

  // Run connection test to verify port answers in browser
  const handleVerifyConnection = async () => {
    setTestingConnection(true);
    setConnectionState('testing');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      
      const res = await fetch(`http://${localHost}:${localPort}/v1/models`, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok || res.status === 200 || res.status === 405 || res.status === 404) {
        setConnectionState('connected');
        showToast("Connected successfully to local llama-server!");
      } else {
        setConnectionState('connected');
        showToast("Local port active! Server responds.");
      }
    } catch (e) {
      console.warn("Direct local test failed, testing general bridge:", e);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        await fetch(`http://localhost:${localPort}/`, {
          method: 'GET',
          mode: 'no-cors',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        setConnectionState('connected');
        showToast("Local server port responding. Connected!");
      } catch (err) {
        setConnectionState('failed');
        showToast("No active server detected at http://127.0.0.1:1234. Copy the CLI and run it!");
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const handleVerifyVision = async () => {
    setVisionVerificationState('verifying');
    try {
      const res = await fetch('/api/llama/verify-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: localHost, port: Number(localPort) }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.visionActive) {
          setVisionVerificationState('active');
          showToast(`Vision verified! Model response: "${data.modelResponse.trim()}"`);
          localStorage.setItem(`lumina_server_mmproj_${model.id}`, 'true');
        } else {
          setVisionVerificationState('inactive');
          showToast(`Vision failed: ${data.detail || data.error || 'Check that mmproj is loaded'}`);
          localStorage.removeItem(`lumina_server_mmproj_${model.id}`);
        }
      } else {
        setVisionVerificationState('error');
        showToast('Vision verification request failed');
      }
    } catch (e: any) {
      console.error(e);
      setVisionVerificationState('error');
      showToast(`Error connecting to verify endpoint: ${e.message}`);
    }
  };

  const handleStartServer = async () => {
    setServerStarting(true);
    setServerError(null);
    setServerLog([]);
    setConnectionState('testing');

    const addLog = (msg: string) => {
      setServerLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      // Find installed llama-server binary from localStorage
      let installedConfig = null;
      try {
        const raw = localStorage.getItem('lumina_llama_installed_config');
        if (raw) installedConfig = JSON.parse(raw);
      } catch {}

      if (!installedConfig) {
        throw new Error('llama.cpp is not installed. Go to Settings → llama.cpp to install it first.');
      }

      const binaryPath = installedConfig.binaries
        ? installedConfig.binaries.find((b: string) => {
            const lower = b.toLowerCase();
            return (lower.includes('llama-server') && lower.endsWith('.exe')) || lower.replace(/\\/g, '/').includes('/server.exe');
          }) || installedConfig.binaries.find((b: string) => {
            const lower = b.toLowerCase();
            return lower.includes('llama-server') || lower.replace(/\\/g, '/').includes('/server.exe');
          })
        : null;

      if (!binaryPath) {
        throw new Error('llama-server binary not found in installed package. Try reinstalling.');
      }

      const modelPath = resolvedModelPath;
      const kCache = kCacheQuant === 'Auto' ? 'q8_0' : kCacheQuant.toLowerCase();
      const vCache = vCacheQuant === 'Auto' ? 'q8_0' : vCacheQuant.toLowerCase();

      addLog('Starting llama-server...');
      addLog(`Binary: ${binaryPath}`);
      addLog(`Model: ${modelPath}`);
      if (useProjector && projectorPath) addLog(`MMProj: ${projectorPath}`);
      addLog(`Port: ${localPort}`);

      const response = await fetch('/api/llama/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          binaryPath,
          modelPath,
          gpuOffload,
          contextLength,
          cacheTypeK: kCache,
          cacheTypeV: vCache,
          threads: cpuThreads,
          host: localHost,
          port: parseInt(localPort),
          flashAttn,
          noMmap: !tryMmap,
          seed: (seed === 'Random Seed' || String(seed) === '-1') ? undefined : seed,
          maxConcurrent,
          unifiedKVCache,
          ropeFreqBase,
          ropeFreqScale,
          offloadKV,
          keepInMemory,
          evalBatchSize,
          physicalBatchSize,
          mmprojPath: useProjector && projectorPath ? projectorPath : undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start server');
      }

      setServerPid(result.pid);
      addLog(`Server started (PID: ${result.pid})`);
      addLog(`Server URL: ${result.serverUrl}`);
      // Track whether this server instance has mmproj loaded (for auto-restart on vision messages)
      if (useProjector && projectorPath) {
        localStorage.setItem(`lumina_server_mmproj_${model.id}`, 'true');
      } else {
        localStorage.removeItem(`lumina_server_mmproj_${model.id}`);
      }
      setConnectionState('connected');
      showToast('llama-server is running and ready!');
    } catch (err: any) {
      const msg = err.message || 'Unknown error';
      setServerError(msg);
      addLog(`ERROR: ${msg}`);
      setConnectionState('failed');
      showToast(`Failed to start server: ${msg}`);
    } finally {
      setServerStarting(false);
    }
  };

  const handleStopServer = async () => {
    try {
      await fetch('/api/llama/stop', { method: 'POST' });
    } catch {}
    setServerPid(null);
    setConnectionState('idle');
    setServerLog([]);
    showToast('Server stopped');
  };

  const handleCopyCliCommand = () => {
    navigator.clipboard.writeText(generatedCommand);
    setCopiedCommand(true);
    showToast("LLM server command copied to clipboard!");
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  // Submit model run configuration
  const handleNextStep = () => {
    setSetupStep('serverGuide');
    setServerLog([]);
    setServerError(null);
    // Check if llama.cpp is installed
    try {
      const raw = localStorage.getItem('lumina_llama_installed_config');
      if (raw) {
        const cfg = JSON.parse(raw);
        setServerLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] llama.cpp found: ${cfg.version || 'installed'}`]);
        if (cfg.binaries) {
          const serverBin = cfg.binaries.find((b: string) => {
            const lower = b.toLowerCase();
            return (lower.includes('llama-server') && lower.endsWith('.exe')) || lower.replace(/\\/g, '/').includes('/server.exe');
          }) || cfg.binaries.find((b: string) => {
            const lower = b.toLowerCase();
            return lower.includes('llama-server') || lower.replace(/\\/g, '/').includes('/server.exe');
          });
          if (serverBin) {
            setServerLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] llama-server binary: ${serverBin}`]);
          } else {
            setServerLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] WARNING: llama-server binary not found in install. Try reinstalling.`]);
          }
        }
      } else {
        setServerLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] llama.cpp not installed. Click "Start Server" to install or go to Settings.`]);
      }
    } catch {}
  };

  const handleDoneClick = () => {
    const config = {
      contextLength,
      gpuOffload,
      customTotalLayers,
      cpuThreads,
      evalBatchSize,
      physicalBatchSize,
      maxConcurrent,
      unifiedKVCache,
      ropeFreqBase,
      ropeFreqScale,
      offloadKV,
      keepInMemory,
      tryMmap,
      flashAttn,
      seed,
      kCacheQuant,
      vCacheQuant,
      osUser,
      localHost,
      localPort,
      modelPublisher,
      modelFolder,
      modelFile,
      generatedCommand,
      memoryEst: memoryUsage,
      useLocalServer: true,
      serverPid,
      serverAutoStarted: serverPid !== null,
      useProjector,
      projectorPath: useProjector ? projectorPath : '',
    };

    localStorage.setItem(`lumina_local_os_user`, osUser);
    localStorage.setItem(`lumina_local_host_${model.id}`, localHost);
    localStorage.setItem(`lumina_local_port_${model.id}`, localPort);
    localStorage.setItem(`lumina_local_pub_${model.id}`, modelPublisher);
    localStorage.setItem(`lumina_local_folder_${model.id}`, modelFolder);
    localStorage.setItem(`lumina_local_file_${model.id}`, modelFile);

    if (rememberSettings) {
      localStorage.setItem(storageKey, JSON.stringify(config));
    } else {
      localStorage.removeItem(storageKey);
    }

    localStorage.setItem(`lumina_cmd_${model.id}`, generatedCommand);

    onLoadModel(config);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[500] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="w-full max-w-[580px] bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[var(--theme-primary)]"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--theme-border)] bg-[var(--theme-surface-alt)]/40 select-none shrink-0">
          <button
            onClick={setupStep === 'serverGuide' ? () => setSetupStep('config') : onClose}
            className="p-1.5 hover:bg-[var(--theme-hover-bg)] rounded-xl text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-all cursor-pointer"
            title="Go back"
          >
            <ChevronLeft size={18} />
          </button>
          
          <h1 className="text-sm font-semibold font-sans text-[var(--theme-primary)] max-w-[320px] truncate flex items-center gap-1.5 flex-wrap">
            {setupStep === 'config' ? (
              <>
                <Cpu size={14} className="text-[var(--theme-accent,#3b82f6)] animate-pulse shrink-0" />
                <span className="truncate">Configure {model.name}</span>
              </>
            ) : (
              <>
                <Terminal size={14} className="text-emerald-500 shrink-0" />
                <span>Start Llama Server & Connect</span>
              </>
            )}
            {detectedCapabilities.isVideo && (
              <span className="text-[8px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded uppercase shrink-0">Video</span>
            )}
            {detectedCapabilities.isVision && !detectedCapabilities.isVideo && (
              <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase shrink-0">Vision</span>
            )}
            {detectedCapabilities.isAudio && (
              <span className="text-[8px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded uppercase shrink-0">Audio</span>
            )}
          </h1>

          {setupStep === 'config' ? (
            <button
              type="button"
              onClick={handleUseDefaults}
              className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--theme-accent,#3b82f6)] hover:text-[var(--theme-accent,#3b82f6)]/85 transition-colors cursor-pointer px-2.5 py-1.5 rounded-xl hover:bg-[var(--theme-hover-bg)]"
              title="Reset to default local state settings"
            >
              <RefreshCw size={11} />
              <span>Use Defaults</span>
            </button>
          ) : (
            <div className="w-20" /> // Spacer
          )}
        </div>

        {/* Estimation parameters box */}
        <div className="px-5 py-3 bg-[var(--theme-accent,#3b82f6)]/5 border-b border-[var(--theme-border)]/50 select-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-[var(--theme-accent,#3b82f6)]" />
              <span className="text-xs font-semibold text-[var(--theme-primary)]">Estimated VRAM Usage</span>
              {gpuRecommendation && !gpuRecommendation.error && (
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 rounded">GGUF Scan</span>
              )}
            </div>
            <div className="flex items-center gap-3.5 font-mono text-xs">
              <div className="text-[var(--theme-secondary)]">
                GPU: <span className="text-[var(--theme-primary)] font-bold">{memoryUsage.gpuMem} GB</span>
              </div>
              <div className="text-[var(--theme-secondary)] border-l border-[var(--theme-border)]/60 pl-3.5">
                Total: <span className="text-[var(--theme-accent,#3b82f6)] font-bold">{memoryUsage.totalMem} GB</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--theme-muted)] font-mono">
            <span>Weights (GPU): {(parseFloat(memoryUsage.gpuMem) - 0.1 - (offloadKV ? parseFloat(memoryUsage.kvCacheGb) : 0)).toFixed(2)} GB</span>
            <span className="text-[var(--theme-border)]">·</span>
            <span>KV Cache: {memoryUsage.kvCacheGb} GB</span>
            <span className="text-[var(--theme-border)]">·</span>
            <span>CPU: {memoryUsage.cpuMem} GB</span>
          </div>
        </div>

        {/* Scrollable parameters wrapper */}
        <div className="flex-1 p-5 space-y-6 overflow-y-auto max-h-[58vh] custom-scrollbar">
          {setupStep === 'config' ? (
            <>
              {/* Core hardware settings */}
              <div className="space-y-4 bg-[var(--theme-surface-alt)]/35 p-5 rounded-2xl border border-[var(--theme-border)] shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--theme-secondary)] border-b border-[var(--theme-border)] pb-2 select-none">
                  <Layers size={13} className="text-[var(--theme-accent,#3b82f6)]" />
                  <span>Base Hardware Settings</span>
                </div>
                
                {/* Context length slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--theme-primary)]">
                      <span>Context Length</span>
                      <span title="Maximum tokens the local context window retains" className="flex items-center">
                        <HelpCircle size={12} className="text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-help transition-colors" />
                      </span>
                    </div>
                    <span className="text-xs font-semibold font-mono px-2 py-0.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-lg text-[var(--theme-accent,#3b82f6)]">{contextLength}</span>
                  </div>
                  <input
                    type="range"
                    min="512"
                    max={modelSpecs.maxTokens}
                    step="512"
                    value={contextLength}
                    onChange={(e) => setContextLength(Number(e.target.value))}
                    className="w-full h-1 bg-[var(--theme-border)] rounded-full appearance-none cursor-pointer accent-[var(--theme-accent,#3b82f6)]"
                  />
                  <p className="text-[10px] text-[var(--theme-muted)] select-none">
                    Model supports up to {modelSpecs.maxTokens.toLocaleString()} tokens natively
                  </p>
                </div>

                {/* GPU offload slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--theme-primary)]">
                      <span>GPU Offload (ngl)</span>
                      <span title="Number of LLM tensor layers processed on graphics hardware card" className="flex items-center">
                        <HelpCircle size={12} className="text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-help transition-colors" />
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-[10px] text-[var(--theme-muted)] mr-1">Offload:</span>
                      <input
                        type="number"
                        min="0"
                        max={customTotalLayers}
                        value={gpuOffload}
                        onChange={(e) => {
                          setCalcMode('Manual Mode');
                          const val = Math.max(0, Math.min(customTotalLayers, Number(e.target.value) || 0));
                          setGpuOffload(val);
                        }}
                        className="w-10 text-center text-xs font-semibold font-mono h-6 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-md text-[var(--theme-accent,#3b82f6)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent,#3b82f6)]"
                        title="Edit GPU offloaded layers manually"
                      />
                      <span className="text-[var(--theme-muted)] text-xs font-semibold">/</span>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={customTotalLayers}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(200, Number(e.target.value) || 1));
                          setCustomTotalLayers(val);
                          if (gpuOffload > val) {
                            setGpuOffload(val);
                          }
                        }}
                        className="w-10 text-center text-xs font-semibold font-mono h-6 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-md text-[var(--theme-accent,#3b82f6)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent,#3b82f6)]"
                        title="Edit total layers manual override (defaults to 18 for Liquid)"
                      />
                      <span className="text-[10px] text-[var(--theme-muted)] font-medium pl-0.5">Layers</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={customTotalLayers}
                    step="1"
                    value={gpuOffload}
                    onChange={(e) => {
                      setCalcMode('Manual Mode');
                      setGpuOffload(Number(e.target.value));
                    }}
                    className="w-full h-1 bg-[var(--theme-border)] rounded-full appearance-none cursor-pointer accent-[var(--theme-accent,#3b82f6)]"
                  />
                  <p className="text-[10px] text-[var(--theme-muted)] select-none flex items-center gap-1 mb-1">
                    <span>Distributing {gpuOffload} layers to hardware GPU and remaining CPU operations out of {customTotalLayers} total</span>
                  </p>
                </div>

                {/* CPU Threads slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--theme-primary)]">
                      <span>CPU Thread Pool Size (-t)</span>
                      <span title="Allocated CPU thread count for model tensor operations" className="flex items-center">
                        <HelpCircle size={12} className="text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-help transition-colors" />
                      </span>
                    </div>
                    <span className="text-xs font-semibold font-mono px-2 py-0.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-lg text-[var(--theme-accent,#3b82f6)]">{cpuThreads} Threads</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    step="1"
                    value={cpuThreads}
                    onChange={(e) => setCpuThreads(Number(e.target.value))}
                    className="w-full h-1 bg-[var(--theme-border)] rounded-full appearance-none cursor-pointer accent-[var(--theme-accent,#3b82f6)]"
                  />
                </div>

                {/* Evaluation batch size slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--theme-primary)]">
                      <span>Evaluation Batch Size</span>
                      <span title="Prompt evaluation chunk calculation batch width" className="flex items-center">
                        <HelpCircle size={12} className="text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-help transition-colors" />
                      </span>
                    </div>
                    <span className="text-xs font-semibold font-mono px-2 py-0.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-lg text-[var(--theme-accent,#3b82f6)]">{evalBatchSize}</span>
                  </div>
                  <input
                    type="range"
                    min="512"
                    max="4096"
                    step="512"
                    value={evalBatchSize}
                    onChange={(e) => setEvalBatchSize(Number(e.target.value))}
                    className="w-full h-1 bg-[var(--theme-border)] rounded-full appearance-none cursor-pointer accent-[var(--theme-accent,#3b82f6)]"
                  />
                </div>

                {/* Physical batch size slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--theme-primary)]">
                      <span>Physical Batch Size</span>
                      <span title="Strict hardware-facing segment batch chunk execution limit" className="flex items-center">
                        <HelpCircle size={12} className="text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-help transition-colors" />
                      </span>
                    </div>
                    <span className="text-xs font-semibold font-mono px-2 py-0.5 bg-[var(--theme-surface-alt)] border border-[var(--theme-border)] rounded-lg text-[var(--theme-accent,#3b82f6)]">{physicalBatchSize}</span>
                  </div>
                  <input
                    type="range"
                    min="128"
                    max="1024"
                    step="128"
                    value={physicalBatchSize}
                    onChange={(e) => setPhysicalBatchSize(Number(e.target.value))}
                    className="w-full h-1 bg-[var(--theme-border)] rounded-full appearance-none cursor-pointer accent-[var(--theme-accent,#3b82f6)]"
                  />
                </div>
              </div>



              {/* Local File Path Mapping Settings */}
              <div className="space-y-4 bg-[var(--theme-surface-alt)]/35 p-5 rounded-2xl border border-[var(--theme-border)] shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--theme-secondary)] border-b border-[var(--theme-border)] pb-2 select-none">
                  <Settings size={13} className="text-[var(--theme-accent,#3b82f6)]" />
                  <span>Model Path & CLI Custom Mapping</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-[var(--theme-secondary)]">OS Username</label>
                    <input 
                      type="text" 
                      value={osUser} 
                      onChange={(e) => setOsUser(e.target.value)}
                      className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] text-xs rounded-xl px-3 py-2 outline-none focus:border-[var(--theme-accent,#3b82f6)] text-[var(--theme-primary)] transition-all font-sans"
                      placeholder="e.g. skramiz0004 or YOU"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-[var(--theme-secondary)]">Local Server Port</label>
                    <input 
                      type="text" 
                      value={localPort} 
                      onChange={(e) => setLocalPort(e.target.value)}
                      className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] text-xs rounded-xl px-3 py-2 outline-none focus:border-[var(--theme-accent,#3b82f6)] text-[var(--theme-primary)] transition-all font-mono"
                      placeholder="e.g. 1234"
                    />
                  </div>
                </div>

                <div className="space-y-3.5 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-[var(--theme-secondary)]">Model Publisher Folder</label>
                    <input 
                      type="text" 
                      value={modelPublisher} 
                      onChange={(e) => setModelPublisher(e.target.value)}
                      className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] text-xs rounded-xl px-3 py-2 outline-none focus:border-[var(--theme-accent,#3b82f6)] text-[var(--theme-primary)] transition-all font-sans"
                      placeholder="e.g. publisher"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-[var(--theme-secondary)]">Model Folder Name (-GGUF)</label>
                    <input 
                      type="text" 
                      value={modelFolder} 
                      onChange={(e) => setModelFolder(e.target.value)}
                      className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] text-xs rounded-xl px-3 py-2 outline-none focus:border-[var(--theme-accent,#3b82f6)] text-[var(--theme-primary)] transition-all font-sans"
                      placeholder="e.g. ModelName-GGUF"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-[var(--theme-secondary)]">Model GGUF Filename</label>
                    <input 
                      type="text" 
                      value={modelFile} 
                      onChange={(e) => setModelFile(e.target.value)}
                      className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] text-xs rounded-xl px-3 py-2 outline-none focus:border-[var(--theme-accent,#3b82f6)] text-[var(--theme-primary)] transition-all font-mono"
                      placeholder="e.g. model-Q4_K_M.gguf"
                    />
                  </div>

                  {/* Vision/Video mmproj path */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase font-bold text-[var(--theme-secondary)] flex items-center gap-1.5">
                        Multimodal Projector (mmproj)
                        {detectedCapabilities.isVideo ? (
                          <span className="text-[8px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded uppercase">Video</span>
                        ) : detectedCapabilities.isVision ? (
                          <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">Vision</span>
                        ) : (
                          <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">Vision</span>
                        )}
                        {foundProjectorPath && (
                          <span className="text-[8px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded uppercase">Found</span>
                        )}
                      </label>
                      <button
                        onClick={() => setUseProjector(!useProjector)}
                        className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full transition-colors duration-250 ease-in-out border border-transparent ${useProjector ? 'bg-emerald-500' : 'bg-[var(--theme-border)]'}`}
                      >
                        <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-250 ease-in-out ${useProjector ? 'translate-x-[14px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={projectorPath}
                      onChange={(e) => {
                        setProjectorPath(e.target.value);
                        setProjectorPathManual(true);
                        if (e.target.value) setUseProjector(true);
                      }}
                      className={`w-full bg-[var(--theme-input-bg)] border text-[10px] font-mono rounded-xl px-3 py-2 outline-none transition-all text-[var(--theme-primary)] ${useProjector ? 'border-emerald-500/40 focus:border-emerald-500' : 'border-[var(--theme-border)] opacity-50'}`}
                      placeholder="e.g. SmolVLM2-500M-Video-Instruct-mmproj-f16.gguf (full path)"
                      disabled={!useProjector}
                    />
                    <p className="text-[9px] text-[var(--theme-muted)]">
                      {useProjector
                        ? foundProjectorPath
                          ? '✓ mmproj file found in downloads — vision/video inputs enabled'
                          : projectorPath
                            ? detectedCapabilities.isMultimodal
                              ? '⚠ mmproj not yet downloaded — download it alongside the model'
                              : '✓ mmproj path set — vision inputs enabled'
                            : '⚠ Paste the full path to your mmproj file'
                        : 'Enable to attach a projector for image / video understanding'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Advanced Model settings - show only when showAdvanced is active */}
              {showAdvanced && (
                <div className="space-y-3.5 pt-2 bg-[var(--theme-surface-alt)]/20 p-5 rounded-2xl border border-[var(--theme-border)] shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--theme-secondary)] border-b border-[var(--theme-border)]/60 pb-2 select-none">
                    <Settings size={13} className="text-[var(--theme-accent,#3b82f6)]" />
                    <span>Generation & Precision Details</span>
                  </div>

                  {/* Max concurrent predictions */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--theme-border)]/40 hover:bg-[var(--theme-hover-bg)]/10 px-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-primary)]">
                      <span>Max Concurrent Predictions</span>
                      <span title="Allowed simultaneous sequence inference streams" className="flex items-center">
                        <HelpCircle size={12} className="text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-help transition-colors" />
                      </span>
                    </div>
                    <input 
                      type="number" 
                      value={maxConcurrent} 
                      onChange={(e) => setMaxConcurrent(Math.max(1, Number(e.target.value)))}
                      className="w-16 bg-[var(--theme-input-bg)] border border-[var(--theme-border)] text-xs rounded-xl text-center py-1.5 font-mono text-[var(--theme-primary)] font-semibold outline-none focus:border-[var(--theme-accent,#3b82f6)] transition-all"
                    />
                  </div>

                  {/* Unified KV Cache toggle */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--theme-border)]/40 hover:bg-[var(--theme-hover-bg)]/10 px-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-primary)]">
                      <span>Unified KV Cache</span>
                      <span title="Shared storage layers management interface for keys/values" className="flex items-center">
                        <HelpCircle size={12} className="text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-help transition-colors" />
                      </span>
                    </div>
                    <button 
                      onClick={() => setUnifiedKVCache(!unifiedKVCache)}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-250 ease-in-out border border-transparent ${unifiedKVCache ? 'bg-[var(--theme-accent,#3b82f6)] shadow-sm' : 'bg-[var(--theme-border)]'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md transition-transform duration-250 ease-in-out ${unifiedKVCache ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {/* RoPE Frequency Base */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--theme-border)]/40 hover:bg-[var(--theme-hover-bg)]/10 px-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-primary)]">
                      <span>RoPE Frequency Base</span>
                      <span title="Rotary position embedding operational scale vector basis" className="flex items-center">
                        <HelpCircle size={12} className="text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-help transition-colors" />
                      </span>
                    </div>
                    <input 
                      type="text" 
                      value={ropeFreqBase}
                      onChange={(e) => setRopeFreqBase(e.target.value)}
                      className="w-20 bg-[var(--theme-input-bg)] border border-[var(--theme-border)] text-xs rounded-xl text-center py-1.5 font-mono text-[var(--theme-primary)] font-semibold outline-none focus:border-[var(--theme-accent,#3b82f6)] transition-all"
                    />
                  </div>

                  {/* RoPE Frequency Scale */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--theme-border)]/40 hover:bg-[var(--theme-hover-bg)]/10 px-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-primary)]">
                      <span>RoPE Frequency Scale</span>
                      <span title="Dynamic scale vector compression index multiplier" className="flex items-center">
                        <HelpCircle size={12} className="text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-help transition-colors" />
                      </span>
                    </div>
                    <input 
                      type="text" 
                      value={ropeFreqScale}
                      onChange={(e) => setRopeFreqScale(e.target.value)}
                      className="w-20 bg-[var(--theme-input-bg)] border border-[var(--theme-border)] text-xs rounded-xl text-center py-1.5 font-mono text-[var(--theme-primary)] font-semibold outline-none focus:border-[var(--theme-accent,#3b82f6)] transition-all"
                    />
                  </div>

                  {/* Offload KV Cache to GPU Memory toggle */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--theme-border)]/40 hover:bg-[var(--theme-hover-bg)]/10 px-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-primary)]">
                      <span>Offload KV Cache to GPU Memory</span>
                      <span title="Process keys and values of attention in graphics cards instead of RAM" className="flex items-center">
                        <HelpCircle size={12} className="text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-help transition-colors" />
                      </span>
                    </div>
                    <button 
                      onClick={() => setOffloadKV(!offloadKV)}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-250 ease-in-out border border-transparent ${offloadKV ? 'bg-[var(--theme-accent,#3b82f6)] shadow-sm' : 'bg-[var(--theme-border)]'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md transition-transform duration-250 ease-in-out ${offloadKV ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {/* Keep model in memory toggle */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--theme-border)]/40 hover:bg-[var(--theme-hover-bg)]/10 px-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-primary)]">
                      <span>Keep Model in Memory</span>
                      <span title="Model remains compiled inside RAM/VRAM after completing outputs" className="flex items-center">
                        <HelpCircle size={12} className="text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-help transition-colors" />
                      </span>
                    </div>
                    <button 
                      onClick={() => setKeepInMemory(!keepInMemory)}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-250 ease-in-out border border-transparent ${keepInMemory ? 'bg-[var(--theme-accent,#3b82f6)] shadow-sm' : 'bg-[var(--theme-border)]'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md transition-transform duration-250 ease-in-out ${keepInMemory ? 'translate-x-[18px]' : 'translate-x-[0.5px]'}`} />
                    </button>
                  </div>

                  {/* Try mmap() toggle */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--theme-border)]/40 hover:bg-[var(--theme-hover-bg)]/10 px-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-primary)]">
                      <span>Try mmap()</span>
                      <span title="Enable mapped file reading for immediate virtual paging streams" className="flex items-center">
                        <HelpCircle size={12} className="text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-help transition-colors" />
                      </span>
                    </div>
                    <button 
                      onClick={() => setTryMmap(!tryMmap)}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-250 ease-in-out border border-transparent ${tryMmap ? 'bg-[var(--theme-accent,#3b82f6)] shadow-sm' : 'bg-[var(--theme-border)]'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md transition-transform duration-250 ease-in-out ${tryMmap ? 'translate-x-[18px]' : 'translate-x-[0.5px]'}`} />
                    </button>
                  </div>

                  {/* Seed setting value */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--theme-border)]/40 hover:bg-[var(--theme-hover-bg)]/10 px-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-primary)]">
                      <span>Seed</span>
                      <span title="Allocated generation seed number. Use Random for stochastic variations." className="flex items-center">
                        <HelpCircle size={12} className="text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-help transition-colors" />
                      </span>
                    </div>
                    <input 
                      type="text" 
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      className="w-24 bg-[var(--theme-input-bg)] border border-[var(--theme-border)] text-xs rounded-xl text-center py-1.5 font-mono text-[var(--theme-primary)] font-semibold outline-none focus:border-[var(--theme-accent,#3b82f6)] transition-all"
                    />
                  </div>

                  {/* Flash Attention toggle */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--theme-border)]/40 hover:bg-[var(--theme-hover-bg)]/10 px-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-primary)]">
                      <span>Flash Attention</span>
                      <span title="Hardware flash activation attention indexing acceleration speedups" className="flex items-center">
                        <HelpCircle size={12} className="text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-help transition-colors" />
                      </span>
                    </div>
                    <button 
                      onClick={() => setFlashAttn(!flashAttn)}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-250 ease-in-out border border-transparent ${flashAttn ? 'bg-[var(--theme-accent,#3b82f6)] shadow-sm' : 'bg-[var(--theme-border)]'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md transition-transform duration-250 ease-in-out ${flashAttn ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {/* K Cache Quantization Type */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--theme-border)]/40 hover:bg-[var(--theme-hover-bg)]/10 px-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-primary)]">
                      <span>K Cache Quantization Type</span>
                      <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/10 px-1.5 py-0.5 rounded uppercase select-none">Exp</span>
                    </div>
                    <select 
                      value={kCacheQuant}
                      onChange={(e) => setKCacheQuant(e.target.value)}
                      className="bg-[var(--theme-input-bg)] border border-[var(--theme-border)] text-xs text-[var(--theme-primary)] rounded-xl font-mono px-3 py-1 outline-none focus:border-[var(--theme-accent,#3b82f6)] transition-all h-8 select-none shadow-sm cursor-pointer"
                    >
                      <option value="Auto">Auto</option>
                      <option value="q4_0">4-bit (q4_0)</option>
                      <option value="q8_0">8-bit (q8_0)</option>
                      <option value="f16">16-bit (f16)</option>
                    </select>
                  </div>

                  {/* V Cache Quantization Type */}
                  <div className="flex items-center justify-between py-2 border-b border-[var(--theme-border)]/40 hover:bg-[var(--theme-hover-bg)]/10 px-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-primary)]">
                      <span>V Cache Quantization Type</span>
                      <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/10 px-1.5 py-0.5 rounded uppercase select-none">Exp</span>
                    </div>
                    <select 
                      value={vCacheQuant}
                      onChange={(e) => setVCacheQuant(e.target.value)}
                      className="bg-[var(--theme-input-bg)] border border-[var(--theme-border)] text-xs text-[var(--theme-primary)] rounded-xl font-mono px-3 py-1 outline-none focus:border-[var(--theme-accent,#3b82f6)] transition-all h-8 select-none shadow-sm cursor-pointer"
                    >
                      <option value="Auto">Auto</option>
                      <option value="q4_0">4-bit (q4_0)</option>
                      <option value="q8_0">8-bit (q8_0)</option>
                      <option value="f16">16-bit (f16)</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Setup Step Guide View */
            <div className="space-y-5 py-2">
              <div className="space-y-1 select-none">
                <p className="text-xs text-[var(--theme-secondary)] leading-relaxed">
                  Start the <span className="font-semibold text-[var(--theme-accent,#3b82f6)]">llama-server</span> binary directly from the app. The server will be launched automatically and Lumina will connect to it.
                </p>
              </div>

              {/* Vision/Video Projector (mmproj) — always shown */}
              <div className={`rounded-2xl border p-4 transition-colors ${useProjector && projectorPath ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[var(--theme-border)] bg-[var(--theme-surface-alt)]/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUseProjector(!useProjector)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-250 ease-in-out border border-transparent ${useProjector ? 'bg-emerald-500' : 'bg-[var(--theme-border)]'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-250 ease-in-out ${useProjector ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-xs font-semibold text-[var(--theme-primary)]">
                      {detectedCapabilities.isVideo ? 'Video/Vision Projector (--mmproj)' : 'Vision Projector (--mmproj)'}
                    </span>
                    {useProjector && projectorPath && (
                      <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase select-none">
                        {foundProjectorPath ? 'Found' : 'Active'}
                      </span>
                    )}
                    {useProjector && !projectorPath && (
                      <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase select-none">Path needed</span>
                    )}
                    {detectedCapabilities.isMultimodal && !foundProjectorPath && (
                      <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase select-none">Download mmproj</span>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    value={projectorPath}
                    onChange={(e) => {
                      setProjectorPath(e.target.value);
                      setProjectorPathManual(true);
                      if (e.target.value) setUseProjector(true);
                    }}
                    className={`w-full bg-[var(--theme-input-bg)] border text-[10px] font-mono text-[var(--theme-primary)] rounded-xl px-3 py-2 outline-none transition-all ${useProjector ? 'border-emerald-500/40 focus:border-emerald-500' : 'border-[var(--theme-border)] focus:border-[var(--theme-accent,#3b82f6)]'}`}
                    placeholder="Full path to mmproj-*.gguf (auto-filled if detected)"
                  />
                </div>
                <p className="mt-1.5 text-[9px] text-[var(--theme-muted)]">
                  {useProjector && projectorPath
                    ? foundProjectorPath
                      ? '✓ Projector file found — --mmproj will be added to launch command'
                      : detectedCapabilities.isMultimodal
                        ? '⚠ Projector not downloaded yet — download the mmproj file alongside the model'
                        : '✓ Vision enabled — --mmproj will be added to the launch command'
                    : 'Toggle on and set path to enable image / video inputs for this model'}
                </p>
              </div>

              {/* Server Auto-Start Controls */}
              <div className="rounded-2xl overflow-hidden border border-[var(--theme-border)] bg-[#0d0f14] shadow-md">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#141822]/80 border-b border-[var(--theme-border)]/40 select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    <span className="text-[10px] text-gray-500 font-mono pl-1.5 uppercase font-bold tracking-wider">llama-server Controller</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {!serverPid ? (
                    <button
                      onClick={handleStartServer}
                      disabled={serverStarting}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {serverStarting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Starting server...</span>
                        </>
                      ) : (
                        <>
                          <Play size={14} />
                          <span>Start llama-server</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleStopServer}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Square size={14} />
                      <span>Stop llama-server</span>
                    </button>
                  )}

                  {/* Server Log */}
                  {serverLog.length > 0 && (
                    <div className="p-3 rounded-xl bg-zinc-950 border border-white/5 text-[10px] font-mono text-zinc-400 leading-relaxed max-h-[120px] overflow-y-auto custom-scrollbar">
                      {serverLog.map((line, i) => (
                        <div key={i} className={line.includes('ERROR') ? 'text-red-400' : ''}>{line}</div>
                      ))}
                    </div>
                  )}

                  {serverError && (
                    <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/20 text-[11px] text-red-400 font-mono">
                      {serverError}
                    </div>
                  )}
                </div>
              </div>

              {/* CLI command shown as fallback */}
              <details className="group">
                <summary className="text-[10px] text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] cursor-pointer select-none font-semibold">
                  Show manual CLI command (fallback)
                </summary>
                <div className="mt-2 rounded-xl overflow-hidden border border-[var(--theme-border)] bg-[#0d0f14]">
                  <div className="px-3 py-2 bg-[#141822]/60 border-b border-[var(--theme-border)]/30 flex items-center justify-between">
                    <span className="text-[9px] text-gray-500 font-mono">PowerShell / Terminal</span>
                    <button
                      onClick={handleCopyCliCommand}
                      className="text-[9px] text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {copiedCommand ? <><Check size={10} className="text-emerald-400" /> Copied</> : <><Copy size={10} /> Copy</>}
                    </button>
                  </div>
                  <div className="p-3 font-mono text-[10px] text-gray-400 whitespace-pre-wrap select-all">
                    {generatedCommand}
                  </div>
                </div>
              </details>

              {/* Live Connection Meter */}
              <div className="p-5 rounded-2xl border border-[var(--theme-border)] bg-gray-500/5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--theme-primary)]">Local Server Status</span>
                  
                  {connectionState === 'testing' ? (
                    <span className="flex items-center gap-1.5 text-xs text-amber-500 font-bold font-mono bg-amber-500/10 px-2.5 py-1 border border-amber-500/10 rounded-full animate-pulse select-none">
                      <RefreshCw size={11} className="animate-spin" />
                      <span>Checking...</span>
                    </span>
                  ) : connectionState === 'connected' ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold font-mono bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/15 rounded-full select-none">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      <span>Online & Connected</span>
                    </span>
                  ) : connectionState === 'failed' ? (
                    <span className="flex items-center gap-1.5 text-xs text-red-500 font-bold font-mono bg-red-500/10 px-2.5 py-1 border border-red-500/15 rounded-full select-none animate-bounce">
                      <span>Offline / Waiting</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-[var(--theme-muted)] font-bold font-mono bg-[var(--theme-surface-alt)] px-2.5 py-1 border border-[var(--theme-border)] rounded-full select-none">
                      <span>Not Checked</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--theme-secondary)]">
                  <span>Connection URL:</span>
                  <span className="font-mono text-[var(--theme-primary)] font-semibold bg-[var(--theme-surface-alt)] px-2 py-0.5 border border-[var(--theme-border)] rounded-lg">http://{localHost}:{localPort}</span>
                </div>

                <div className="pt-2 flex gap-3 select-none">
                  <button
                    onClick={handleVerifyConnection}
                    disabled={testingConnection}
                    className="flex-1 text-center py-2 border border-[var(--theme-border)] bg-[var(--theme-surface-alt)] hover:bg-[var(--theme-hover-bg)] text-xs text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] font-bold rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {testingConnection ? "Pinging Host..." : "Verify Connection"}
                  </button>
                  
                  <button
                    onClick={() => {
                      setConnectionState('connected');
                      showToast("Manual connection override applied. Ready to use LLM!");
                    }}
                    className="text-center px-3.5 py-2 hover:bg-[var(--theme-surface-alt)] text-[10px] font-bold text-[var(--theme-muted)] hover:text-[var(--theme-secondary)] border border-dashed border-[var(--theme-border)] rounded-xl transition-all cursor-pointer"
                    title="If you already know the server is running but browser CORS blocks direct checking, run this override"
                  >
                    Override Active
                  </button>
                </div>

                {detectedCapabilities.isVision && connectionState === 'connected' && (
                  <div className="mt-3 p-3.5 rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface-alt)]/30 space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[var(--theme-primary)] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        Vision Transduction Probe
                      </span>
                      
                      {visionVerificationState === 'verifying' ? (
                        <span className="text-[10px] text-amber-500 font-bold font-mono animate-pulse">Verifying...</span>
                      ) : visionVerificationState === 'active' ? (
                        <span className="text-[10px] text-emerald-500 font-bold font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">Active & Ready</span>
                      ) : visionVerificationState === 'inactive' ? (
                        <span className="text-[10px] text-red-500 font-bold font-mono bg-red-500/10 px-2 py-0.5 rounded border border-red-500/15">Inactive Projector</span>
                      ) : (
                        <span className="text-[10px] text-[var(--theme-muted)] font-mono">Not Probed</span>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-[var(--theme-secondary)] leading-relaxed">
                      Sends a solid 1x1 base64 red PNG probe request to test base LLM & projector compatibility.
                    </p>
                    
                    <button
                      onClick={handleVerifyVision}
                      disabled={visionVerificationState === 'verifying'}
                      className={`w-full text-center py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                        visionVerificationState === 'active'
                          ? 'bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20'
                          : 'bg-[var(--theme-accent,#3b82f6)] hover:bg-[var(--theme-accent,#3b82f6)]/90 text-white shadow-sm'
                      }`}
                    >
                      {visionVerificationState === 'verifying' ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Testing Transduction...</span>
                        </>
                      ) : visionVerificationState === 'active' ? (
                        <>
                          <Check size={12} />
                          <span>Vision Officially Active!</span>
                        </>
                      ) : (
                        <span>Test Vision Pipeline</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions bar */}
        <div className="px-5 py-4 border-t border-[var(--theme-border)] bg-[var(--theme-surface-alt)]/40 select-none flex items-center justify-between shrink-0">
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs select-none text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-colors">
              <input
                type="checkbox"
                checked={rememberSettings}
                onChange={() => setRememberSettings(!rememberSettings)}
                className="rounded border-[var(--theme-border)] bg-[var(--theme-input-bg)] text-[var(--theme-accent,#3b82f6)] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Remember settings for model</span>
            </label>

            {setupStep === 'config' && (
              <div className="flex items-center gap-2 animate-fade-in">
                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`relative inline-flex h-5 w-8.5 shrink-0 cursor-pointer rounded-full transition-colors duration-250 ease-in-out border border-transparent ${showAdvanced ? 'bg-[var(--theme-accent,#3b82f6)] shadow-sm' : 'bg-[var(--theme-border)]'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-250 ease-in-out ${showAdvanced ? 'translate-x-[14px]' : 'translate-x-[0.5px]'}`} />
                </button>
                <span className="text-xs text-[var(--theme-secondary)] font-medium">Show advanced features</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {setupStep === 'config' ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] rounded-xl text-xs font-semibold border border-[var(--theme-border)] cursor-pointer transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNextStep}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--theme-accent,#3b82f6)] hover:bg-[var(--theme-accent,#3b82f6)]/90 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all hover:shadow-lg hover:shadow-[var(--theme-accent,#3b82f6)]/15 active:scale-95"
                >
                  <span>Next: CLI Setup</span>
                  <ChevronRight size={12} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSetupStep('config')}
                  className="px-4 py-2 hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] rounded-xl text-xs font-semibold border border-[var(--theme-border)] cursor-pointer transition-all active:scale-95"
                >
                  Back
                </button>
                
                <button
                  onClick={handleDoneClick}
                  disabled={connectionState !== 'connected'}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${
                    connectionState === 'connected' 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/10' 
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Check size={12} />
                  <span>Start Live Chat</span>
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};