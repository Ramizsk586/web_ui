# Lumina Sandbox Security Architecture

## Threat Model

### Assets Protected
1. **Host Filesystem** - User documents, system files, application data
2. **Host Processes** - Running applications, services, credentials in memory
3. **Host Network** - Local network services, browser data, API tokens
4. **Host Registry** - Windows system configuration, installed software
5. **Windows Credentials** - Saved passwords, certificates, tokens

### Trust Boundary
```
UNTRUSTED (Agent)           TRUSTED (Host)
┌──────────────────┐       ┌─────────────────────┐
│  AI Agent         │       │  Lumina Electron App │
│  LLM Model        │       │  Sandbox Manager     │
│  Agent Runtime    │──────▶│  Hypervisor          │
│  ┌──────────────┐ │  VM   │  VM Pool             │
│  │ TinyCore VM  │─┘       │  Network Policy      │
│  │ (Isolated)   │         │  Workspace Mount     │
│  └──────────────┘         └─────────────────────┘
```

### Agent Capabilities (inside VM)
| Capability | Allowed | Scope |
|---|---|---|
| Execute commands | Yes | Inside VM only |
| Read files | Yes | /workspace only |
| Write files | Yes | /workspace only |
| Network access | Conditional | Per-policy (default: none) |
| Spawn processes | Yes | Inside VM only |
| Install packages | Yes | Inside VM only |
| Access host files | **NEVER** | Blocked by design |
| Access host network | **NEVER** | Blocked by VM isolation |
| Access host devices | **NEVER** | No device passthrough |

## Security Controls

### 1. Hyper-V Isolation
- Each agent gets a dedicated VM
- VMs are Generation 2 (secure boot capable)
- No host device passthrough
- No shared clipboard
- No drag-and-drop
- No host file integration (except mounted workspace)

### 2. Network Isolation
- Default policy: `Allow None` (no internet access)
- Only loopback traffic permitted by default
- iptables lockdown applied at VM boot
- NAT switch prevents inbound connections from LAN
- Programmatic network policy per task

### 3. Filesystem Isolation
- Base image is read-only (immutable)
- Only `/workspace` is writable (COW layer)
- Host paths forbidden: `C:\Users`, `C:\Windows`, `C:\Program Files`
- Workspace mount is the ONLY bridge between host and VM
- File operations go through agent runtime validation

### 4. Process Isolation
- Every command runs inside the VM
- No `child_process.spawn` on host for agent code
- Resource limits per VM (2 CPU, 2GB RAM hard cap)
- Runaway process detection and kill
- Command timeout enforcement

### 5. Snapshot Isolation
- Clean snapshot taken after VM creation
- Snapshot restored on agent release
- No state survives between agent sessions
- Writable layer destroyed on release
- Fresh machine equivalent for every run

### 6. IPC Security
- Named pipe communication (not TCP)
- Named pipe permissions locked to current user
- Message validation on both sides
- Heartbeat monitoring for connection health
- No secrets transmitted over IPC

## Attack Surface Analysis

### Attack Vector: Prompt Injection
- **Risk**: Agent receives malicious instructions
- **Mitigation**: VM isolation prevents host access regardless of prompt
- **Residual**: Agent could abuse its own VM resources

### Attack Vector: Command Injection
- **Risk**: Agent executes crafted commands
- **Mitigation**: All execution inside VM; dangerous patterns rejected
- **Residual**: VM resource exhaustion (handled by resource limits)

### Attack Vector: Network Abuse
- **Risk**: Agent accesses internal network services
- **Mitigation**: Default deny network; NAT isolation; iptables lockdown
- **Residual**: None within default policy

### Attack Vector: Workspace Escape
- **Risk**: Agent accesses files outside /workspace
- **Mitigation**: VM filesystem isolation; path validation; no host mounts
- **Residual**: None (VM has no access to host filesystem)

### Attack Vector: VM Escape
- **Risk**: Agent breaks out of Hyper-V VM
- **Mitigation**: Hyper-V is enterprise-grade; regular security updates
- **Residual**: Extremely low (requires Hyper-V zero-day)

## Incident Response

### If an agent attempts host access:
1. Command is rejected by AgentRuntime validation
2. VM is immediately terminated
3. New VM is provisioned from clean snapshot
4. Event logged to sandbox audit trail

### If a VM is compromised:
1. VM is destroyed (not just stopped)
2. All snapshots for that VM are deleted
3. Fresh VM provisioned from base image
4. Pool replenished

## Compliance Considerations

- **No agent data persists** on host (all state in disposable VM)
- **No host logs** contain agent activity (VM logs stay in VM)
- **Network audit trail** maintained per task
- **Workspace changes tracked** via change ledger
- **All execution auditable** via IPC message log

## Security Checklist

- [x] No direct host filesystem access
- [x] No direct host process execution  
- [x] No host network access without policy
- [x] No access to Windows credentials
- [x] No access to browser data
- [x] Clean snapshot per agent session
- [x] Resource limits enforced
- [x] Network policy enforced
- [x] Workspace-only mount point
- [x] Immutable base image
- [x] Disposable writable layer
- [x] Host-side command validation
- [x] Agent audit trail
- [x] Runaway process detection
