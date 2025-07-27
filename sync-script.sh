#!/bin/sh
echo "Syncing registered sketches..."
echo "kubectl version:"
kubectl version --client
echo "Checking for jq:"
which jq || echo "jq not found"

# Get all registration ConfigMaps using kubectl
kubectl get configmaps -n NAMESPACE_PLACEHOLDER \
  -l p5js-sketch/registration=true \
  -o json | jq -r '.items[] | 
    "\(.metadata.name)|\(.data."registration.json" | fromjson | .repository)|\(.data."registration.json" | fromjson | .branch // "main")|\(.data."registration.json" | fromjson | .name)"' | \
while IFS='|' read -r configmap_name repository branch name; do
  if [ -n "$repository" ] && [ -n "$name" ]; then
    target_path="/srv/sketches/$name"
    echo "Syncing $name from $repository ($branch) to $target_path"
    
    # Remove existing directory
    rm -rf "$target_path"
    
    # Clone repository
    git clone --depth 1 --branch "$branch" "$repository" "$target_path" || {
      echo "Failed to clone $repository"
      continue
    }
    
    cd "$target_path"
    rm -rf .git
    
    # Set ownership for nginx
    chown -R 101:101 "$target_path"
    
    # Verify required files
    if [ ! -f "index.html" ] || [ ! -f "sketch.js" ]; then
      echo "WARNING: Required files missing in $name!"
    else
      echo "Successfully synced $name"
    fi
  fi
done

# Generate gallery index.html from template
echo "Generating gallery index page..."
cat > /tmp/gallery-template.html << 'EOF'
GALLERY_TEMPLATE_PLACEHOLDER
EOF

# Build sketch cards HTML
sketch_cards=""
sketch_count=0
for sketch_dir in /srv/sketches/*/; do
  if [ -d "$sketch_dir" ]; then
    sketch_name=$(basename "$sketch_dir")
    if [ "$sketch_name" != "lost+found" ] && [ -f "$sketch_dir/index.html" ]; then
      sketch_count=$((sketch_count + 1))
      sketch_cards="$sketch_cards<div class=\"sketch-card\"><div class=\"sketch-title\">$sketch_name</div><a href=\"/$sketch_name/\" class=\"sketch-link\">View Sketch</a></div>"
    fi
  fi
done

# If no sketches, show message
if [ $sketch_count -eq 0 ]; then
  sketch_cards='<div class="no-sketches">No sketches available yet. Deploy some sketch repositories to see them here!</div>'
fi

# Replace placeholder and generate final HTML
sed "s|{{SKETCH_CARDS}}|$sketch_cards|g" /tmp/gallery-template.html > /srv/sketches/index.html

# Set ownership for nginx
chown 101:101 /srv/sketches/index.html

echo "Gallery generated with $sketch_count sketches"
echo "Sketch sync completed"