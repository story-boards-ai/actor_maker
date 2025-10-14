/**
 * Workflow builder utility - loads and customizes ComfyUI workflows
 * Never inline workflows in components - always use this utility
 */

interface WorkflowParameters {
  learning_rate: number;
  max_train_steps: number;
  network_dim: number;
  network_alpha: number;
  class_tokens: string;
  batch_size: number;
  num_repeats: number;
  lr_scheduler: string;
  lr_warmup_steps: number;
  optimizer_type: string;
  gradient_dtype: string;
}

/**
 * Load workflow template and customize dynamic parameters
 */
export async function buildTrainingWorkflow(
  templatePath: string,
  parameters: WorkflowParameters
): Promise<Record<string, any>> {
  // Load the base workflow template
  const response = await fetch(templatePath);
  if (!response.ok) {
    throw new Error(`Failed to load workflow template: ${response.statusText}`);
  }
  
  const workflow = await response.json();
  
  // Modify only the dynamic parameters - don't rebuild the entire workflow
  // This preserves all nodes including critical output nodes like 133 (FluxTrainEnd)
  
  // Update training steps (node 4)
  if (workflow['4']?.inputs) {
    workflow['4'].inputs.steps = parameters.max_train_steps;
  }
  
  // Update optimizer config (node 95)
  if (workflow['95']?.inputs) {
    workflow['95'].inputs.optimizer_type = parameters.optimizer_type;
    workflow['95'].inputs.lr_scheduler = parameters.lr_scheduler;
    workflow['95'].inputs.lr_warmup_steps = parameters.lr_warmup_steps;
  }
  
  // Update training initialization (node 107)
  if (workflow['107']?.inputs) {
    workflow['107'].inputs.network_dim = parameters.network_dim;
    workflow['107'].inputs.network_alpha = parameters.network_alpha;
    workflow['107'].inputs.learning_rate = parameters.learning_rate;
    workflow['107'].inputs.max_train_steps = parameters.max_train_steps;
    workflow['107'].inputs.gradient_dtype = parameters.gradient_dtype;
    workflow['107'].inputs.save_dtype = parameters.gradient_dtype;
  }
  
  // Update dataset config (node 109)
  if (workflow['109']?.inputs) {
    workflow['109'].inputs.batch_size = parameters.batch_size;
    workflow['109'].inputs.class_tokens = parameters.class_tokens;
    workflow['109'].inputs.num_repeats = parameters.num_repeats;
  }
  
  // Update validation prompts (node 146) to include actual trigger token
  if (workflow['146']?.inputs?.string && parameters.class_tokens) {
    // Replace STYLE_TOKEN placeholder with actual trigger token
    workflow['146'].inputs.string = workflow['146'].inputs.string.replace(/STYLE_TOKEN/g, parameters.class_tokens);
  }
  
  return workflow;
}

/**
 * Load workflow template from file path
 */
export async function loadWorkflowTemplate(name: string = 'lora_training_workflow_headless'): Promise<Record<string, any>> {
  const templatePath = `/workflows/${name}.json`;
  const response = await fetch(templatePath);
  
  if (!response.ok) {
    throw new Error(`Failed to load workflow template: ${response.statusText}`);
  }
  
  return response.json();
}
