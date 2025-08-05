# P5.js Sketches Gallery

A collection of interactive p5.js creative coding sketches with automated preview generation and multi-platform deployment.

**🎨 View the live gallery at: https://p5js-sketches.goldentooth.net/**

This project features both Kubernetes deployment on the Goldentooth cluster and GitHub Pages hosting for broader accessibility.

## Features

- **Interactive Sketches**: Creative coding projects built with p5.js
- **Automated Preview Generation**: GitHub Actions captures preview images using headless browser automation
- **Multi-Platform Deployment**: 
  - **Production**: Kubernetes on Goldentooth Raspberry Pi cluster
  - **GitHub Pages**: Automated deployment for broader accessibility
- **Gallery Interface**: Responsive web gallery with sketch previews and descriptions
- **Enhanced Documentation**: Rich HTML content with technical details for each sketch

## Current Sketches

### Linear Regression Playground
Interactive visualization demonstrating linear regression using gradient descent and quadrant-based learning approaches. Features adaptive learning rates and visual feedback showing convergence progress.

### Robbie the Robot - Genetic Algorithm Evolution  
A sophisticated genetic algorithm simulation where 20,000 neural network-controlled robots evolve over generations to efficiently collect cans in a grid world. Watch intelligent behavior emerge through evolutionary selection.

## Deployment

### Production (Kubernetes)
Deployed via ArgoCD on the Goldentooth Raspberry Pi cluster:
- **URL**: https://p5js-sketches.services.k8s.goldentooth.net/
- **Infrastructure**: ARM64 optimized nginx on Kubernetes
- **Storage**: local-path persistent volumes
- **Networking**: MetalLB LoadBalancer with external-dns

### GitHub Pages (Public)
Automated deployment for broader accessibility:
- **URL**: https://p5js-sketches.goldentooth.net/ (custom domain)
- **Deployment**: GitHub Actions workflow
- **Trigger**: Automatic on push to main branch
- **Content**: Same gallery and sketches as production

### Storage Layout

Sketches are stored in the local-path volume at `/srv/sketches/<sketch-name>/`:

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
- Storage: 10Gi local-path volume

## Configuration

Key configuration options in `values.yaml`:

- `storage.size`: local-path volume size
- `server.replicas`: Number of nginx replicas
- `server.resources`: CPU/memory limits
- `nginx.*`: nginx performance tuning