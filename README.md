# P5.js Sketches Server

A Kubernetes-native static file server for hosting p5.js sketches on the Goldentooth cluster, utilizing SeaweedFS distributed storage for high availability and scalability.

## Features

- **Static File Server**: nginx optimized for ARM64 Pi hardware
- **Storage**: SeaweedFS CSI ReadWriteMany persistent volume
- **High Availability**: Multi-replica deployment with pod anti-affinity
- **Networking**: MetalLB LoadBalancer with external-dns integration
- **Security**: Non-root container with read-only filesystem
- **Automated Preview Generation**: GitHub Actions automatically captures preview images of sketches using headless browser automation

## Deployment

This application is deployed via ArgoCD as part of the Goldentooth GitOps workflow.

### URL

- Production: https://p5js-sketches.services.k8s.goldentooth.net/

### Storage Layout

Sketches are stored in the shared SeaweedFS volume at `/srv/sketches/<sketch-name>/`:

```
/srv/sketches/
├── sketch1/
│   ├── index.html
│   ├── sketch.js
│   ├── preview.png        # Auto-generated preview image
│   └── meta.json
├── sketch2/
│   ├── index.html
│   ├── sketch.js
│   └── preview.png        # Auto-generated preview image
└── ...
```

## Preview Image Generation

The system automatically generates preview images for sketches using GitHub Actions:

1. **Trigger**: When sketches are modified or on manual workflow dispatch
2. **Capture**: Puppeteer headless browser loads each sketch and captures the p5.js canvas
3. **Processing**: 400x400px PNG images are generated and saved as `preview.png`
4. **Integration**: Gallery displays preview images with fallback to artistic placeholders
5. **Automation**: Generated images are committed back to the repository automatically

See `PREVIEW_CAPTURE.md` for detailed technical documentation.

### Resource Requirements

Optimized for Raspberry Pi constraints:
- Memory: 32Mi request / 64Mi limit
- CPU: 50m request / 100m limit
- Storage: 10Gi SeaweedFS volume (expandable)

## Configuration

Key configuration options in `values.yaml`:

- `storage.size`: SeaweedFS volume size
- `server.replicas`: Number of nginx replicas
- `server.resources`: CPU/memory limits
- `nginx.*`: nginx performance tuning