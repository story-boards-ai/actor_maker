# Creating the ActorMaker GitHub Repository

## Option 1: Using GitHub Web Interface (Easiest)

1. Go to https://github.com/story-boards-ai
2. Click on "New repository" (green button)
3. Set the following:
   - **Repository name**: `actor_maker`
   - **Description**: "A comprehensive toolkit for LoRA actor model training and image generation"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click "Create repository"

## Option 2: Using GitHub CLI (If you install it)

```bash
# Install GitHub CLI first
brew install gh

# Authenticate
gh auth login

# Create the repository
gh repo create story-boards-ai/actor_maker --public --source=. --remote=origin --push
```

## After Creating the Repository

Once the repository is created on GitHub, run:

```bash
cd /Users/markusetter/projects/storyboards_ai/actor_maker
git push -u origin main
```

## Verify the Repository

After pushing, verify at:
https://github.com/story-boards-ai/actor_maker

## Summary of Changes Made

✅ Created exact copy of styles_maker at `/Users/markusetter/projects/storyboards_ai/actor_maker`
✅ Replaced all references:
   - `styles_maker` → `actor_maker`
   - `StyleMaker` → `ActorMaker`
   - `styles-maker` → `actor-maker`
✅ Updated configuration files:
   - pyproject.toml
   - setup.py
   - package.json
   - README.md
   - All source code files
✅ Initialized new git repository
✅ Created initial commit
✅ Added remote origin pointing to story-boards-ai/actor_maker

## Next Steps

1. Create the repository on GitHub (see options above)
2. Push the code: `git push -u origin main`
3. Start working on ActorMaker!
