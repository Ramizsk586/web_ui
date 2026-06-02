# Lumina Sandbox Architecture

This document describes how Lumina's local execution sandbox is intended to work. The sandbox uses WSL and Hyper-V as the local isolation layer. Docker is not part of the runtime path.

## Goal

AI-generated commands and coding-agent tasks should not execute directly on the Windows host. Lumina routes agent execution into an isolated Linux runtime backed by WSL or Hyper-V, with only the selected workspace exposed.

The host app remains responsible for UI, orchestration, profile/settings storage, and preview display. The guest runtime is responsible for running shell commands, package installs, tests, build tools, and dev servers.

## Runtime Layers

```text
Electron UI
  |
  | Settings, terminal, coder actions, preview requests
  v
Express / Electron main process
  |
  | SandboxManager
  v
WSL / Hyper-V sandbox runtime
  |
  | /workspace mount + restricted network policy
  v
Linux guest shell / agent daemon
```

## Supported Backends

### WSL

WSL is the preferred developer-friendly runtime path. It gives Lumina a Linux execution environment without requiring Docker Desktop.

Expected behavior:

- Run agent commands inside a Linux userspace.
- Mount or synchronize only the active project workspace.
- Keep host paths outside the workspace unavailable to agent commands.
- Use the same command execution contract as the Hyper-V path.

### Hyper-V

Hyper-V is the stronger VM isolation path. It is used for pooled disposable VM instances when available.

Expected behavior:

- Keep a warm pool of Linux VM instances.
- Bind only the active workspace into `/workspace`.
- Run every task in a fresh writable layer.
- Destroy/recreate the writable layer after task completion.
- Use host-side policy enforcement for network and preview routing.

## Not Supported

Docker is intentionally not used.

Lumina should not:

- Probe for Docker during startup.
- Require Docker Desktop.
- Fail because `docker` is missing.
- Route agent execution through containers.

## Execution Lifecycle

1. User triggers an action:
   - terminal command
   - coder agent task
   - package install
   - test/build command
   - preview startup

2. `SandboxManager` checks the sandbox runtime.

3. A sandbox instance is acquired:
   - WSL session, or
   - warm Hyper-V VM from `VmPool`

4. The workspace is exposed as `/workspace`.

5. Network policy is applied:
   - `NONE`: no public network access
   - `REGISTRIES`: package registries and GitHub only
   - `ALL`: public web, excluding local/private host networks

6. `AgentRuntime` sends the command through the sandbox IPC/RPC bridge.

7. The guest shell executes the command as an unprivileged Linux user.

8. stdout, stderr, exit code, duration, and telemetry return to Lumina.

9. Hyper-V tasks release the VM by discarding the writable layer and returning a clean instance to the pool.

## Workspace Boundary

The sandbox should see the selected project workspace only.

Allowed:

```text
/workspace
/workspace/src
/workspace/package.json
```

Disallowed:

```text
C:\Users\<user>\.ssh
C:\Users\<user>\AppData
C:\Windows
C:\Program Files
host browser profiles
host environment variables
```

The host should never pass sensitive environment variables into the guest unless the user explicitly configures them for that task.

## Network Policy

Lumina models network access as a task-level policy.

| Policy | Behavior |
|---|---|
| `NONE` | Fully offline. No localhost, LAN, metadata, or public web access. |
| `REGISTRIES` | Allow package registries and GitHub-style source fetches. |
| `ALL` | Allow public internet, but block localhost, private LAN ranges, and metadata endpoints. |

Private ranges should remain blocked:

```text
127.0.0.0/8
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
169.254.169.254
```

## IPC And Command Contract

The host talks to the guest through the sandbox bridge, using a command contract like:

```ts
type CommandPayload = {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
};
```

The guest returns:

```ts
type ExecutionResponse = {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};
```

The host should treat guest output as untrusted text.

## Preview Flow

When a dev server starts inside the sandbox:

1. The guest reports the bound port.
2. The host creates a controlled preview route.
3. The Electron UI renders the preview through a sandboxed frame or custom preview URL.
4. The preview does not receive Electron privileges.
5. Closing the preview stops or releases the sandbox runtime.

## Files In This Repo

Key modules:

```text
src/sandbox/SandboxManager.ts
src/sandbox/SandboxInstaller.ts
src/sandbox/HypervisorManager.ts
src/sandbox/VmPool.ts
src/sandbox/AgentRuntime.ts
src/sandbox/NetworkPolicy.ts
src/sandbox/WorkspaceMount.ts
src/sandbox/VsockBridge.ts
src/sandbox/contracts/
src/sandbox/drivers/
```

## Current Implementation Notes

The current codebase has the TypeScript architecture for sandbox orchestration and a WSL/Hyper-V direction. Some low-level pieces are still placeholders or integration stubs:

- full WSL command bridge
- production Hyper-V image provisioning
- guest daemon packaging
- true VSOCK transport
- strict host firewall enforcement
- preview routing through a custom Electron protocol

These should be implemented incrementally behind the existing `SandboxManager` contract so app code does not need to know which runtime is active.

## Practical Rule

App startup should not initialize the sandbox automatically.

Sandbox initialization should happen only when the user explicitly opens sandbox controls or starts an agent/terminal/preview action that requires isolated execution. Detection must be quiet and must not require Docker or elevated Windows feature checks during normal app launch.
