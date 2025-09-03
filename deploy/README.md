# TabloCrawler Raspberry Pi Deployment Guide

This guide provides comprehensive instructions for deploying TabloCrawler to Raspberry Pi devices using Ansible automation and Docker containers.

## Deployment Architecture

This deployment uses a **Docker-only approach** with the following components:
- **Docker Compose**: Container orchestration and configuration
- **Docker Containers**: Application runtime environment
- **Ansible**: Automated deployment and configuration management

No systemd services are created - containers are managed directly by Docker with restart policies.

## Prerequisites

### System Requirements
- **Control Machine**: 
  - Linux or macOS (native support)
  - Windows (requires WSL - Windows Subsystem for Linux)
- **Target Devices**: Raspberry Pi 3B+ or newer with ARM64 support
- **Operating System**: Raspberry Pi OS (64-bit) or Ubuntu Server ARM64
- **Network**: SSH access to all target Raspberry Pi devices

### Windows Users - WSL Setup Required

**Important**: Ansible does not run natively on Windows. You must use WSL (Windows Subsystem for Linux).

#### Install WSL:
```powershell
# Run in PowerShell as Administrator
wsl --install
# Restart your computer when prompted
```

#### Setup Ubuntu in WSL:
```bash
# After restart, open WSL and update packages
sudo apt update && sudo apt upgrade -y
```

All subsequent commands in this guide should be run inside your WSL environment, not in Windows Command Prompt or PowerShell.

### Required Software on Control Machine
- Python 3.8 or newer
- Ansible 2.12 or newer
- SSH client with key-based authentication configured

**Note for Windows users**: All software must be installed inside WSL, not on Windows directly.

## Installation and Setup

### 1. Install Ansible

#### On Ubuntu/Debian (including WSL):
```bash
sudo apt update
sudo apt install ansible
```

#### On macOS:
```bash
brew install ansible
```

#### On RHEL/CentOS/Fedora:
```bash
sudo dnf install ansible
# or for older versions:
sudo yum install epel-release
sudo yum install ansible
```

#### Using pip (all platforms, including WSL):
```bash
pip3 install ansible
```

#### Windows Users (WSL):
The recommended approach for Windows users is to use the Ubuntu/Debian method above inside your WSL environment:
```bash
# Inside WSL terminal
sudo apt update
sudo apt install ansible python3-pip
```

### 2. Install Required Ansible Collections

Install the Docker collection needed for container management:

```bash
ansible-galaxy collection install community.docker
```

### 3. SSH Key Setup

Generate SSH keys for passwordless authentication:

```bash
# Generate SSH key pair (if you don't have one)
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Copy public key to your Raspberry Pi
ssh-copy-id pi@raspberrypi.local
```

Test SSH connectivity:
```bash
ssh pi@raspberrypi.local "echo 'Connection successful'"
```

#### Windows/WSL Users:
SSH keys generated in WSL are separate from Windows SSH keys. Make sure to:
- Generate and use SSH keys inside WSL
- All SSH operations must be performed from WSL terminal
- Your `~/.ssh/` directory in WSL is different from Windows

## Quick Start (Single Pi Development)

For a simple single Raspberry Pi development setup, the inventory is already configured for `raspberrypi.local`. Just follow these steps:

**Windows Users**: Execute all commands below in your WSL terminal, not in Windows Command Prompt or PowerShell.

### 1. Setup SSH Access
```bash
# Copy your SSH key to the Pi
ssh-copy-id pi@raspberrypi.local

# Test connection
ssh pi@raspberrypi.local "echo 'Connection successful'"
```

### 2. Create Vault File
```bash
cd deploy
ansible-vault create vault.yml
```

Add your secrets:
```yaml
vault_tablo_auth_token: "your_tablo_auth_token_here"
vault_telegram_bot_token: "your_telegram_bot_token_here"  # optional
vault_telegram_chat_id: "your_telegram_chat_id_here"     # optional
```

### 3. Deploy
```bash
ansible-playbook -i inventory.yml playbook.yml
```

### 4. Verify
```bash
ansible-playbook -i inventory.yml validate.yml
```

## Configuration

### 1. Inventory Configuration

The inventory is pre-configured for a single development Pi at `raspberrypi.local`:

```yaml
all:
  children:
    raspberry_pis:
      children:
        development:
          hosts:
            pi-dev:
              ansible_host: raspberrypi.local
              ansible_user: pi
              ansible_ssh_private_key_file: ~/.ssh/id_rsa
              location: "development"
              monitoring_interval: 300
              search_radius: "15"
              days_to_scan: 1
```

For multiple devices or different environments, you can expand this configuration.

### 2. Group Variables

Configure common settings in `deploy/group_vars/raspberry_pis.yml`:

```yaml
# Docker configuration
docker_image: "ghcr.io/your-username/tablocrawler"
image_tag: "latest"
container_name: "tablocrawler-monitor"

# Default monitoring settings
default_monitoring_interval: 60
default_days_to_scan: 3
default_search_latitude: "45.408153"
default_search_longitude: "11.875273"
default_search_radius: "4"
```

### 3. Custom Configuration (Optional)

For your single Pi setup, all configuration is in the inventory.yml file. If you need to customize settings, you can:

- Edit the host variables directly in `inventory.yml`
- Modify the development group variables in `deploy/group_vars/development.yml`
- Override variables in the vault file

### 4. Secrets Management with Ansible Vault

Create encrypted secrets file:

```bash
# Create vault file
ansible-vault create deploy/vault.yml
```

Add your secrets in the vault file:
```yaml
vault_tablo_auth_token: "your_tablo_auth_token_here"
vault_telegram_bot_token: "your_telegram_bot_token_here"
vault_telegram_chat_id: "your_telegram_chat_id_here"
```

Create a vault password file (optional):
```bash
echo "your_vault_password" > ~/.ansible_vault_pass
chmod 600 ~/.ansible_vault_pass
```

Configure Ansible to use the password file in `deploy/ansible.cfg`:
```ini
[defaults]
vault_password_file = ~/.ansible_vault_pass
```

## Deployment Commands

### Basic Deployment

Deploy to your development Pi:
```bash
cd deploy
ansible-playbook -i inventory.yml playbook.yml
```

### Deploy to Specific Environment

Deploy to development environment (your current setup):
```bash
ansible-playbook -i inventory.yml playbook.yml --limit development
```

### Deploy to Specific Host

Deploy to your Pi specifically:
```bash
ansible-playbook -i inventory.yml playbook.yml --limit pi-dev
```

### Deployment with Custom Image Tag

Deploy a specific version:
```bash
ansible-playbook -i inventory.yml playbook.yml -e "image_tag=v1.2.3"
```

### Dry Run (Check Mode)

Test deployment without making changes:
```bash
ansible-playbook -i inventory.yml playbook.yml --check
```

### Verbose Output

Run with detailed output for debugging:
```bash
ansible-playbook -i inventory.yml playbook.yml -vvv
```

## Ansible Vault Management

### Edit Encrypted Files
```bash
ansible-vault edit deploy/vault.yml
```

### View Encrypted Files
```bash
ansible-vault view deploy/vault.yml
```

### Change Vault Password
```bash
ansible-vault rekey deploy/vault.yml
```

### Encrypt Existing File
```bash
ansible-vault encrypt deploy/secrets.yml
```

### Decrypt File
```bash
ansible-vault decrypt deploy/vault.yml
```

## Validation and Testing

### Test Connectivity
```bash
ansible -i inventory.yml development -m ping
```

### Check Docker Installation
```bash
ansible -i inventory.yml development -m command -a "docker --version"
```

### Verify Container Status
```bash
ansible -i inventory.yml development -m command -a "docker ps"
```

### Check Container Status
```bash
ansible -i inventory.yml development -m command -a "docker ps --filter name=tablocrawler"
```

### Run Validation Playbook
```bash
ansible-playbook -i inventory.yml validate.yml
```

## Rollback Procedures

### Rollback to Previous Version

Deploy previous known-good version:
```bash
ansible-playbook -i inventory.yml rollback.yml -e "rollback_version=v1.1.0"
```

### Emergency Stop

Stop all containers immediately:
```bash
ansible -i inventory.yml raspberry_pis -m docker_container -a "name=tablocrawler-monitor state=stopped"
```

### Restart Containers

Restart Docker containers:
```bash
ansible -i inventory.yml development -m docker_container -a "name=tablocrawler-monitor state=started restart=yes"
```

## Troubleshooting

### Common Issues and Solutions

#### 1. SSH Connection Failures

**Problem**: `UNREACHABLE! => {"changed": false, "msg": "Failed to connect to the host via ssh"}`

**Solutions**:
- Verify SSH key is added to the Pi: `ssh-copy-id pi@192.168.1.100`
- Check SSH service is running on Pi: `sudo systemctl status ssh`
- Verify correct IP address in inventory
- Test manual SSH connection: `ssh pi@192.168.1.100`

#### 2. Permission Denied Errors

**Problem**: `FAILED! => {"changed": false, "msg": "Permission denied"}`

**Solutions**:
- Add user to docker group: `sudo usermod -aG docker pi`
- Use become (sudo) in playbook: `become: yes`
- Check file permissions on SSH keys: `chmod 600 ~/.ssh/id_rsa`

#### 3. Docker Installation Failures

**Problem**: Docker installation fails or times out

**Solutions**:
- Update package cache: `sudo apt update`
- Check internet connectivity on Pi
- Use alternative Docker installation method
- Manually install Docker first: `curl -fsSL https://get.docker.com | sh`

#### 4. Container Pull Failures

**Problem**: `Error response from daemon: pull access denied`

**Solutions**:
- Verify image name and tag are correct
- Check GitHub Container Registry permissions
- Login to registry manually: `docker login ghcr.io`
- Use public registry or configure authentication

#### 5. Ansible Vault Issues

**Problem**: `ERROR! Attempting to decrypt but no vault secrets found`

**Solutions**:
- Provide vault password: `ansible-playbook --ask-vault-pass`
- Check vault password file path in ansible.cfg
- Verify vault file is properly encrypted: `ansible-vault view vault.yml`

#### 6. Container Start Failures

**Problem**: Docker container fails to start

**Solutions**:
- Check container logs: `docker logs tablocrawler-monitor`
- Verify Docker container runs manually: `docker run --rm tablocrawler`
- Check environment variables and configuration
- Verify volume mounts and permissions

### Debugging Commands

#### Check Ansible Configuration
```bash
ansible-config dump --only-changed
```

#### Test Inventory Parsing
```bash
ansible-inventory -i inventory.yml --list
```

#### Debug Specific Task
```bash
ansible-playbook -i inventory.yml playbook.yml --start-at-task "Install Docker"
```

#### Check Facts
```bash
ansible -i inventory.yml raspberry_pis -m setup
```

### Log Locations

- **Ansible logs**: `/var/log/ansible.log` (if configured)
- **Container logs**: `docker logs tablocrawler-monitor`
- **Docker daemon logs**: `journalctl -u docker`
- **Application logs**: `/opt/tablocrawler/logs/` (if volume mounted)

## Monitoring and Maintenance

### Regular Health Checks

Create a monitoring script to check deployment health:

```bash
#!/bin/bash
# health-check.sh
ansible -i inventory.yml raspberry_pis -m command -a "docker ps --filter name=tablocrawler --format 'table {{.Names}}\t{{.Status}}'"
```

### Log Collection

Collect logs from all devices:
```bash
ansible -i inventory.yml raspberry_pis -m fetch -a "src=/var/log/tablocrawler.log dest=./logs/"
```

### Update Deployments

Regular update procedure:
1. Build new Docker image via GitHub Actions
2. Test deployment in staging environment
3. Deploy to production with specific version tag
4. Verify health checks pass
5. Monitor for issues

## Security Best Practices

### SSH Security
- Use key-based authentication only
- Disable password authentication: `PasswordAuthentication no` in `/etc/ssh/sshd_config`
- Use non-standard SSH port if needed
- Regularly rotate SSH keys

### Ansible Vault Security
- Use strong vault passwords
- Store vault password securely (not in version control)
- Regularly rotate vault passwords
- Limit access to vault files

### Container Security
- Use non-root user in containers
- Keep base images updated
- Scan images for vulnerabilities
- Use minimal base images

### Network Security
- Use VPN for remote access
- Configure firewall rules
- Monitor network traffic
- Use secure communication channels

## Advanced Configuration

### Custom Ansible Configuration

Create `deploy/ansible.cfg` for project-specific settings:

```ini
[defaults]
inventory = inventory.yml
host_key_checking = False
timeout = 30
gathering = smart
fact_caching = memory
stdout_callback = yaml
vault_password_file = ~/.ansible_vault_pass

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
pipelining = True
```

### Parallel Execution

Configure parallel execution for faster deployments:

```bash
ansible-playbook -i inventory.yml playbook.yml --forks 10
```

### Custom Callbacks

Enable additional output plugins:

```ini
[defaults]
stdout_callback = debug
callback_whitelist = timer, profile_tasks
```

## Support and Resources

### Documentation Links
- [Ansible Documentation](https://docs.ansible.com/)
- [Docker Ansible Collection](https://docs.ansible.com/ansible/latest/collections/community/docker/)
- [Ansible Vault Guide](https://docs.ansible.com/ansible/latest/user_guide/vault.html)

### Community Resources
- [Ansible Community](https://www.ansible.com/community)
- [Docker Community](https://www.docker.com/community)
- [Raspberry Pi Forums](https://www.raspberrypi.org/forums/)

For additional support or questions about this deployment setup, please refer to the project documentation or create an issue in the project repository.