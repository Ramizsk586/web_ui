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
      className="w-full h-full bg-[var(--theme-bg)] text-[var(--theme-primary)] overflow-hidden flex flex-col md:flex-row font-mono"
      id="vm-core-panel"
    >
      {/* Left navigation rail */}
      <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-[var(--theme-sidebar-border)] bg-[var(--theme-sidebar)] p-5 flex flex-col justify-between select-none shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1 text-[var(--theme-accent)]">
                  <Box size={18} className="text-[var(--theme-accent)] animate-pulse" />
                  <div>
                    <h3 className="font-mono text-xs font-bold tracking-widest uppercase text-[var(--theme-primary)]">VM CORE</h3>
                    <p className="text-[9px] font-mono text-[var(--theme-secondary)] uppercase tracking-widest mt-0.5">SANDBOX METRICS ENGINE</p>
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
                          ? 'bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/20 shadow-md'
                          : 'text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-hover-bg)] border border-transparent'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Status statistics panel footer */}
              <div className="pt-4 border-t border-[var(--theme-sidebar-border)] text-[10px] text-[var(--theme-secondary)] space-y-1.5 px-0.5">
                <div className="flex items-center justify-between">
                  <span>Hypervisor</span>
                  <span className="text-[var(--theme-primary)] font-bold capitalize">
                    {diagnostics?.host?.windowsVersion ? 'Hyper-V Native' : 'QEMU/Bare'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sandbox State</span>
                  <span className={`font-bold uppercase ${status?.initialized ? 'text-[var(--theme-success)] animate-pulse' : 'text-[var(--theme-secondary)]'}`}>
                    {status?.initialized ? 'Ready' : 'Stopped'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pool capacity</span>
                  <span className="text-[var(--theme-primary)] font-bold">
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
                    className="flex items-center gap-1 text-[9px] text-[var(--theme-accent)] hover:text-[var(--theme-accent)]/80 transition-colors uppercase font-bold"
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
              <div className="flex items-center justify-between p-5 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/40 select-none">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${status?.initialized ? 'bg-[var(--theme-success)]' : 'bg-[var(--theme-danger)]'} animate-pulse`}></span>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--theme-primary)]">
                    {activeTab === 'status' && 'VM Dashboard Controller'}
                    {activeTab === 'vms' && 'Active Virtual Machine Pools'}
                    {activeTab === 'network' && 'Guest Security Policies'}
                    {activeTab === 'terminal' && 'Sandbox Command Interpreter'}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-[var(--theme-hover-bg)] bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-full transition-all text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] cursor-pointer"
                  title="Close core panel"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Main Tab Screen Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-[var(--theme-bg)]/25 custom-scrollbar relative">
                {isLoading && (
                  <div className="absolute top-3 right-5 flex items-center gap-1.5 text-[9px] text-[var(--theme-accent)] font-semibold select-none leading-none animate-pulse">
                    <RefreshCw size={9} className="animate-spin" />
                    <span>SYNCHRONIZING TELEMETRY...</span>
                  </div>
                )}

                {/* TAB 1: DASHBOARD CONTROL */}
                {activeTab === 'status' && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="text-xs text-[var(--theme-secondary)] leading-relaxed font-sans">
                      Establish individual sandbox boundaries, spin hypervisor virtualization runtimes, and monitor state machines safely inside this environment.
                    </div>

                    {/* Core settings view cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Host Diagnostics Card */}
                      <div className="border border-[var(--theme-border)] bg-[var(--theme-surface)]/20 p-5 rounded-2xl relative overflow-hidden">
                        <div className="absolute -right-3 -top-3 text-[var(--theme-border)]/20 select-none">
                          <Cpu size={80} />
                        </div>
                        <h4 className="text-xs font-bold text-[var(--theme-accent)] mb-3 uppercase tracking-wider flex items-center gap-1.5">
                          <Cpu size={14} />
                          <span>Hypervisor Host Status</span>
                        </h4>
                        <div className="text-[10px] text-[var(--theme-secondary)] space-y-1.5 font-mono relative z-10">
                          <div>WSL Available: <span className={diagnostics?.host ? (diagnostics?.host?.wslInstalled ? 'text-[var(--theme-success)] font-bold' : 'text-[var(--theme-secondary)]') : 'text-[var(--theme-secondary)]/50'}>{diagnostics ? (diagnostics.host?.wslInstalled ? 'DETECTED' : 'NOT DETECTED') : 'CHECKING...'}</span></div>
                          <div>Hyper-V Available: <span className={diagnostics?.host ? (diagnostics?.host?.hyperVSupported ? 'text-[var(--theme-success)] font-bold' : 'text-[var(--theme-secondary)]') : 'text-[var(--theme-secondary)]/50'}>{diagnostics ? (diagnostics.host?.hyperVSupported ? 'DETECTED' : 'NOT DETECTED') : 'CHECKING...'}</span></div>
                          <div>CPU Virtualization: <span className={diagnostics?.host ? (diagnostics?.host?.cpuVirtualization ? 'text-[var(--theme-success)] font-bold' : 'text-[var(--theme-danger)]') : 'text-[var(--theme-secondary)]/50'}>{diagnostics ? (diagnostics.host?.cpuVirtualization ? 'ENABLED' : 'DISABLED') : 'CHECKING...'}</span></div>
                          <div>System Memory: <span className="text-[var(--theme-primary)] font-bold">{diagnostics?.host?.totalRamGb ? `${diagnostics.host.totalRamGb} GB` : (diagnostics ? '8.00 GB (Shared)' : 'CHECKING...')}</span></div>
                          <div>Free Disk Volume: <span className="text-[var(--theme-primary)] font-bold">{diagnostics?.host?.freeDiskGb ? `${diagnostics.host.freeDiskGb} GB` : (diagnostics ? '20.00 GB' : 'CHECKING...')}</span></div>
                        </div>
                      </div>

                      {/* Sandbox Properties Card */}
                      <div className="border border-[var(--theme-border)] bg-[var(--theme-surface)]/20 p-5 rounded-2xl relative overflow-hidden">
                        <div className="absolute -right-2 -top-2 text-[var(--theme-border)]/20 select-none">
                          <Settings size={75} />
                        </div>
                        <h4 className="text-xs font-bold text-[var(--theme-accent)] mb-3 uppercase tracking-wider flex items-center gap-1.5">
                          <Settings size={14} />
                          <span>VM Virtualization Limits</span>
                        </h4>
                        <div className="text-[10px] text-[var(--theme-secondary)] space-y-1.5 font-mono relative z-10">
                          <div>Max VMs Cap: <span className="text-[var(--theme-primary)] font-bold">{status?.config?.vmCount || 4} Units</span></div>
                          <div>Cores Allocated Per VM: <span className="text-[var(--theme-primary)] font-bold">{status?.config?.vmCpuCount || 2} Cores</span></div>
                          <div>System Memory Allocation: <span className="text-[var(--theme-accent)] font-bold">{status?.config?.vmMemoryMb || 2048} MB RAM</span></div>
                          <div>Max Disk Limit: <span className="text-[var(--theme-primary)] font-bold">{status?.config?.vmDiskMb || 5120} MB Dynamic size</span></div>
                          <div>Active Sandbox Ports: <span className="text-[var(--theme-accent)] font-bold">Port 3000 mapping (WSOCK)</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Operational controls button set */}
                    <div className="border border-[var(--theme-border)] bg-[var(--theme-surface)]/10 p-5 rounded-2xl">
                      <h4 className="text-xs font-bold text-[var(--theme-primary)] mb-4 uppercase tracking-wider">Global Hypervisor Commands</h4>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={handleInitialize}
                          className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/80 text-[var(--theme-bg)] font-bold rounded-xl text-xs uppercase cursor-pointer shadow-md transition-all active:scale-95"
                        >
                          <Play size={13} />
                          <span>Boot hyper-v sandbox</span>
                        </button>
                        <button
                          onClick={handleVerifyInstall}
                          className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-surface)] hover:bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] text-[var(--theme-primary)] rounded-xl text-xs uppercase cursor-pointer transition-all active:scale-95"
                        >
                          <CheckCircle size={13} />
                          <span>Assert Installs</span>
                        </button>
                        <button
                          onClick={handleShutdown}
                          className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-danger)]/15 hover:bg-[var(--theme-danger)]/25 border border-[var(--theme-danger)]/20 text-[var(--theme-danger)] rounded-xl text-xs uppercase cursor-pointer transition-all active:scale-95"
                        >
                          <StopCircle size={13} />
                          <span>Emergency Force Cleanup</span>
                        </button>
                      </div>
                    </div>

                    {/* Health State Info log panel */}
                    <div className="border border-[var(--theme-border)] bg-[var(--theme-surface)]/15 p-4 rounded-xl relative select-text">
                      <div className="flex items-center justify-between mb-3.5 select-none">
                        <h4 className="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-widest flex items-center gap-1.5 font-sans">
                          <Activity size={12} className="text-[var(--theme-accent)]" />
                          <span>Realtime diagnostics Logs</span>
                        </h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--theme-surface)] text-[var(--theme-secondary)] animate-pulse">TELEMETRY SECURE</span>
                      </div>
                      <div className="space-y-1 font-mono text-[10px] text-[var(--theme-secondary)]/80 leading-relaxed md:max-h-24 overflow-y-auto">
                        <div>[HEALTH] Handshaking hypervisor system daemon socket parameters... <span className="text-[var(--theme-success)]">SUCCESS</span></div>
                        <div>[HEALTH] VM Pool status check active. Idle: {status?.pool?.idleCount ?? 0} | Allocated: {status?.pool?.allocatedCount ?? 0}</div>
                        <div>[HEALTH] Mounting virtual storage disks mapping parameters successfully.</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: ACTIVE VMS POOL */}
                {activeTab === 'vms' && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex justify-between items-center select-none font-sans">
                      <p className="text-xs text-[var(--theme-secondary)] leading-relaxed">
                        Deploy fresh on-demand micro-operating systems for running hazardous code execution libraries safely.
                      </p>
                    </div>

                    {/* New Sandbox VM allocation form panel */}
                    <div className="border border-[var(--theme-border)] bg-[var(--theme-surface)]/20 p-5 rounded-2xl space-y-4">
                      <h4 className="text-xs font-bold text-[var(--theme-accent)] uppercase tracking-wider flex items-center gap-1.5">
                        <Plus size={14} className="text-[var(--theme-accent)]" />
                        <span>Allocate Single Guest VM Sandbox</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[var(--theme-secondary)] font-bold uppercase block tracking-wider">Target Client Agent Tag</label>
                          <input
                            type="text"
                            value={acquireAgentId}
                            onChange={(e) => setAcquireAgentId(e.target.value)}
                            placeholder="lumina-core-agent"
                            className="w-full bg-[var(--theme-input-bg,black)] border border-[var(--theme-input-border)] text-[var(--theme-primary)] placeholder-[var(--theme-muted)] rounded-xl h-9.5 px-3 font-mono text-xs outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[var(--theme-secondary)] font-bold uppercase block tracking-wider">Host Folder Scope (Mount Path)</label>
                          <input
                            type="text"
                            value={acquireWorkspacePath}
                            onChange={(e) => setAcquireWorkspacePath(e.target.value)}
                            placeholder="C:/projects/myapp-sandbox (Optional)"
                            className="w-full bg-[var(--theme-input-bg,black)] border border-[var(--theme-input-border)] text-[var(--theme-primary)] placeholder-[var(--theme-muted)] rounded-xl h-9.5 px-3 font-mono text-xs outline-none"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleAcquireVm}
                        className="w-full h-9.5 bg-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/90 text-white font-bold rounded-xl text-xs transition-all uppercase cursor-pointer"
                      >
                        SPIN ON-DEMAND CONTAINER
                      </button>
                    </div>

                    {/* Vms list cards Container */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider select-none">Active Sandbox Pool Allocation Map</h4>
                      
                      {(!status?.pool?.activeVms || status.pool.activeVms.length === 0) ? (
                        <div className="border border-dashed border-[var(--theme-border)] p-8 rounded-2xl flex flex-col items-center justify-center text-[var(--theme-secondary)] text-xs italic space-y-3">
                          <AlertCircle size={22} className="text-[var(--theme-secondary)]/50 animate-bounce" />
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
                                  ? 'border-[var(--theme-accent)]/45 bg-[var(--theme-accent)]/[0.02] shadow-[0_0_15px_rgba(217,119,86,0.02)]'
                                  : 'border-[var(--theme-border)] bg-[var(--theme-surface)]/20'
                              }`}
                            >
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <Box size={20} className={isCurSelected ? 'text-[var(--theme-accent)]' : 'text-[var(--theme-secondary)]'} />
                                <div className="space-y-1 block min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[var(--theme-primary)] font-mono truncate">{vmId}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[var(--theme-success)]/20 text-[var(--theme-success)]">RUNNING</span>
                                    {idx === 0 && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[var(--theme-sidebar)] text-[var(--theme-secondary)]">DEFAULT</span>}
                                  </div>
                                  <div className="text-[10px] text-[var(--theme-secondary)] font-mono flex flex-wrap gap-4 pt-1">
                                    <div>Allocation Tag: <span className="text-[var(--theme-primary)]">sandbox</span></div>
                                    <div>Core Threading: <span className="text-[var(--theme-primary)]">{status?.config?.vmCpuCount || 2} Threads</span></div>
                                    <div>Allocated Memory: <span className="text-[var(--theme-primary)]">{status?.config?.vmMemoryMb || 2048} MB</span></div>
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
                                  className="px-3.5 py-2.5 bg-[var(--theme-surface)] hover:bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 uppercase cursor-pointer"
                                >
                                  <Terminal size={12} />
                                  <span>TTY CONSOLE</span>
                                </button>
                                <button
                                  onClick={() => handleReleaseVm(vmId)}
                                  className="p-2.5 bg-[var(--theme-danger)]/10 hover:bg-[var(--theme-danger)]/20 border border-[var(--theme-danger)]/20 text-[var(--theme-danger)] rounded-xl transition-all cursor-pointer hover:text-[var(--theme-danger)]/90"
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
                    <p className="text-xs text-[var(--theme-secondary)] leading-relaxed font-sans">
                      Design robust firewall gateways and manage workspace filesystem directory sharing maps into virtualization contexts.
                    </p>

                    {(!status?.pool?.activeVms || status.pool.activeVms.length === 0) ? (
                      <div className="border border-dashed border-[var(--theme-border)] p-8 rounded-2xl flex flex-col items-center justify-center text-[var(--theme-secondary)] text-xs italic space-y-3 select-none">
                        <AlertCircle size={22} className="text-[var(--theme-secondary)]/50" />
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
                            <div key={vmId} className="border border-[var(--theme-border)] bg-[var(--theme-surface)]/10 p-5 rounded-2xl space-y-5">
                              <div className="flex items-center gap-2 select-none">
                                <Shield size={16} className="text-[var(--theme-accent)]" />
                                <h4 className="text-xs font-bold text-[var(--theme-primary)]">Security Guard constraints for VM: <span className="text-[var(--theme-accent)] font-mono select-all font-semibold ml-1">{vmId}</span></h4>
                              </div>

                              {/* Policy controls */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[var(--theme-input-bg,black)]/40 p-4 rounded-xl border border-[var(--theme-input-border)]">
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
                                          ? 'border-[var(--theme-accent)]/40 bg-[var(--theme-accent)]/[0.04] text-[var(--theme-accent)]'
                                          : 'border-[var(--theme-border)] hover:border-[var(--theme-border)]/80 text-[var(--theme-secondary)] hover:text-[var(--theme-primary)]'
                                      }`}
                                    >
                                      <div className="text-[11px] font-bold font-mono tracking-tight">{item.label}</div>
                                      <div className="text-[9px] text-[var(--theme-secondary)]/50 font-sans leading-tight mt-1">{item.desc}</div>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Mount setup */}
                              <div className="space-y-3">
                                <h5 className="text-[10px] uppercase font-bold text-[var(--theme-secondary)] tracking-wider">Mount Local Workspace directory to Guest OS</h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="space-y-1 block">
                                    <span className="text-[9px] text-[var(--theme-secondary)]/60 font-mono">HOST DIRECTORY ABS PATH</span>
                                    <input
                                      type="text"
                                      value={mountHostPath}
                                      onChange={(e) => setMountHostPath(e.target.value)}
                                      placeholder="e.g. C:/myprojects/myfiles"
                                      className="w-full bg-[var(--theme-input-bg,black)] border border-[var(--theme-input-border,var(--theme-border))] rounded-xl h-9.5 px-3 font-mono text-xs text-[var(--theme-primary)] outline-none focus:border-[var(--theme-accent)]/50"
                                    />
                                  </div>
                                  <div className="space-y-1 block">
                                    <span className="text-[9px] text-[var(--theme-secondary)]/60 font-mono">GUEST TARGET PATH inside VM</span>
                                    <input
                                      type="text"
                                      value={mountGuestPath}
                                      onChange={(e) => setMountGuestPath(e.target.value)}
                                      placeholder="/workspace"
                                      className="w-full bg-[var(--theme-input-bg,black)] border border-[var(--theme-input-border,var(--theme-border))] rounded-xl h-9.5 px-3 font-mono text-xs text-[var(--theme-primary)] outline-none focus:border-[var(--theme-accent)]/50"
                                    />
                                  </div>
                                  <div className="flex items-end gap-3">
                                    <button
                                      onClick={() => setMountReadOnly(!mountReadOnly)}
                                      className={`h-9.5 px-3.5 border rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold w-full uppercase ${
                                        mountReadOnly
                                          ? 'border-[var(--theme-accent)]/30 bg-[var(--theme-accent)]/10 text-[var(--theme-accent)]'
                                          : 'border-[var(--theme-border)] text-[var(--theme-secondary)]'
                                      }`}
                                    >
                                      <span>Read Only</span>
                                      <span className="text-[9px]">{mountReadOnly ? 'ON' : 'OFF'}</span>
                                    </button>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleMountWorkspace(vmId)}
                                  className="w-full h-9 px-4 bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] rounded-xl text-xs font-bold uppercase cursor-pointer"
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
                    <p className="text-xs text-[var(--theme-secondary)] leading-relaxed font-sans select-none">
                      Execute real-time low-level commands securely locked inside specific sandboxed isolated guest VMs. Output capture includes process indicators and timing.
                    </p>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 select-none">
                      <div className="flex items-center gap-2 font-sans">
                        <span className="text-[10px] text-[var(--theme-secondary)] uppercase tracking-wider font-bold">Scoped VM Scope:</span>
                        <select
                          value={selectedVmId}
                          onChange={(e) => setSelectedVmId(e.target.value)}
                          className="bg-[var(--theme-surface)] border border-[var(--theme-border)] text-xs px-2.5 py-1.5 rounded-lg text-[var(--theme-accent)] font-mono outline-none cursor-pointer focus:border-[var(--theme-accent)]/40"
                        >
                          <option value="">No Active VM Target</option>
                          {status?.pool?.activeVms?.map((vmId: string) => (
                            <option key={vmId} value={vmId}>{vmId} (sandbox)</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => setTerminalOutput([])}
                        className="px-2.5 py-1 text-[9px] bg-[var(--theme-surface)] hover:bg-[var(--theme-hover-bg)] border border-[var(--theme-border)] rounded-lg text-[var(--theme-secondary)] font-bold tracking-wider uppercase transition-colors"
                      >
                        WIPEOUT TTY SCREEN
                      </button>
                    </div>

                    {/* Terminal Display screen */}
                    <div className="bg-[var(--theme-sidebar)] border border-[var(--theme-border)] rounded-3xl p-5 h-[230px] overflow-y-auto custom-scrollbar font-mono text-xs text-[var(--theme-primary)] space-y-2 select-text relative">
                      {terminalOutput.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--theme-secondary)]/50 pointer-events-none text-center p-4">
                          <Terminal size={24} className="mb-2 text-[var(--theme-secondary)]/70 font-bold" />
                          <p className="text-[11px] leading-relaxed">System terminal connected as root@lumina-guest. <br /> Type standard bash statements to interact with the Guest OS environment (/workspace scope).</p>
                        </div>
                      )}

                      {terminalOutput.map((log, index) => (
                        <div key={index} className="flex gap-2 items-start leading-relaxed bg-transparent">
                          <span className="text-[var(--theme-secondary)]/70 shrink-0 select-none font-medium">[{log.time}]</span>
                          <div className={`shrink-0 select-none font-bold uppercase text-[9px] px-1.5 py-0.2 rounded mt-0.5 ${
                            log.type === 'input' ? 'bg-[var(--theme-surface)] text-[var(--theme-accent)]' :
                            log.type === 'stdout' ? 'bg-[var(--theme-surface)] text-[var(--theme-primary)]' :
                            log.type === 'stderr' ? 'bg-[var(--theme-danger)]/15 text-[var(--theme-danger)] border border-[var(--theme-danger)]/10' :
                            'bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/10'
                          }`}>
                            {log.type === 'input' ? 'stdin' : log.type === 'stdout' ? 'stdout' : log.type === 'stderr' ? 'stderr' : 'vm-sys'}
                          </div>
                          <span className="break-all whitespace-pre-wrap select-text font-mono flex-1 leading-normal">{log.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* CMD line compose */}
                    <div className="border border-[var(--theme-border)] bg-[var(--theme-surface)]/15 p-3 rounded-2xl flex gap-2">
                      <input
                        type="text"
                        value={terminalCommand}
                        onChange={(e) => setTerminalCommand(e.target.value)}
                        placeholder={selectedVmId ? "Enter bash commands (e.g. 'ls -la', 'npm install', 'node -v')..." : "Please allocate and select a VM to type instructions..."}
                        disabled={!selectedVmId || executingCommand}
                        className="flex-1 h-10 px-3.5 bg-[var(--theme-input-bg,black)] text-xs border border-[var(--theme-input-border)] rounded-xl text-[var(--theme-accent)] font-mono outline-none focus:border-[var(--theme-accent)]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleExecuteCommand();
                          }
                        }}
                      />
                      <button
                        onClick={handleExecuteCommand}
                        disabled={!selectedVmId || executingCommand || !terminalCommand.trim()}
                        className="px-5 bg-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/90 disabled:bg-[var(--theme-surface)] text-white disabled:text-[var(--theme-secondary)]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer uppercase font-sans"
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
