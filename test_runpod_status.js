#!/usr/bin/env node
/**
 * Test RunPod status API with different job ID formats
 */

const fs = require('fs');
const path = require('path');

// Load .env file manually
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

// Test with V4 from style 68 (completed 11.5 hours ago)
const jobId = '4b21f0f4-a2bc-4e9d-bf35-884dd9547206-e1';
const endpoint = process.env.MODEL_TRAINING_RUNPOD_ENDPOINT_ID;
const apiKey = process.env.MODEL_TRAINING_RUNPOD_API_KEY || process.env.RUNPOD_API_KEY;

if (!endpoint || !apiKey) {
  console.error('❌ Missing environment variables:');
  console.error('   MODEL_TRAINING_RUNPOD_ENDPOINT_ID:', endpoint);
  console.error('   API Key exists:', !!apiKey);
  process.exit(1);
}

console.log('🔍 Testing RunPod Status API');
console.log('Endpoint ID:', endpoint);
console.log('Job ID:', jobId);
console.log('');

async function testStatusAPI(testJobId, description) {
  const url = `https://api.runpod.ai/v2/${endpoint}/status/${testJobId}`;
  
  console.log(`\n📡 ${description}`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const text = await response.text();
    console.log(`Response: ${text}`);
    
    if (response.ok) {
      try {
        const data = JSON.parse(text);
        console.log('✅ SUCCESS!');
        console.log('Job Status:', data.status);
        if (data.output) {
          console.log('Output:', JSON.stringify(data.output, null, 2));
        }
        return true;
      } catch (e) {
        console.log('⚠️ Could not parse JSON');
      }
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }
  
  return false;
}

async function main() {
  // Test 1: Full job ID with suffix
  await testStatusAPI(jobId, 'Test 1: Full job ID (with -e1 suffix)');
  
  // Test 2: Base job ID without suffix
  const baseJobId = jobId.replace(/-e\d+$/, '');
  await testStatusAPI(baseJobId, 'Test 2: Base job ID (without suffix)');
  
  // Test 3: Try with /run endpoint to see current status
  console.log('\n📡 Test 3: Check if job exists in queue');
  const healthUrl = `https://api.runpod.ai/v2/${endpoint}/health`;
  console.log(`URL: ${healthUrl}`);
  
  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response: ${text}`);
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }
}

main().catch(console.error);
