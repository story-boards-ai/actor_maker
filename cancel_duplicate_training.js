#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  });
}

const jobId = '668adb55-b014-409a-afea-485ddbc66843-e2'; // V3 duplicate
const endpoint = process.env.MODEL_TRAINING_RUNPOD_ENDPOINT_ID;
const apiKey = process.env.MODEL_TRAINING_RUNPOD_API_KEY || process.env.RUNPOD_API_KEY;

async function cancelJob() {
  console.log('Canceling job:', jobId);
  
  const url = `https://api.runpod.ai/v2/${endpoint}/cancel/${jobId}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
    
    if (response.ok) {
      console.log('✅ Job canceled successfully');
    } else {
      console.log('❌ Failed to cancel job');
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

cancelJob();
