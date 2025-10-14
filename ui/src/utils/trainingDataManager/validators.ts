/**
 * Validates if there are selected images
 * @param selectedCount - Number of selected images
 * @returns True if there are selected images
 */
export function hasSelectedImages(selectedCount: number): boolean {
  return selectedCount > 0;
}

/**
 * Validates if there are missing training images
 * @param missingCount - Number of missing training images
 * @returns True if there are missing images
 */
export function hasMissingImages(missingCount: number): boolean {
  return missingCount > 0;
}

/**
 * Validates if workflow is loaded
 * @param workflow - Workflow object
 * @returns True if workflow is loaded
 */
export function isWorkflowLoaded(workflow: any): boolean {
  return workflow !== null && workflow !== undefined;
}
