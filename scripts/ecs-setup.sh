#!/usr/bin/env bash
set -euo pipefail

# ---- APT 镜像 ----
echo "==> Configuring Aliyun apt mirror"
if ! grep -q 'mirrors.aliyun.com' /etc/apt/sources.list 2>/dev/null; then
  sed -i 's|archive.ubuntu.com|mirrors.aliyun.com|g' /etc/apt/sources.list
  sed -i 's|security.ubuntu.com|mirrors.aliyun.com|g' /etc/apt/sources.list
else
  echo "    Already configured"
fi

export DEBIAN_FRONTEND=noninteractive
export DEBCONF_NONINTERACTIVE_SEEN=true
echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

echo "==> Updating system packages"
apt-get update -qq
apt-get -y -qq -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" dist-upgrade

# ---- Docker ----
if ! command -v docker &>/dev/null; then
  echo "==> Installing Docker (Aliyun mirror)"
  curl -fsSL https://get.docker.com | sh -s -- --mirror Aliyun
  systemctl enable --now docker.service
else
  echo "==> Docker already installed: $(docker --version)"
fi

# Docker 镜像加速
echo "==> Configuring Docker registry mirrors"
mkdir -p /etc/docker
if [ ! -f /etc/docker/daemon.json ] || ! grep -q 'registry-mirrors' /etc/docker/daemon.json; then
  cat > /etc/docker/daemon.json <<'DAEMON'
{
  "registry-mirrors": [
    "https://ozvvtlky.mirror.aliyuncs.com"
  ]
}
DAEMON
  systemctl restart docker
else
  echo "    Already configured"
fi

# ---- Nginx ----
if ! command -v nginx &>/dev/null; then
  echo "==> Installing Nginx"
  apt-get install -y -qq nginx
  systemctl enable --now nginx
else
  echo "==> Nginx already installed: $(nginx -v 2>&1)"
fi

# ---- Common tools ----
TOOLS=(git make curl wget jq)
MISSING=()
for tool in "${TOOLS[@]}"; do
  command -v "$tool" &>/dev/null || MISSING+=("$tool")
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "==> Installing missing tools: ${MISSING[*]}"
  apt-get install -y -qq "${MISSING[@]}"
else
  echo "==> All tools already installed"
fi

# ---- Verify ----
echo "==> Verifying"
docker --version
docker compose version
git --version

echo "==> Done"
