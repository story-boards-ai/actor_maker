#!/usr/bin/env python3
"""
Automated Actor Training Script

Iterates through actors that have:
- Training data marked as good
- No custom model marked as good

Executes training for up to 2 actors consecutively.
Starts ngrok once and reuses it for all trainings.
All successful models are automatically saved to manifests via the training webhook.

This script reuses all existing training infrastructure from the UI.
"""

import json
import os
import sys
import time
import requests
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Configuration
MAX_CONCURRENT_TRAININGS = 2
VITE_SERVER_URL = "http://localhost:5173"
NGROK_START_URL = f"{VITE_SERVER_URL}/api/ngrok/start"
NGROK_STATUS_URL = f"{VITE_SERVER_URL}/api/ngrok/status"
ACTORS_API_URL = f"{VITE_SERVER_URL}/api/actors"
TRAINING_START_URL = f"{VITE_SERVER_URL}/api/training/start"
TRAINING_STATUS_URL = f"{VITE_SERVER_URL}/api/training/status"


def load_actors_data():
    """Load actors from the API endpoint"""
    print("[Auto Train] Loading actors from API...")
    try:
        response = requests.get(ACTORS_API_URL)
        response.raise_for_status()
        actors = response.json()
        print(f"[Auto Train] Loaded {len(actors)} actors")
        return actors
    except Exception as e:
        print(f"[Auto Train] Error loading actors: {e}")
        print(f"[Auto Train] Make sure Vite dev server is running on {VITE_SERVER_URL}")
        sys.exit(1)


def filter_eligible_actors(actors):
    """
    Filter actors that are eligible for training:
    - Have training data marked as good (training_data_good = true)
    - No custom model marked as good (custom_models_good = false)
    - Have training data synced to S3
    """
    eligible = []
    
    for actor in actors:
        # Check if training data is marked as good
        training_data_good = actor.get('training_data_good', False)
        
        # Check if any custom model is marked as good
        custom_models_good = actor.get('custom_models_good', False)
        
        # Check if training data exists and is synced
        training_data = actor.get('training_data', {})
        has_training_data = training_data.get('count', 0) > 0
        is_synced = training_data.get('synced', False)
        
        if training_data_good and not custom_models_good and has_training_data and is_synced:
            eligible.append(actor)
            print(f"[Auto Train] ✓ Eligible: {actor['name']} (ID: {actor['id']}, Images: {training_data['count']})")
        else:
            reasons = []
            if not training_data_good:
                reasons.append("training data not marked good")
            if custom_models_good:
                reasons.append("already has good custom model")
            if not has_training_data:
                reasons.append("no training data")
            if not is_synced:
                reasons.append("not synced to S3")
            
            if reasons:
                print(f"[Auto Train] ✗ Skipped: {actor['name']} ({', '.join(reasons)})")
    
    return eligible


def ensure_ngrok_running():
    """Start ngrok if not already running, return the ngrok URL"""
    print("[Auto Train] Checking ngrok status...")
    
    try:
        # Check if ngrok is already running
        response = requests.get(NGROK_STATUS_URL)
        response.raise_for_status()
        status = response.json()
        
        if status.get('running'):
            ngrok_url = status.get('url')
            print(f"[Auto Train] ✓ Ngrok already running: {ngrok_url}")
            return ngrok_url
        
        # Start ngrok
        print("[Auto Train] Starting ngrok tunnel...")
        response = requests.post(NGROK_START_URL)
        response.raise_for_status()
        data = response.json()
        ngrok_url = data.get('url')
        print(f"[Auto Train] ✓ Ngrok started: {ngrok_url}")
        
        # Wait a moment for ngrok to stabilize
        time.sleep(2)
        
        return ngrok_url
        
    except Exception as e:
        print(f"[Auto Train] Error with ngrok: {e}")
        sys.exit(1)


def get_training_parameters(actor):
    """
    Calculate optimal training parameters based on image count.
    This mirrors the logic from ActorTraining/utils/calculations.ts
    """
    image_count = actor.get('training_data', {}).get('count', 0)
    
    # Calculate recommended steps
    if image_count <= 15:
        recommended_steps = 1500
        learning_rate = 0.0002  # 2e-4
        num_repeats = 2
    elif image_count <= 30:
        recommended_steps = 2000
        learning_rate = 0.00025  # 2.5e-4
        num_repeats = 2
    elif image_count <= 60:
        recommended_steps = 2500
        learning_rate = 0.00015  # 1.5e-4
        num_repeats = 1
    else:
        recommended_steps = 3000
        learning_rate = 0.0001  # 1e-4
        num_repeats = 1
    
    # Calculate warmup steps (20% of max steps)
    lr_warmup_steps = int(recommended_steps * 0.2)
    
    # Use actor name as trigger token
    class_tokens = actor['name']
    
    return {
        'learning_rate': learning_rate,
        'max_train_steps': recommended_steps,
        'network_dim': 16,  # Rank 16 for consistent identity
        'network_alpha': 8,  # Alpha = rank/2
        'class_tokens': class_tokens,
        'batch_size': 1,
        'num_repeats': num_repeats,
        'lr_scheduler': 'cosine',
        'lr_warmup_steps': lr_warmup_steps,
        'optimizer_type': 'adamw8bit',
        'gradient_dtype': 'bf16'
    }


def get_training_data_s3_urls(actor_id):
    """Fetch training data S3 URLs for an actor"""
    try:
        response = requests.get(f"{ACTORS_API_URL}/{actor_id}/training-data")
        response.raise_for_status()
        data = response.json()
        
        # Convert HTTPS S3 URLs to s3:// format for RunPod
        s3_urls = []
        for img in data.get('training_images', []):
            url = img.get('s3_url', '')
            if url.startswith("https://") and ".s3." in url and "amazonaws.com" in url:
                # Convert https://bucket-name.s3.region.amazonaws.com/key/path to s3://bucket-name/key/path
                import re
                match = re.match(r'https://([^.]+)\.s3\.[^.]+\.amazonaws\.com/(.+)', url)
                if match:
                    s3_urls.append(f"s3://{match.group(1)}/{match.group(2)}")
                else:
                    s3_urls.append(url)
            else:
                s3_urls.append(url)
        
        return s3_urls
    except Exception as e:
        print(f"[Auto Train] Error fetching training data for actor {actor_id}: {e}")
        return []


def build_training_workflow(parameters):
    """Load and customize the training workflow"""
    workflow_path = PROJECT_ROOT / "workflows" / "lora_training_workflow_headless.json"
    
    with open(workflow_path, 'r') as f:
        workflow = json.load(f)
    
    # Customize workflow with parameters
    # This mirrors the logic from workflowBuilder.ts
    # Find the LoRA training node and update parameters
    for node_id, node in workflow.items():
        if node.get('class_type') == 'LoraTrainingNode' or 'lora' in node.get('class_type', '').lower():
            if 'inputs' in node:
                node['inputs'].update({
                    'learning_rate': parameters['learning_rate'],
                    'max_train_steps': parameters['max_train_steps'],
                    'network_dim': parameters['network_dim'],
                    'network_alpha': parameters['network_alpha'],
                    'class_tokens': parameters['class_tokens'],
                    'batch_size': parameters['batch_size'],
                    'num_repeats': parameters['num_repeats'],
                    'lr_scheduler': parameters['lr_scheduler'],
                    'lr_warmup_steps': parameters['lr_warmup_steps'],
                    'optimizer_type': parameters['optimizer_type'],
                    'gradient_dtype': parameters['gradient_dtype']
                })
    
    return workflow


def start_training(actor, ngrok_url):
    """Start training for an actor"""
    actor_id = str(actor['id']).zfill(4)
    actor_name = actor['name']
    image_count = actor.get('training_data', {}).get('count', 0)
    
    print(f"\n[Auto Train] ========================================")
    print(f"[Auto Train] Starting training for: {actor_name}")
    print(f"[Auto Train] Actor ID: {actor_id}")
    print(f"[Auto Train] Training images: {image_count}")
    print(f"[Auto Train] ========================================\n")
    
    # Get optimal parameters
    parameters = get_training_parameters(actor)
    print(f"[Auto Train] Parameters:")
    print(f"  - Steps: {parameters['max_train_steps']}")
    print(f"  - Learning Rate: {parameters['learning_rate']}")
    print(f"  - Rank/Alpha: {parameters['network_dim']}/{parameters['network_alpha']}")
    print(f"  - Repeats: {parameters['num_repeats']}")
    print(f"  - Trigger: {parameters['class_tokens']}")
    
    # Get S3 URLs
    s3_urls = get_training_data_s3_urls(actor_id)
    if not s3_urls:
        print(f"[Auto Train] ✗ No S3 URLs found for actor {actor_id}")
        return None
    
    print(f"[Auto Train] Found {len(s3_urls)} training images in S3")
    
    # Get next version number
    try:
        response = requests.get(f"{ACTORS_API_URL}/{actor_id}/training-versions")
        response.raise_for_status()
        versions_data = response.json()
        versions = versions_data.get('versions', [])
        
        # Calculate next version number
        if versions:
            max_version = max([int(v['name'].replace('V', '')) for v in versions if v['name'].startswith('V')])
            next_version = max_version + 1
        else:
            next_version = 1
        
        version_name = f"V{next_version}"
    except:
        version_name = "V1"
    
    print(f"[Auto Train] Version: {version_name}")
    
    # Build workflow
    workflow = build_training_workflow(parameters)
    
    # Create training request
    request_id = f"{actor_id}_{int(time.time())}"
    model_name = f"actor_{actor_id}_{version_name}"
    
    training_request = {
        'input': {
            'workflow': workflow,
            'training_data': {
                's3_urls': s3_urls
            },
            'training_config': {
                'mode': 'custom-actors',
                'user_id': 'actor_maker_user',
                'tenant_id': 'actor_maker',
                'request_id': request_id,
                'model_name': model_name,
                'learning_rate': parameters['learning_rate'],
                'max_train_steps': parameters['max_train_steps']
            }
        },
        'webhook': f"{ngrok_url}/api/training-webhook"
    }
    
    # Start training
    try:
        print(f"[Auto Train] Sending training request to RunPod...")
        response = requests.post(TRAINING_START_URL, json=training_request)
        response.raise_for_status()
        result = response.json()
        
        job_id = result.get('job_id', request_id)
        print(f"[Auto Train] ✓ Training started!")
        print(f"[Auto Train] Job ID: {job_id}")
        
        # Save training version
        new_version = {
            'id': job_id,
            'name': version_name,
            'description': f'Auto-trained with {image_count} images',
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S'),
            'parameters': parameters,
            'status': 'pending',
            'imageCount': image_count
        }
        
        versions.insert(0, new_version)
        
        # Save versions
        save_response = requests.post(
            f"{ACTORS_API_URL}/{actor_id}/training-versions",
            json={'versions': versions}
        )
        save_response.raise_for_status()
        
        print(f"[Auto Train] ✓ Training version saved")
        
        # Calculate estimated duration (rough estimate: 2-3 minutes per 100 steps)
        estimated_minutes = int(parameters['max_train_steps'] / 100 * 2.5)
        print(f"[Auto Train] Estimated duration: ~{estimated_minutes} minutes")
        print(f"[Auto Train] Webhook will notify when complete")
        
        return {
            'job_id': job_id,
            'actor_id': actor_id,
            'actor_name': actor_name,
            'version_name': version_name,
            'start_time': time.time(),
            'estimated_duration': estimated_minutes * 60
        }
        
    except Exception as e:
        print(f"[Auto Train] ✗ Failed to start training: {e}")
        return None


def monitor_training(training_info):
    """Monitor a training job until completion"""
    job_id = training_info['job_id']
    actor_name = training_info['actor_name']
    start_time = training_info['start_time']
    
    print(f"\n[Auto Train] Monitoring training for {actor_name}...")
    print(f"[Auto Train] Job ID: {job_id}")
    
    # Poll every 30 seconds
    poll_interval = 30
    max_wait_time = 2 * 60 * 60  # 2 hours max
    
    while True:
        elapsed = time.time() - start_time
        
        if elapsed > max_wait_time:
            print(f"[Auto Train] ⚠️ Training exceeded max wait time (2 hours)")
            return False
        
        try:
            response = requests.post(
                TRAINING_STATUS_URL,
                json={'jobId': job_id}
            )
            
            if response.status_code == 200:
                data = response.json()
                status = data.get('status', 'UNKNOWN')
                
                elapsed_min = int(elapsed / 60)
                print(f"[Auto Train] [{elapsed_min}m] Status: {status}")
                
                if status == 'COMPLETED':
                    lora_url = data.get('loraUrl')
                    print(f"[Auto Train] ✓ Training completed!")
                    if lora_url:
                        print(f"[Auto Train] Model URL: {lora_url}")
                    return True
                elif status == 'FAILED':
                    error = data.get('error', 'Unknown error')
                    print(f"[Auto Train] ✗ Training failed: {error}")
                    return False
                elif status in ['CANCELLED', 'CANCELED']:
                    print(f"[Auto Train] ⚠️ Training was cancelled")
                    return False
                elif status in ['IN_QUEUE', 'IN_PROGRESS']:
                    # Still running, continue monitoring
                    pass
                else:
                    print(f"[Auto Train] Unknown status: {status}")
            else:
                # Job might not be registered yet (first minute)
                if elapsed < 60:
                    print(f"[Auto Train] Waiting for job to be registered...")
                else:
                    print(f"[Auto Train] Status check failed: {response.status_code}")
        
        except Exception as e:
            print(f"[Auto Train] Error checking status: {e}")
        
        # Wait before next poll
        time.sleep(poll_interval)


def main():
    print("=" * 60)
    print("Automated Actor Training Script")
    print("=" * 60)
    print()
    
    # Load actors
    actors = load_actors_data()
    
    # Filter eligible actors
    eligible_actors = filter_eligible_actors(actors)
    
    if not eligible_actors:
        print("\n[Auto Train] No eligible actors found for training.")
        print("[Auto Train] Actors must have:")
        print("  - Training data marked as good")
        print("  - No custom model marked as good")
        print("  - Training data synced to S3")
        return
    
    print(f"\n[Auto Train] Found {len(eligible_actors)} eligible actor(s)")
    print(f"[Auto Train] Will train up to {MAX_CONCURRENT_TRAININGS} actors")
    
    # Limit to max concurrent trainings
    actors_to_train = eligible_actors[:MAX_CONCURRENT_TRAININGS]
    
    # Ensure ngrok is running
    ngrok_url = ensure_ngrok_running()
    
    # Train each actor
    successful = 0
    failed = 0
    
    for i, actor in enumerate(actors_to_train, 1):
        print(f"\n[Auto Train] ========================================")
        print(f"[Auto Train] Training {i}/{len(actors_to_train)}")
        print(f"[Auto Train] ========================================")
        
        training_info = start_training(actor, ngrok_url)
        
        if training_info:
            # Monitor training to completion
            success = monitor_training(training_info)
            
            if success:
                successful += 1
                print(f"\n[Auto Train] ✓ Successfully trained {actor['name']}")
            else:
                failed += 1
                print(f"\n[Auto Train] ✗ Failed to train {actor['name']}")
        else:
            failed += 1
            print(f"\n[Auto Train] ✗ Failed to start training for {actor['name']}")
    
    # Summary
    print("\n" + "=" * 60)
    print("Training Summary")
    print("=" * 60)
    print(f"Total actors processed: {len(actors_to_train)}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print()
    
    if successful > 0:
        print("✓ Successful models have been saved to manifests")
        print("✓ Models will be available in the Validator and Actor Training tabs")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[Auto Train] Interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n[Auto Train] Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
