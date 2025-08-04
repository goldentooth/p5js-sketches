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
    "\(.metadata.name)|\(.data."registration.json" | fromjson | .source.type)|\(.data."registration.json" | fromjson | .source.url)|\(.data."registration.json" | fromjson | .source.branch // "main")|\(.data."registration.json" | fromjson | .name)"' | \
while IFS='|' read -r configmap_name source_type source_url branch name; do
  if [ -n "$source_url" ] && [ -n "$name" ]; then
    target_path="/srv/sketches/$name"
    echo "Syncing $name from $source_url (type: $source_type, branch: $branch) to $target_path"
    
    # Remove existing directory
    rm -rf "$target_path"
    mkdir -p "$target_path"
    
    case "$source_type" in
      "archive")
        echo "Using archive method for $name"
        # Download and extract archive
        if curl -sL "$source_url" | tar -xz --strip-components=1 -C "$target_path"; then
          echo "Successfully downloaded and extracted archive for $name"
        else
          echo "Failed to download archive from $source_url"
          continue
        fi
        ;;
      "git")
        echo "Using git method for $name (development only)"
        # Create temporary directory for git clone
        temp_dir="/tmp/git-clone-$name"
        rm -rf "$temp_dir"
        
        if git clone --depth 1 --branch "$branch" "$source_url" "$temp_dir"; then
          echo "Successfully cloned repository for $name"
          # Copy files to shared storage
          cp -r "$temp_dir"/. "$target_path/"
          # Clean up git metadata and temporary directory
          rm -rf "$target_path/.git" "$temp_dir"
        else
          echo "Failed to clone $source_url"
          continue
        fi
        ;;
      *)
        echo "Unknown source type: $source_type for $name"
        continue
        ;;
    esac
    
    # Set ownership for nginx
    chown -R 101:101 "$target_path"
    
    # Verify required files
    if [ ! -f "$target_path/index.html" ] || [ ! -f "$target_path/sketch.js" ]; then
      echo "WARNING: Required files missing in $name!"
      ls -la "$target_path/"
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
      
      # Check for preview images
      preview_content=""
      if [ -f "$sketch_dir/preview.png" ]; then
        # PNG preview exists
        if [ -f "$sketch_dir/preview.gif" ]; then
          # Both PNG and GIF exist - use hover effect
          preview_content="<div class=\"sketch-preview\"><img src=\"/$sketch_name/preview.png\" alt=\"$sketch_name preview\" class=\"preview-png\"><img src=\"/$sketch_name/preview.gif\" alt=\"$sketch_name animation\" class=\"preview-gif\"></div>"
        else
          # Only PNG exists
          preview_content="<div class=\"sketch-preview\"><img src=\"/$sketch_name/preview.png\" alt=\"$sketch_name preview\"></div>"
        fi
      elif [ -f "$sketch_dir/preview.gif" ]; then
        # Only GIF exists
        preview_content="<div class=\"sketch-preview\"><img src=\"/$sketch_name/preview.gif\" alt=\"$sketch_name animation\"></div>"
      else
        # No preview images - show artistic placeholder
        first_char=$(echo "$sketch_name" | cut -c1 | tr '[:lower:]' '[:upper:]')
        preview_content="<div class=\"sketch-preview\"><div class=\"preview-placeholder\">$first_char</div></div>"
      fi
      
      # Extract title and description from metadata.json if available
      sketch_title="$sketch_name"
      sketch_description=""
      if [ -f "$sketch_dir/metadata.json" ]; then
        sketch_title=$(jq -r '.title // "'$sketch_name'"' "$sketch_dir/metadata.json" 2>/dev/null || echo "$sketch_name")
        sketch_description=$(jq -r '.description // ""' "$sketch_dir/metadata.json" 2>/dev/null || echo "")
      fi
      
      # Build description HTML if available
      description_html=""
      if [ -n "$sketch_description" ]; then
        description_html="<div class=\"sketch-description\">$sketch_description</div>"
      fi
      
      sketch_cards="$sketch_cards<div class=\"sketch-card\">$preview_content<div class=\"sketch-content\"><div class=\"sketch-title\">$sketch_title</div>$description_html<a href=\"/$sketch_name/\" class=\"sketch-link\">View Sketch</a></div></div>"
    fi
  fi
done

# If no sketches, show message
if [ $sketch_count -eq 0 ]; then
  sketch_cards='<div class="no-sketches">No sketches available yet. Deploy some sketch repositories to see them here!</div>'
fi

# Replace placeholder and generate final HTML
sed "s|__SKETCH_CARDS__|$sketch_cards|g" /tmp/gallery-template.html > /srv/sketches/index.html

# Set ownership for nginx
chown 101:101 /srv/sketches/index.html

echo "Gallery generated with $sketch_count sketches"
echo "Sketch sync completed"