#!/bin/bash

# Script to create GitHub repository for ActorMaker
# Usage: ./create_github_repo.sh YOUR_GITHUB_TOKEN

if [ -z "$1" ]; then
    echo "❌ Error: GitHub token required"
    echo "Usage: ./create_github_repo.sh YOUR_GITHUB_TOKEN"
    echo ""
    echo "To create a token:"
    echo "1. Go to https://github.com/settings/tokens"
    echo "2. Click 'Generate new token (classic)'"
    echo "3. Select 'repo' scope"
    echo "4. Copy the token and run this script"
    echo ""
    echo "Or create the repository manually - see CREATE_GITHUB_REPO.md"
    exit 1
fi

GITHUB_TOKEN=$1
ORG_NAME="story-boards-ai"
REPO_NAME="actor_maker"

echo "🚀 Creating GitHub repository: $ORG_NAME/$REPO_NAME"

# Create the repository
response=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/orgs/$ORG_NAME/repos \
  -d "{
    \"name\": \"$REPO_NAME\",
    \"description\": \"A comprehensive toolkit for LoRA actor model training and image generation\",
    \"private\": false,
    \"auto_init\": false
  }")

# Check if successful
if echo "$response" | grep -q "\"full_name\""; then
    echo "✅ Repository created successfully!"
    echo "📍 URL: https://github.com/$ORG_NAME/$REPO_NAME"
    echo ""
    echo "Now pushing code..."
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Code pushed successfully!"
        echo "🎉 ActorMaker is now live at: https://github.com/$ORG_NAME/$REPO_NAME"
    else
        echo "❌ Failed to push code. Please try manually: git push -u origin main"
    fi
else
    echo "❌ Failed to create repository"
    echo "Response: $response"
    echo ""
    echo "Please create the repository manually - see CREATE_GITHUB_REPO.md"
fi
