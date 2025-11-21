/**
 * Workflow Execution E2E Tests
 *
 * End-to-end tests for workflow execution flow.
 */

import { test, expect } from '@playwright/test';
import { testWorkflows } from './fixtures/workflows';

test.describe('Workflow Execution Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to workflows page
    await page.goto('/workflows');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display workflows list', async ({ page }) => {
    // Check for workflows list container
    const workflowsList = page.locator('[data-testid="workflows-list"]');
    await expect(workflowsList).toBeVisible();

    // Check for at least one workflow or empty state
    const workflows = page.locator('[data-testid="workflow-item"]');
    const emptyState = page.locator('[data-testid="empty-state"]');

    const workflowsCount = await workflows.count();
    if (workflowsCount === 0) {
      await expect(emptyState).toBeVisible();
    } else {
      await expect(workflows.first()).toBeVisible();
    }
  });

  test('should create new workflow', async ({ page }) => {
    // Click create workflow button
    await page.click('[data-testid="create-workflow-btn"]');

    // Fill in workflow name
    const workflowName = `E2E Test Workflow ${Date.now()}`;
    await page.fill('[data-testid="workflow-name-input"]', workflowName);

    // Save workflow
    await page.click('[data-testid="save-workflow-btn"]');

    // Wait for success message
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

    // Verify workflow appears in list
    await page.goto('/workflows');
    await expect(page.locator(`text="${workflowName}"`)).toBeVisible();
  });

  test('should execute workflow and show real-time status', async ({ page }) => {
    // Create a test workflow first
    await page.click('[data-testid="create-workflow-btn"]');

    const workflowName = `Execute Test ${Date.now()}`;
    await page.fill('[data-testid="workflow-name-input"]', workflowName);
    await page.click('[data-testid="save-workflow-btn"]');

    // Wait for workflow to be created
    await page.waitForTimeout(1000);

    // Find and click the workflow
    await page.goto('/workflows');
    await page.click(`text="${workflowName}"`);

    // Click execute button
    await page.click('[data-testid="execute-workflow-btn"]');

    // Check for execution status indicator
    const statusIndicator = page.locator('[data-testid="execution-status"]');
    await expect(statusIndicator).toBeVisible();

    // Wait for execution to start
    await expect(statusIndicator).toContainText(/running|executing/i, {
      timeout: 5000,
    });

    // Wait for execution to complete
    await expect(statusIndicator).toContainText(/success|completed/i, {
      timeout: 30000,
    });
  });

  test('should display execution history', async ({ page }) => {
    // Navigate to executions page
    await page.goto('/executions');

    // Wait for executions list to load
    await page.waitForLoadState('networkidle');

    // Check for executions list
    const executionsList = page.locator('[data-testid="executions-list"]');
    await expect(executionsList).toBeVisible();

    // Check for execution items or empty state
    const executions = page.locator('[data-testid="execution-item"]');
    const emptyState = page.locator('[data-testid="empty-state"]');

    const executionsCount = await executions.count();
    if (executionsCount === 0) {
      await expect(emptyState).toBeVisible();
    } else {
      // Verify execution item structure
      const firstExecution = executions.first();
      await expect(firstExecution).toBeVisible();

      // Check for status badge
      await expect(firstExecution.locator('[data-testid="execution-status-badge"]')).toBeVisible();

      // Check for execution time
      await expect(firstExecution.locator('[data-testid="execution-time"]')).toBeVisible();
    }
  });

  test('should filter executions by status', async ({ page }) => {
    await page.goto('/executions');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Click status filter dropdown
    await page.click('[data-testid="status-filter"]');

    // Select "Success" filter
    await page.click('[data-testid="filter-success"]');

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // Verify all visible executions have success status
    const executions = page.locator('[data-testid="execution-item"]');
    const count = await executions.count();

    for (let i = 0; i < count; i++) {
      const statusBadge = executions.nth(i).locator('[data-testid="execution-status-badge"]');
      await expect(statusBadge).toContainText(/success/i);
    }
  });

  test('should view execution details', async ({ page }) => {
    await page.goto('/executions');

    // Wait for executions to load
    await page.waitForLoadState('networkidle');

    // Check if executions exist
    const executions = page.locator('[data-testid="execution-item"]');
    const count = await executions.count();

    if (count > 0) {
      // Click on first execution
      await executions.first().click();

      // Verify execution details page
      await expect(page.locator('[data-testid="execution-details"]')).toBeVisible();

      // Check for execution metadata
      await expect(page.locator('[data-testid="execution-id"]')).toBeVisible();
      await expect(page.locator('[data-testid="execution-workflow"]')).toBeVisible();
      await expect(page.locator('[data-testid="execution-duration"]')).toBeVisible();
    }
  });

  test('should handle workflow execution errors gracefully', async ({ page }) => {
    // Create workflow with intentional error
    await page.click('[data-testid="create-workflow-btn"]');

    const workflowName = `Error Test ${Date.now()}`;
    await page.fill('[data-testid="workflow-name-input"]', workflowName);

    // Add an HTTP node with invalid URL
    await page.click('[data-testid="add-node-btn"]');
    await page.click('[data-testid="node-type-http"]');
    await page.fill('[data-testid="http-url-input"]', 'invalid-url');

    await page.click('[data-testid="save-workflow-btn"]');
    await page.waitForTimeout(1000);

    // Execute workflow
    await page.goto('/workflows');
    await page.click(`text="${workflowName}"`);
    await page.click('[data-testid="execute-workflow-btn"]');

    // Wait for error status
    const statusIndicator = page.locator('[data-testid="execution-status"]');
    await expect(statusIndicator).toContainText(/error|failed/i, {
      timeout: 30000,
    });

    // Check for error message display
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should support workflow search', async ({ page }) => {
    await page.goto('/workflows');

    // Enter search query
    const searchInput = page.locator('[data-testid="workflow-search"]');
    await searchInput.fill('test');

    // Wait for search results
    await page.waitForTimeout(500);

    // Verify search results contain query
    const workflows = page.locator('[data-testid="workflow-item"]');
    const count = await workflows.count();

    for (let i = 0; i < count; i++) {
      const workflowName = await workflows.nth(i).textContent();
      expect(workflowName?.toLowerCase()).toContain('test');
    }
  });

  test('should support workflow pagination', async ({ page }) => {
    await page.goto('/workflows');

    // Check if pagination exists
    const pagination = page.locator('[data-testid="pagination"]');

    if (await pagination.isVisible()) {
      // Get current page number
      const currentPage = page.locator('[data-testid="current-page"]');
      const initialPage = await currentPage.textContent();

      // Click next page
      await page.click('[data-testid="next-page"]');

      // Wait for page change
      await page.waitForTimeout(500);

      // Verify page changed
      const newPage = await currentPage.textContent();
      expect(newPage).not.toBe(initialPage);
    }
  });
});

test.describe('Workflow Real-time Updates', () => {
  test('should receive real-time execution updates via WebSocket', async ({ page }) => {
    await page.goto('/workflows');

    // Create and execute workflow
    await page.click('[data-testid="create-workflow-btn"]');

    const workflowName = `WebSocket Test ${Date.now()}`;
    await page.fill('[data-testid="workflow-name-input"]', workflowName);
    await page.click('[data-testid="save-workflow-btn"]');
    await page.waitForTimeout(1000);

    await page.goto('/workflows');
    await page.click(`text="${workflowName}"`);

    // Execute workflow
    await page.click('[data-testid="execute-workflow-btn"]');

    // Monitor WebSocket connection
    const webSocketPromise = page.waitForEvent('websocket');

    // Verify WebSocket connection established
    const webSocket = await webSocketPromise;
    expect(webSocket.url()).toContain('ws://');

    // Wait for execution updates via WebSocket
    await page.waitForFunction(
      () => {
        const status = document.querySelector('[data-testid="execution-status"]');
        return status?.textContent?.match(/success|error|completed/i);
      },
      { timeout: 30000 }
    );
  });
});

test.describe('Workflow Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/workflows');

    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Focus create button
    await page.keyboard.press('Tab'); // Focus search
    await page.keyboard.press('Tab'); // Focus first workflow

    // Check focused element
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/workflows');

    // Check for ARIA labels on key elements
    await expect(page.locator('[aria-label="Create new workflow"]')).toBeVisible();
    await expect(page.locator('[aria-label="Search workflows"]')).toBeVisible();
  });
});
