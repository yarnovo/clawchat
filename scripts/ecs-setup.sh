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
    "https://docker.m.daocloud.io",
    "https://mirror.ccs.tencentyun.com"
  ]
}
DAEMON
  systemctl restart docker
else
  echo "    Already configured"
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

# ---- ACR login (VPC 内网) ----
echo "==> Logging in to ACR (VPC)"
if [ -n "${ACR_USERNAME:-}" ] && [ -n "${ACR_PASSWORD:-}" ]; then
  echo "$ACR_PASSWORD" | docker login registry-vpc.cn-hangzhou.aliyuncs.com -u "$ACR_USERNAME" --password-stdin
else
  echo "    Skipped (set ACR_USERNAME and ACR_PASSWORD to enable)"
fi

# ---- Project directory ----
echo "==> Creating project directory"
mkdir -p /opt/clawchat/{cli,web,deploy}

# ---- Verify ----
echo "==> Verifying"
docker --version
docker compose version
git --version

echo "==> Done. Next: push a tag to trigger CI/CD deployment."
