import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Box,
  Activity,
  Cpu,
  Layers,
  Wifi,
  Terminal,
  Settings,
  RefreshCw,
  Play,
  StopCircle,
  FolderOpen,
  Shield,
  HardDrive,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus
} from 'lucide-react';

interface VmCorePanelProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function VmCorePanel({ isOpen, onClose, showToast }: VmCorePanelProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'vms' | 'terminal' | 'network'>('status');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [networkPolicies, setNetworkPolicies] = useState<Record<string, any>>({});
  
  // Terminal commands state
  const [selectedVmId, setSelectedVmId] = useState<string>('');
  const [terminalCommand, setTerminalCommand] = useState<string>('');
  const [terminalOutput, setTerminalOutput] = useState<Array<{ type: 'input' | 'stdout' | 'stderr' | 'status'; text: string; time: string }>>([]);
  const [executingCommand, setExecutingCommand] = useState(false);

  // New VM configuration state
  const [acquireAgentId, setAcquireAgentId] = useState('lumina-core-agent');
  const [acquireWorkspacePath, setAcquireWorkspacePath] = useState('');

  // Mount configuration state
  const [mountHostPath, setMountHostPath] = useState('');
  const [mountGuestPath, setMountGuestPath] = useState('/workspace');
  const [mountReadOnly, setMountReadOnly] = useState(false);

  // Load sandbox general status
  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sandbox/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        // Pre-select VM if available and not selected
        if (data.pool?.activeVms && data.pool.activeVms.length > 0 && !selectedVmId) {
          setSelectedVmId(data.pool.activeVms[0]);
        }
      } else {
        const errorText = await res.text();
        console.error('Error fetching sandbox status:', errorText);
      }
    } catch (err) {
      console.error('Failed to fetch sandbox status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedVmId]);

  // Load diagnostics status
  const fetchDiagnostics = useCallback(async () => {
    try {
      const res = await fetch('/api/sandbox/diagnostics', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
      }
    } catch (err) {
      console.error('Failed to fetch diagnostics:', err);
    }
  }, []);

  // Fetch policy for a specific VM
  const fetchNetworkPolicy = useCallback(async (vmId: string) => {
    try {
      const res = await fetch(`/api/sandbox/network/policy/${vmId}`);
      if (res.ok) {
        const data = await res.json();
        setNetworkPolicies(prev => ({ ...prev, [vmId]: data }));
      }
    } catch (err) {
      console.error(`Failed to fetch policy for ${vmId}:`, err);
    }
  }, []);

  // Load everything when opened
  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      fetchDiagnostics();
    }
  }, [isOpen, fetchStatus, fetchDiagnostics]);

  // Load VM policies on VM selection changes
  useEffect(() => {
    if (status?.pool?.activeVms) {
      status.pool.activeVms.forEach((vmId: string) => {
        fetchNetworkPolicy(vmId);
      });
    }
  }, [status?.pool?.activeVms, fetchNetworkPolicy]);

  // VM sandbox controls
  const handleInitialize = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sandbox/initialize', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Sandbox Core initialized successfully.');
        fetchStatus();
        fetchDiagnostics();
      } else {
        showToast(`Initialization failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyInstall = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sandbox/install', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Sandbox installation verified successfully.');
      } else {
        showToast(`Verification failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShutdown = async () => {
    if (!window.confirm('Are you sure you want to shut down the entire sandbox environment? This releases all active virtual machines.')) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/sandbox/shutdown', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Sandbox environment shut down.');
        setStatus(null);
        setDiagnostics(null);
        fetchStatus();
      } else {
        showToast(`Shutdown failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // VM Specific operators
  const handleAcquireVm = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sandbox/vm/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: acquireAgentId.trim() || 'lumina-core-agent',
          workspacePath: acquireWorkspacePath.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Acquired Sandbox VM: ${data.vmId}`);
        setAcquireWorkspacePath('');
        fetchStatus();
      } else {
        showToast(`Failed to allocate VM: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReleaseVm = async (vmId: string) => {
    if (!window.confirm(`Are you sure you want to release VM ${vmId}? Unsaved changes in guest OS will be lost.`)) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/sandbox/vm/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vmId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Released VM: ${vmId}`);
        if (selectedVmId === vmId) setSelectedVmId('');
        fetchStatus();
      } else {
        showToast(`Failed to release: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateNetworkPolicy = async (vmId: string, updatedPolicyFields: Partial<any>) => {
    const currentPolicy = networkPolicies[vmId] || {
      allowNone: true,
      allowGitHub: false,
      allowNpm: false,
      allowPyPI: false,
      allowInternet: false,
      customDomains: []
    };
    const nextPolicy = { ...currentPolicy, ...updatedPolicyFields };
    
    // Auto-adjust Allow None if something else is set to true
    if (updatedPolicyFields.allowInternet || updatedPolicyFields.allowGitHub || updatedPolicyFields.allowNpm || updatedPolicyFields.allowPyPI) {
      nextPolicy.allowNone = false;
    } else if (updatedPolicyFields.allowNone) {
      nextPolicy.allowInternet = false;
      nextPolicy.allowGitHub = false;
      nextPolicy.allowNpm = false;
      nextPolicy.allowPyPI = false;
    }

    try {
      const res = await fetch('/api/sandbox/network/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vmId, policy: nextPolicy })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNetworkPolicies(prev => ({ ...prev, [vmId]: nextPolicy }));
        showToast(`Updated Network Policy for VM ${vmId}`);
      } else {
        showToast(`Failed to update policy: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleMountWorkspace = async (vmId: string) => {
    if (!mountHostPath.trim()) {
      showToast('Please provide a host folder path to mount.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/sandbox/workspace/mount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vmId,
          hostPath: mountHostPath.trim(),
          guestPath: mountGuestPath.trim() || '/workspace',
          readOnly: mountReadOnly
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Mounted host path to guest VM ${vmId}`);
        setMountHostPath('');
      } else {
        showToast(`Failed to mount path: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Run shell commands inside VM sandbox
  const handleExecuteCommand = async () => {
    if (!selectedVmId) {
      showToast('Select a running Sandbox VM to execute commands.');
      return;
    }
    if (!terminalCommand.trim()) return;

    const cmd = terminalCommand;
    setTerminalCommand('');
    const curTime = new Date().toLocaleTimeString();
    setTerminalOutput(prev => [...prev, { type: 'input', text: `$ ${cmd}`, time: curTime }]);
    setExecutingCommand(true);

    try {
      // Get current policy
      const policy = networkPolicies[selectedVmId] || undefined;
      const res = await fetch('/api/sandbox/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vmId: selectedVmId,
          command: cmd,
          cwd: '/workspace',
          network: policy
        })
      });

      const data = await res.json();
      const resTime = new Date().toLocaleTimeString();
      if (res.ok) {
        const lines: any[] = [];
        if (data.stdout) {
          lines.push({ type: 'stdout', text: data.stdout, time: resTime });
        }
        if (data.stderr) {
          lines.push({ type: 'stderr', text: data.stderr, time: resTime });
        }
        lines.push({
          type: 'status',
          text: `[Process Exited with Code ${data.exitCode} | Duration: ${data.durationMs}ms]`,
          time: resTime
        });
        setTerminalOutput(prev => [...prev, ...lines]);
      } else {
        setTerminalOutput(prev => [...prev, { type: 'stderr', text: data.error || 'Unknown error during execution', time: resTime }]);
      }
    } catch (err: any) {
      setTerminalOutput(prev => [...prev, { type: 'stderr', text: `Failed to speak to Sandbox host API: ${err.message}`, time: new Date().toLocaleTimeString() }]);
    } finally {
      setExecutingCommand(false);
    }
  };

  return (
    <div
      className="w-full h-full bg-zinc-950 text-white overflow-hidden flex flex-col md:flex-row font-mono"
      id="vm-core-panel"
    >
      {/* Left navigation rail */}
      <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-zinc-900 bg-zinc-950 p-5 flex flex-col justify-between select-none shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1 text-teal-400">
                  <Box size={18} className="text-teal-400 animate-pulse" />
                  <div>
                    <h3 className="font-mono text-xs font-bold tracking-widest uppercase text-zinc-100">VM CORE</h3>
                    <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">SANDBOX METRICS ENGINE</p>
                  </div>
                </div>

                <nav className="space-y-1">
                  {[
                    { id: 'status', label: 'Dashboard Control', icon: <Activity size={13} /> },
                    { id: 'vms', label: 'Allocated Pools', icon: <Layers size={13} /> },
                    { id: 'network', label: 'Policies & Mounts', icon: <Shield size={13} /> },
                    { id: 'terminal', label: 'Sandbox Terminal', icon: <Terminal size={13} /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-teal-600/15 text-teal-400 border border-teal-500/20 shadow-md'
                          : 'text-zinc-400 hover:text-zinc-250 hover:bg-zinc-900/40 border border-transparent'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Status statistics panel footer */}
              <div className="pt-4 border-t border-zinc-900/60 text-[10px] text-zinc-500 space-y-1.5 px-0.5">
                <div className="flex items-center justify-between">
                  <span>Hypervisor</span>
                  <span className="text-zinc-300 font-bold capitalize">
                    {diagnostics?.host?.windowsVersion ? 'Hyper-V Native' : 'QEMU/Bare'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sandbox State</span>
                  <span className={`font-bold uppercase ${status?.initialized ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`}>
                    {status?.initialized ? 'Ready' : 'Stopped'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pool capacity</span>
                  <span className="text-zinc-300 font-bold">
                    {status?.pool?.activeVms?.length || 0} / {status?.config?.vmCount || 4}
                  </span>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={async () => {
                      await fetchStatus();
                      await fetchDiagnostics();
                      showToast('Refreshed Sandbox Virtual Machine Core telemetry.');
                    }}
                    className="flex items-center gap-1 text-[9px] text-teal-500 hover:text-teal-400 transition-colors uppercase font-bold"
                  >
                    <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
                    <span>REFRESH</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content Window area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header bar */}
              <div className="flex items-center justify-between p-5 border-b border-zinc-900 bg-zinc-950/40 select-none">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${status?.initialized ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></span>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
                    {activeTab === 'status' && 'VM Dashboard Controller'}
                    {activeTab === 'vms' && 'Active Virtual Machine Pools'}
                    {activeTab === 'network' && 'Guest Security Policies'}
                    {activeTab === 'terminal' && 'Sandbox Command Interpreter'}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-zinc-900 bg-zinc-950 border border-zinc-800 rounded-full transition-all text-zinc-400 hover:text-white cursor-pointer"
                  title="Close core panel"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Main Tab Screen Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/20 custom-scrollbar relative">
                {isLoading && (
                  <div className="absolute top-3 right-5 flex items-center gap-1.5 text-[9px] text-teal-500 font-semibold select-none leading-none animate-pulse">
                    <RefreshCw size={9} className="animate-spin" />
                    <span>SYNCHRONIZING TELEMETRY...</span>
                  </div>
                )}

                {/* TAB 1: DASHBOARD CONTROL */}
                {activeTab === 'status' && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="text-xs text-zinc-405 leading-relaxed font-sans">
                      Establish individual sandbox boundaries, spin hypervisor virtualization runtimes, and monitor state machines safely inside this environment.
                    </div>

                    {/* Core settings view cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Host Diagnostics Card */}
                      <div className="border border-zinc-900 bg-zinc-900/20 p-5 rounded-2xl relative overflow-hidden">
                        <div className="absolute -right-3 -top-3 text-zinc-900 select-none">
                          <Cpu size={80} />
                        </div>
                        <h4 className="text-xs font-bold text-teal-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                          <Cpu size={14} />
                          <span>Hypervisor Host Status</span>
                        </h4>
                        <div className="text-[10px] text-zinc-400 space-y-1.5 font-mono relative z-10">
                          <div>WSL Available: <span className={diagnostics?.host ? (diagnostics?.host?.wslInstalled ? 'text-teal-400' : 'text-zinc-500') : 'text-zinc-600'}>{diagnostics ? (diagnostics.host?.wslInstalled ? 'DETECTED' : 'NOT DETECTED') : 'CHECKING...'}</span></div>
                          <div>Hyper-V Available: <span className={diagnostics?.host ? (diagnostics?.host?.hyperVSupported ? 'text-teal-400' : 'text-zinc-500') : 'text-zinc-600'}>{diagnostics ? (diagnostics.host?.hyperVSupported ? 'DETECTED' : 'NOT DETECTED') : 'CHECKING...'}</span></div>
                          <div>CPU Virtualization: <span className={diagnostics?.host ? (diagnostics?.host?.cpuVirtualization ? 'text-teal-400' : 'text-orange-400') : 'text-zinc-600'}>{diagnostics ? (diagnostics.host?.cpuVirtualization ? 'ENABLED' : 'DISABLED') : 'CHECKING...'}</span></div>
                          <div>System Memory: <span className="text-zinc-300 font-bold">{diagnostics?.host?.totalRamGb ? `${diagnostics.host.totalRamGb} GB` : (diagnostics ? '8.00 GB (Shared)' : 'CHECKING...')}</span></div>
                          <div>Free Disk Volume: <span className="text-zinc-300 font-bold">{diagnostics?.host?.freeDiskGb ? `${diagnostics.host.freeDiskGb} GB` : (diagnostics ? '20.00 GB' : 'CHECKING...')}</span></div>
                        </div>
                      </div>

                      {/* Sandbox Properties Card */}
                      <div className="border border-zinc-900 bg-zinc-900/20 p-5 rounded-2xl relative overflow-hidden">
                        <div className="absolute -right-2 -top-2 text-zinc-900 select-none">
                          <Settings size={75} />
                        </div>
                        <h4 className="text-xs font-bold text-teal-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                          <Settings size={14} />
                          <span>VM Virtualization Limits</span>
                        </h4>
                        <div className="text-[10px] text-zinc-400 space-y-1.5 font-mono relative z-10">
                          <div>Max VMs Cap: <span className="text-zinc-200 font-bold">{status?.config?.vmCount || 4} Units</span></div>
                          <div>Cores Allocated Per VM: <span className="text-zinc-200 font-bold">{status?.config?.vmCpuCount || 2} Cores</span></div>
                          <div>System Memory Allocation: <span className="text-indigo-400 font-bold">{status?.config?.vmMemoryMb || 2048} MB RAM</span></div>
                          <div>Max Disk Limit: <span className="text-zinc-200 font-bold">{status?.config?.vmDiskMb || 5120} MB Dynamic size</span></div>
                          <div>Active Sandbox Ports: <span className="text-indigo-400 font-bold">Port 3000 mapping (WSOCK)</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Operational controls button set */}
                    <div className="border border-zinc-900 bg-zinc-900/10 p-5 rounded-2xl">
                      <h4 className="text-xs font-bold text-zinc-200 mb-4 uppercase tracking-wider">Global Hypervisor Commands</h4>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={handleInitialize}
                          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold rounded-xl text-xs uppercase cursor-pointer shadow-md transition-all active:scale-95"
                        >
                          <Play size={13} />
                          <span>Boot hyper-v sandbox</span>
                        </button>
                        <button
                          onClick={handleVerifyInstall}
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs uppercase cursor-pointer transition-all active:scale-95"
                        >
                          <CheckCircle size={13} />
                          <span>Assert Installs</span>
                        </button>
                        <button
                          onClick={handleShutdown}
                          className="flex items-center gap-2 px-4 py-2 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/10 text-rose-400 rounded-xl text-xs uppercase cursor-pointer transition-all active:scale-95"
                        >
                          <StopCircle size={13} />
                          <span>Emergency Force Cleanup</span>
                        </button>
                      </div>
                    </div>

                    {/* Health State Info log panel */}
                    <div className="border border-zinc-900 bg-zinc-900/30 p-4 rounded-xl relative select-text">
                      <div className="flex items-center justify-between mb-3.5 select-none">
                        <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
                          <Activity size={12} className="text-teal-400" />
                          <span>Realtime diagnostics Logs</span>
                        </h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 animate-pulse">TELEMETRY SECURE</span>
                      </div>
                      <div className="space-y-1 font-mono text-[10px] text-zinc-500 leading-relaxed md:max-h-24 overflow-y-auto">
                        <div>[HEALTH] Handshaking hypervisor system daemon socket parameters... <span className="text-emerald-400">SUCCESS</span></div>
                        <div>[HEALTH] VM Pool status check active. Idle: {status?.pool?.idleCount ?? 0} | Allocated: {status?.pool?.allocatedCount ?? 0}</div>
                        <div>[HEALTH] Mounting virtual storage disks mapping parameters successfully.</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: ACTIVE VMS POOL */}
                {activeTab === 'vms' && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex justify-between items-center select-none">
                      <p className="text-xs text-zinc-450 font-sans">
                        Deploy fresh on-demand micro-operating systems for running hazardous code execution libraries safely.
                      </p>
                    </div>

                    {/* New Sandbox VM allocation form panel */}
                    <div className="border border-zinc-900 bg-zinc-900/20 p-5 rounded-2xl space-y-4">
                      <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Plus size={14} className="text-teal-400" />
                        <span>Allocate Single Guest VM Sandbox</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Target Client Agent Tag</label>
                          <input
                            type="text"
                            value={acquireAgentId}
                            onChange={(e) => setAcquireAgentId(e.target.value)}
                            placeholder="lumina-core-agent"
                            className="w-full bg-black border border-zinc-900 rounded-xl h-9.5 px-3 font-mono text-xs text-zinc-350 outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Host Folder Scope (Mount Path)</label>
                          <input
                            type="text"
                            value={acquireWorkspacePath}
                            onChange={(e) => setAcquireWorkspacePath(e.target.value)}
                            placeholder="C:/projects/myapp-sandbox (Optional)"
                            className="w-full bg-black border border-zinc-900 rounded-xl h-9.5 px-3 font-mono text-xs text-zinc-350 outline-none"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleAcquireVm}
                        className="w-full h-9.5 bg-teal-600 hover:bg-teal-500 text-slate-805 font-bold rounded-xl text-xs transition-all uppercase cursor-pointer"
                      >
                        SPIN ON-DEMAND CONTAINER
                      </button>
                    </div>

                    {/* Vms list cards Container */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider select-none">Active Sandbox Pool Allocation Map</h4>
                      
                      {(!status?.pool?.activeVms || status.pool.activeVms.length === 0) ? (
                        <div className="border border-dashed border-zinc-900 p-8 rounded-2xl flex flex-col items-center justify-center text-zinc-500 text-xs italic space-y-3">
                          <AlertCircle size={22} className="text-zinc-600 animate-bounce" />
                          <span>No virtual machines currently active in the VM pool. Use the allocation panel above to boot one.</span>
                        </div>
                      ) : (
                        status.pool.activeVms.map((vmId: string, idx: number) => {
                          const isCurSelected = selectedVmId === vmId;
                          return (
                            <div
                              key={vmId}
                              className={`border p-5 rounded-2xl flex flex-col md:flex-row gap-5 justify-between items-start md:items-center relative transition-all duration-300 ${
                                isCurSelected
                                  ? 'border-teal-500/45 bg-teal-500/[0.02] shadow-[0_0_15px_rgba(20,184,166,0.02)]'
                                  : 'border-zinc-900 bg-zinc-900/10'
                              }`}
                            >
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <Box size={20} className={isCurSelected ? 'text-teal-400' : 'text-zinc-500'} />
                                <div className="space-y-1 block min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-zinc-200 font-mono truncate">{vmId}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-900/50 text-teal-400">RUNNING</span>
                                    {idx === 0 && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400">DEFAULT</span>}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 font-mono flex flex-wrap gap-4 pt-1">
                                    <div>Allocation Tag: <span className="text-zinc-400">sandbox</span></div>
                                    <div>Core Threading: <span className="text-zinc-400">{status?.config?.vmCpuCount || 2} Threads</span></div>
                                    <div>Allocated Memory: <span className="text-zinc-400">{status?.config?.vmMemoryMb || 2048} MB</span></div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2 shrink-0 self-stretch sm:self-auto justify-end">
                                <button
                                  onClick={() => {
                                    setSelectedVmId(vmId);
                                    setActiveTab('terminal');
                                    showToast(`Hooked terminal instance to VM ${vmId}`);
                                  }}
                                  className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 uppercase cursor-pointer"
                                >
                                  <Terminal size={12} />
                                  <span>TTY CONSOLE</span>
                                </button>
                                <button
                                  onClick={() => handleReleaseVm(vmId)}
                                  className="p-2.5 bg-rose-950/20 hover:bg-rose-950/50 border border-rose-500/10 text-rose-455 rounded-xl transition-all cursor-pointer hover:text-rose-400"
                                  title="Terminate and purge VM storage"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}

                {/* TAB 3: Guest Security Policies & Mounts */}
                {activeTab === 'network' && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <p className="text-xs text-zinc-405 leading-relaxed font-sans">
                      Design robust firewall gateways and manage workspace filesystem directory sharing maps into virtualization contexts.
                    </p>

                    {(!status?.pool?.activeVms || status.pool.activeVms.length === 0) ? (
                      <div className="border border-dashed border-zinc-900 p-8 rounded-2xl flex flex-col items-center justify-center text-zinc-500 text-xs italic space-y-3 select-none">
                        <AlertCircle size={22} className="text-zinc-600" />
                        <span>No sandbox virtual machines are running. Boot a VM inside the 'Allocated Pools' tab to configure guest security.</span>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {status.pool.activeVms.map((vmId: string) => {
                          const policy = networkPolicies[vmId] || {
                            allowNone: true,
                            allowGitHub: false,
                            allowNpm: false,
                            allowPyPI: false,
                            allowInternet: false,
                            customDomains: []
                          };

                          return (
                            <div key={vmId} className="border border-zinc-900 bg-zinc-900/10 p-5 rounded-2xl space-y-5">
                              <div className="flex items-center gap-2 select-none">
                                <Shield size={16} className="text-teal-400" />
                                <h4 className="text-xs font-bold text-zinc-200">Security Guard constraints for VM: <span className="text-teal-400 font-mono select-all font-semibold ml-1">{vmId}</span></h4>
                              </div>

                              {/* Policy controls */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-black/40 p-4 rounded-xl border border-zinc-900">
                                {[
                                  { label: 'Isolated LAN', desc: 'Deny all network', field: 'allowNone' },
                                  { label: 'GitHub Mirror', desc: 'Secure repository pulls', field: 'allowGitHub' },
                                  { label: 'NPM Registry', desc: 'Install node libraries', field: 'allowNpm' },
                                  { label: 'PyPI Access', desc: 'Pip package installer', field: 'allowPyPI' },
                                ].map((item) => {
                                  const isActive = policy[item.field];
                                  return (
                                    <button
                                      key={item.field}
                                      onClick={() => handleUpdateNetworkPolicy(vmId, { [item.field]: !isActive })}
                                      className={`p-3.5 rounded-xl border text-left transition-all ${
                                        isActive
                                          ? 'border-indigo-500/40 bg-indigo-500/[0.04] text-indigo-400'
                                          : 'border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-300'
                                      }`}
                                    >
                                      <div className="text-[11px] font-bold font-mono tracking-tight">{item.label}</div>
                                      <div className="text-[9px] text-zinc-500 font-sans leading-tight mt-1">{item.desc}</div>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Mount setup */}
                              <div className="space-y-3">
                                <h5 className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Mount Local Workspace directory to Guest OS</h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="space-y-1 block">
                                    <span className="text-[9px] text-zinc-505 font-mono">HOST DIRECTORY ABS PATH</span>
                                    <input
                                      type="text"
                                      value={mountHostPath}
                                      onChange={(e) => setMountHostPath(e.target.value)}
                                      placeholder="e.g. C:/myprojects/myfiles"
                                      className="w-full bg-black border border-zinc-900 rounded-xl h-9.5 px-3 font-mono text-xs text-zinc-350 outline-none focus:border-teal-500/50"
                                    />
                                  </div>
                                  <div className="space-y-1 block">
                                    <span className="text-[9px] text-zinc-505 font-mono">GUEST TARGET PATH inside VM</span>
                                    <input
                                      type="text"
                                      value={mountGuestPath}
                                      onChange={(e) => setMountGuestPath(e.target.value)}
                                      placeholder="/workspace"
                                      className="w-full bg-black border border-zinc-900 rounded-xl h-9.5 px-3 font-mono text-xs text-zinc-350 outline-none focus:border-teal-500/50"
                                    />
                                  </div>
                                  <div className="flex items-end gap-3">
                                    <button
                                      onClick={() => setMountReadOnly(!mountReadOnly)}
                                      className={`h-9.5 px-3.5 border rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold w-full uppercase ${
                                        mountReadOnly
                                          ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
                                          : 'border-zinc-900 text-zinc-400'
                                      }`}
                                    >
                                      <span>Read Only</span>
                                      <span className="text-[9px]">{mountReadOnly ? 'ON' : 'OFF'}</span>
                                    </button>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleMountWorkspace(vmId)}
                                  className="w-full h-9 px-4 bg-teal-600 hover:bg-teal-500 text-slate-805 rounded-xl text-xs font-bold uppercase cursor-pointer"
                                >
                                  EXECUTE STORAGE MOUNT HANDSHAKE
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* TAB 4: SANDBOX Command Terminal */}
                {activeTab === 'terminal' && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full space-y-4">
                    <p className="text-xs text-zinc-405 font-sans leading-relaxed select-none">
                      Execute real-time low-level commands securely locked inside specific sandboxed isolated guest VMs. Output capture includes process indicators and timing.
                    </p>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 select-none">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Scoped VM Scope:</span>
                        <select
                          value={selectedVmId}
                          onChange={(e) => setSelectedVmId(e.target.value)}
                          className="bg-zinc-900 border border-zinc-800 text-xs px-2.5 py-1.5 rounded-lg text-teal-400 font-mono outline-none cursor-pointer focus:border-teal-500/40"
                        >
                          <option value="">No Active VM Target</option>
                          {status?.pool?.activeVms?.map((vmId: string) => (
                            <option key={vmId} value={vmId}>{vmId} (sandbox)</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => setTerminalOutput([])}
                        className="px-2.5 py-1 text-[9px] bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-805 text-zinc-400 font-bold tracking-wider uppercase transition-colors"
                      >
                        WIPEOUT TTY SCREEN
                      </button>
                    </div>

                    {/* Terminal Display screen */}
                    <div className="bg-black border border-zinc-900 rounded-3xl p-5 h-[230px] overflow-y-auto custom-scrollbar font-mono text-xs text-zinc-300 space-y-2 select-text relative">
                      {terminalOutput.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-650 pointer-events-none text-center p-4">
                          <Terminal size={24} className="mb-2 text-zinc-700 font-bold" />
                          <p className="text-[11px] leading-relaxed">System terminal connected as root@lumina-guest. <br /> Type standard bash statements to interact with the Guest OS environment (/workspace scope).</p>
                        </div>
                      )}

                      {terminalOutput.map((log, index) => (
                        <div key={index} className="flex gap-2 items-start leading-relaxed bg-transparent">
                          <span className="text-zinc-650 shrink-0 select-none font-medium">[{log.time}]</span>
                          <div className={`shrink-0 select-none font-bold uppercase text-[9px] px-1.5 py-0.2 rounded mt-0.5 ${
                            log.type === 'input' ? 'bg-zinc-900 text-teal-400' :
                            log.type === 'stdout' ? 'bg-zinc-900 text-zinc-300' :
                            log.type === 'stderr' ? 'bg-rose-950/35 text-rose-400 border border-rose-500/10' :
                            'bg-indigo-950/35 text-indigo-400 border border-indigo-505/10'
                          }`}>
                            {log.type === 'input' ? 'stdin' : log.type === 'stdout' ? 'stdout' : log.type === 'stderr' ? 'stderr' : 'vm-sys'}
                          </div>
                          <span className="break-all whitespace-pre-wrap select-text font-mono flex-1 leading-normal">{log.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* CMD line compose */}
                    <div className="border border-zinc-900 bg-zinc-900/15 p-3 rounded-2xl flex gap-2">
                      <input
                        type="text"
                        value={terminalCommand}
                        onChange={(e) => setTerminalCommand(e.target.value)}
                        placeholder={selectedVmId ? "Enter bash commands (e.g. 'ls -la', 'npm install', 'node -v')..." : "Please allocate and select a VM to type instructions..."}
                        disabled={!selectedVmId || executingCommand}
                        className="flex-1 h-10 px-3.5 bg-black text-xs border border-zinc-900 rounded-xl text-teal-400 font-mono outline-none focus:border-teal-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleExecuteCommand();
                          }
                        }}
                      />
                      <button
                        onClick={handleExecuteCommand}
                        disabled={!selectedVmId || executingCommand || !terminalCommand.trim()}
                        className="px-5 bg-teal-600 hover:bg-teal-505 disabled:bg-zinc-900 text-slate-905 disabled:text-zinc-600 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer uppercase font-sans"
                      >
                        {executingCommand ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            <span>EXEC...</span>
                          </>
                        ) : (
                          <>
                            <Play size={12} />
                            <span>RUN</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

              </div>
            </div>
    </div>
  );
}
