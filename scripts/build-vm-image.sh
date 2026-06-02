#!/bin/bash
#===============================================================================
# Lumina Sandbox VM Base Image Builder
# Creates a minimal TinyCore Linux image for Hyper-V
#
# Requirements:
#   - Linux (for cross-build) or WSL2 on Windows
#   - qemu-img (for disk image creation)
#   - wget, tar, gzip
#
# Usage:
#   ./build-vm-image.sh /path/to/output
#===============================================================================

set -euo pipefail

OUTPUT_DIR="${1:-./vm-output}"
IMAGE_SIZE_MB="${2:-2048}"
TINYCORE_MIRROR="${3:-http://tinycorelinux.net/15.x/x86_64}"

echo "=== Lumina Sandbox VM Image Builder ==="
echo "Output: $OUTPUT_DIR"
echo "Size: ${IMAGE_SIZE_MB}MB"
echo ""

mkdir -p "$OUTPUT_DIR"
cd "$OUTPUT_DIR"

# Step 1: Download TinyCore
echo "[1/6] Downloading TinyCore Linux..."
if [ ! -f tinycore.iso ]; then
    wget -q --show-progress "$TINYCORE_MIRROR/release/TinyCore-current.iso" -O tinycore.iso
fi

# Step 2: Extract kernel and initrd
echo "[2/6] Extracting kernel and initrd..."
mkdir -p iso-mount
7z x tinycore.iso -oiso-mount/ 2>/dev/null || {
    # Fallback: use mount if 7z not available
    mkdir -p iso-mount
    mount -o loop tinycore.iso iso-mount 2>/dev/null || {
        echo "Error: Cannot extract ISO. Install p7zip or use WSL."
        exit 1
    }
}

cp iso-mount/boot/vmlinuz64 "$OUTPUT_DIR/kernel"
cp iso-mount/boot/corepure64.gz "$OUTPUT_DIR/initrd"

if mountpoint -q iso-mount 2>/dev/null; then
    umount iso-mount
fi

echo "  Kernel: $(ls -lh kernel | awk '{print $5}')"
echo "  Initrd: $(ls -lh initrd | awk '{print $5}')"

# Step 3: Create root filesystem overlay
echo "[3/6] Creating filesystem overlay..."
mkdir -p rootfs-overlay

# Create Lumina directory structure
mkdir -p rootfs-overlay/opt/lumina/{bin,lib,etc,services}

# Create guest agent runtime
cat > rootfs-overlay/opt/lumina/lumina-guest.sh << 'SCRIPT'
#!/bin/bash
# Lumina Guest Agent Runtime
# Runs inside the sandbox VM, handles IPC with host

LUMINA_HOME="/opt/lumina"
PATH="$LUMINA_HOME/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
LUMINA_VM_ID="$(hostname)"

echo "Lumina Guest Runtime starting on VM: $LUMINA_VM_ID"

# Start filesystem bridge
if [ -x "$LUMINA_HOME/bin/filesystem-bridge" ]; then
    nohup "$LUMINA_HOME/bin/filesystem-bridge" > /var/log/filesystem-bridge.log 2>&1 &
fi

# Start MCP runtime
if [ -x "$LUMINA_HOME/bin/mcp-runtime" ]; then
    nohup "$LUMINA_HOME/bin/mcp-runtime" > /var/log/mcp-runtime.log 2>&1 &
fi

# IPC event loop (reads from stdin)
while true; do
    if read -r line; then
        case "$line" in
            *heartbeat*)
                echo '{"type":"heartbeat_ack","timestamp":'"$(date +%s)"'}'
                ;;
            *exec*)
                cmd=$(echo "$line" | python3 -c "import sys,json;print(json.load(sys.stdin).get('command',''))" 2>/dev/null)
                if [ -n "$cmd" ]; then
                    output=$(eval "$cmd" 2>&1)
                    exit_code=$?
                    echo '{"type":"exec_result","exit_code":'"$exit_code"',"output":'"$(echo "$output" | python3 -c "import sys,json;print(json.dumps(sys.stdin.read()))")"'}'
                fi
                ;;
        esac
    fi
done
SCRIPT
chmod +x rootfs-overlay/opt/lumina/lumina-guest.sh

# Create guest config
cat > rootfs-overlay/opt/lumina/etc/guest-config.json << 'CONFIG'
{
  "version": "1.0.0",
  "vm_type": "lumina-sandbox",
  "services": {
    "agent-runtime": { "enabled": true, "port": 9000 },
    "mcp-runtime": { "enabled": true, "port": 9001 },
    "filesystem-bridge": { "enabled": true, "port": 9002 }
  },
  "workspace": {
    "mount_point": "/workspace",
    "default_permissions": "755"
  },
  "network": {
    "policy_file": "/opt/lumina/etc/network-policy.json"
  }
}
CONFIG

# Create default network policy
cat > rootfs-overlay/opt/lumina/etc/network-policy.json << 'POLICY'
{
  "allow_none": true,
  "allow_github": false,
  "allow_npm": false,
  "allow_pypi": false,
  "allow_internet": false,
  "custom_domains": []
}
POLICY

# Create security lockdown script
cat > rootfs-overlay/opt/lumina/etc/security-lockdown.sh << 'LOCKDOWN'
#!/bin/sh
# Security lockdown applied at boot
iptables -F
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
LOCKDOWN
chmod +x rootfs-overlay/opt/lumina/etc/security-lockdown.sh

# Create boot script
cat > rootfs-overlay/opt/bootlocal.sh << 'BOOT'
#!/bin/sh
# Lumina Sandbox bootlocal.sh
# Runs at the end of TinyCore boot sequence

/opt/lumina/etc/security-lockdown.sh
/opt/lumina/lumina-guest.sh &
BOOT
chmod +x rootfs-overlay/opt/bootlocal.sh

# Step 4: Install Node.js and Python
echo "[4/6] Bundling Node.js runtime..."
NODE_VERSION="20.18.0"
if [ ! -f node.tar.xz ]; then
    wget -q --show-progress "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -O node.tar.xz
fi
mkdir -p rootfs-overlay/usr/local
tar xf node.tar.xz -C rootfs-overlay/usr/local --strip-components=1 --no-same-owner
echo "  Node.js: $(ls -lh rootfs-overlay/usr/local/bin/node | awk '{print $5}')"

echo "[5/6] Bundling Python runtime..."
PYTHON_VERSION="3.12.7"
PYTHON_URL="https://github.com/niess/python-build-standalone/releases/download/20241002/cpython-${PYTHON_VERSION}+20241002-x86_64-unknown-linux-gnu-install_only.tar.gz"
if [ ! -f python.tar.gz ]; then
    wget -q --show-progress "$PYTHON_URL" -O python.tar.gz
fi
mkdir -p rootfs-overlay/opt/python
tar xf python.tar.gz -C rootfs-overlay/opt/python --strip-components=1 --no-same-owner
echo "  Python: $(ls -lh rootfs-overlay/opt/python/bin/python3 | awk '{print $5}')"

# Bundle git, curl, bash (they're in TinyCore base but include for completeness)
echo "  Git, bash, curl: included in TinyCore base"

# Step 5: Create the CPIO archive (combined initrd)
echo "[6/6] Building final initrd with overlay..."
cd rootfs-overlay
find . | cpio -o -H newc | gzip -9 > "$OUTPUT_DIR/initrd"
cd "$OUTPUT_DIR"

# Create placeholder image file
dd if=/dev/zero of="$OUTPUT_DIR/lumina-base.img" bs=1M count=0 seek=$IMAGE_SIZE_MB 2>/dev/null

echo ""
echo "=== Build Complete ==="
echo "Output files in: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR/kernel" "$OUTPUT_DIR/initrd" "$OUTPUT_DIR/lumina-base.img"
echo ""
echo "Next steps:"
echo "1. Launch Lumina"
echo "2. The sandbox installer will detect these files"
echo "3. Agents will now execute inside isolated VMs"
