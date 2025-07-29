# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the p5js-sketches project.

## Project Overview

The p5js-sketches project is a Kubernetes-native static file server for hosting p5.js creative coding sketches on the Goldentooth Raspberry Pi cluster. It features automated preview image generation and integrates with the broader Goldentooth infrastructure ecosystem.

## Architecture

### Core Components
- **Static File Server**: nginx optimized for ARM64 Raspberry Pi hardware
- **Storage Backend**: SeaweedFS distributed storage with CSI ReadWriteMany volumes
- **Preview Generation**: GitHub Actions workflow with Puppeteer browser automation
- **GitOps Deployment**: Argo CD for continuous deployment from git repository
- **Service Discovery**: MetalLB LoadBalancer with external-dns integration

### Key Technologies
- **Kubernetes**: Container orchestration on Raspberry Pi cluster
- **Helm**: Package management and templating
- **SeaweedFS**: Distributed file system for shared storage
- **GitHub Actions**: CI/CD pipeline for automated preview capture
- **Puppeteer**: Headless browser automation for canvas screenshots
- **Argo CD**: GitOps continuous deployment

## Repository Structure

### Core Files
- `Chart.yaml` - Helm chart metadata and dependencies
- `values.yaml` - Kubernetes deployment configuration
- `templates/` - Kubernetes manifest templates (Deployment, Service, etc.)
- `sync-script.sh` - Sketch synchronization and gallery generation script
- `capture-previews.js` - Node.js script for automated preview generation
- `.github/workflows/generate-previews.yml` - GitHub Actions workflow

### Preview Generation System
- **Trigger**: Automatically runs when `sketches/**` files are modified
- **Process**: Puppeteer loads each sketch and captures the p5.js canvas element
- **Output**: Generates `preview.png` files (400x400px) in each sketch directory
- **Integration**: Gallery template displays previews with fallback placeholders

### Dependencies
- `package.json` - Node.js dependencies (Puppeteer v21.5.0)
- `package-lock.json` - Locked dependency versions for reproducible builds

## Development Workflows

### Adding New Sketches
1. Create directory under `sketches/sketch-name/`
2. Include required files: `index.html`, `sketch.js`
3. Preview generation happens automatically via GitHub Actions
4. Argo CD deploys changes to Kubernetes cluster

### Modifying Preview Generation
- Edit `capture-previews.js` for browser automation logic
- Modify `.github/workflows/generate-previews.yml` for CI/CD pipeline
- Update `sync-script.sh` template for gallery integration

### Deployment Changes
- Modify `values.yaml` for Kubernetes configuration
- Edit `templates/` for Kubernetes manifest changes
- Test locally with `helm template` before pushing

## Common Operations

### Preview Generation
```bash
# Manual preview generation (local)
node capture-previews.js

# Trigger GitHub Actions workflow
git push origin main  # (when sketches/** modified)
# or use workflow_dispatch in GitHub UI
```

### Kubernetes Operations
```bash
# Check deployment status
kubectl get pods -n p5js-sketches
kubectl get pvc -n p5js-sketches

# View logs
kubectl logs -n p5js-sketches deployment/p5js-sketches -c nginx
kubectl logs -n p5js-sketches deployment/p5js-sketches -c git-sync

# Restart deployment (refresh git content)
kubectl rollout restart deployment/p5js-sketches -n p5js-sketches
```

### Argo CD Operations
```bash
# Check sync status
kubectl get application gitops-repo-p5js-sketches -n argocd

# Manual sync (if auto-sync fails)
argocd app sync gitops-repo-p5js-sketches
```

## Configuration

### Resource Limits (Raspberry Pi Optimized)
- **Memory**: 32Mi request / 64Mi limit per container
- **CPU**: 50m request / 100m limit per container  
- **Storage**: 10Gi SeaweedFS volume (expandable)

### Networking
- **Service Type**: LoadBalancer (MetalLB)
- **External DNS**: Automated DNS record creation
- **URL**: https://p5js-sketches.services.k8s.goldentooth.net/

### Security
- **Non-root containers**: nginx runs as user ID 101
- **Read-only filesystem**: Root filesystem mounted read-only
- **Pod Security Standards**: Restricted profile compliance

## Integration with Goldentooth

This project is part of the larger Goldentooth infrastructure:
- **Cluster Management**: Uses goldentooth CLI for operations
- **Storage**: Integrates with SeaweedFS distributed storage
- **Networking**: Uses MetalLB and external-dns services
- **Monitoring**: Prometheus metrics and Grafana dashboards
- **GitOps**: Deployed via Argo CD with automated sync

## Troubleshooting

### Preview Generation Issues
- Check GitHub Actions workflow logs
- Verify Puppeteer can load sketch HTML files
- Ensure canvas elements are present in sketches

### Deployment Issues  
- Check Argo CD application status
- Verify SeaweedFS volume availability
- Review pod logs for nginx or git-sync errors

### Storage Issues
- Check SeaweedFS cluster health via goldentooth CLI
- Verify PVC mount status in pods
- Review volume permissions (should be 101:101 for nginx)

This project demonstrates cloud-native practices on edge hardware, combining creative coding with modern DevOps workflows.