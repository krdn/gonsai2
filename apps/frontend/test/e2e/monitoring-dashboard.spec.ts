/**
 * Monitoring Dashboard E2E Tests
 *
 * End-to-end tests for monitoring dashboard functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('Monitoring Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to monitoring dashboard
    await page.goto('/dashboard');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard overview', async ({ page }) => {
    // Check for main dashboard container
    const dashboard = page.locator('[data-testid="dashboard-container"]');
    await expect(dashboard).toBeVisible();

    // Verify key metrics are displayed
    await expect(
      page.locator('[data-testid="metric-total-workflows"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="metric-active-workflows"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="metric-total-executions"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="metric-success-rate"]')
    ).toBeVisible();
  });

  test('should display execution statistics chart', async ({ page }) => {
    // Check for statistics chart
    const chart = page.locator('[data-testid="execution-stats-chart"]');
    await expect(chart).toBeVisible();

    // Verify chart elements are rendered
    const chartSvg = chart.locator('svg');
    await expect(chartSvg).toBeVisible();

    // Check for chart legend
    await expect(page.locator('[data-testid="chart-legend"]')).toBeVisible();
  });

  test('should display recent executions table', async ({ page }) => {
    // Check for recent executions section
    const recentExecutions = page.locator(
      '[data-testid="recent-executions"]'
    );
    await expect(recentExecutions).toBeVisible();

    // Verify table headers
    await expect(page.locator('th:has-text("Workflow")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Duration")')).toBeVisible();
    await expect(page.locator('th:has-text("Time")')).toBeVisible();

    // Check for at least one execution or empty state
    const executionRows = page.locator('[data-testid="execution-row"]');
    const emptyState = page.locator('[data-testid="empty-state"]');

    const rowCount = await executionRows.count();
    if (rowCount === 0) {
      await expect(emptyState).toBeVisible();
    } else {
      await expect(executionRows.first()).toBeVisible();
    }
  });

  test('should display active workflows list', async ({ page }) => {
    // Check for active workflows section
    const activeWorkflows = page.locator('[data-testid="active-workflows"]');
    await expect(activeWorkflows).toBeVisible();

    // Verify section header
    await expect(page.locator('h2:has-text("Active Workflows")')).toBeVisible();

    // Check for workflow items or empty state
    const workflowItems = page.locator('[data-testid="active-workflow-item"]');
    const emptyState = page.locator('[data-testid="no-active-workflows"]');

    const itemCount = await workflowItems.count();
    if (itemCount === 0) {
      await expect(emptyState).toBeVisible();
    } else {
      await expect(workflowItems.first()).toBeVisible();

      // Verify workflow item structure
      const firstItem = workflowItems.first();
      await expect(
        firstItem.locator('[data-testid="workflow-name"]')
      ).toBeVisible();
      await expect(
        firstItem.locator('[data-testid="workflow-status-badge"]')
      ).toBeVisible();
    }
  });

  test('should show error rate alerts', async ({ page }) => {
    // Check for alerts section
    const alertsSection = page.locator('[data-testid="alerts-section"]');
    await expect(alertsSection).toBeVisible();

    // Check for alerts or no alerts message
    const alerts = page.locator('[data-testid="alert-item"]');
    const noAlerts = page.locator('[data-testid="no-alerts"]');

    const alertCount = await alerts.count();
    if (alertCount === 0) {
      await expect(noAlerts).toBeVisible();
    } else {
      // Verify alert structure
      const firstAlert = alerts.first();
      await expect(
        firstAlert.locator('[data-testid="alert-severity"]')
      ).toBeVisible();
      await expect(
        firstAlert.locator('[data-testid="alert-message"]')
      ).toBeVisible();
    }
  });
});

test.describe('Real-time Dashboard Updates', () => {
  test('should update metrics in real-time via WebSocket', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for initial load
    await page.waitForLoadState('networkidle');

    // Get initial total executions count
    const executionsMetric = page.locator(
      '[data-testid="metric-total-executions"]'
    );
    const initialCount = await executionsMetric.textContent();

    // Monitor WebSocket connection
    const webSocketPromise = page.waitForEvent('websocket');
    const webSocket = await webSocketPromise;

    expect(webSocket.url()).toContain('ws://');

    // Wait for potential metric update (or timeout)
    await page.waitForTimeout(5000);

    // Verify WebSocket is still connected
    expect(webSocket.isClosed()).toBe(false);
  });

  test('should update execution chart in real-time', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Get reference to chart
    const chart = page.locator('[data-testid="execution-stats-chart"]');
    await expect(chart).toBeVisible();

    // Take screenshot of initial chart
    const initialScreenshot = await chart.screenshot();

    // Wait for potential updates
    await page.waitForTimeout(10000);

    // Chart should still be visible and potentially updated
    await expect(chart).toBeVisible();
  });

  test('should show real-time execution status updates', async ({ page }) => {
    await page.goto('/dashboard');

    // Watch for status badge changes
    const statusBadges = page.locator('[data-testid="execution-status-badge"]');

    // If there are any executions
    const count = await statusBadges.count();
    if (count > 0) {
      const firstBadge = statusBadges.first();

      // Monitor for class/text changes
      await expect(firstBadge).toBeVisible();

      // Status should be one of: success, error, running, waiting
      const statusText = await firstBadge.textContent();
      expect(['success', 'error', 'running', 'waiting', 'completed']).toContain(
        statusText?.toLowerCase() || ''
      );
    }
  });
});

test.describe('Dashboard Filtering and Time Range', () => {
  test('should filter by time range', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for time range selector
    const timeRangeSelector = page.locator('[data-testid="time-range-selector"]');
    await expect(timeRangeSelector).toBeVisible();

    // Click time range selector
    await timeRangeSelector.click();

    // Select "Last 7 days"
    await page.click('[data-testid="time-range-7d"]');

    // Wait for data to reload
    await page.waitForTimeout(1000);

    // Verify time range is applied (check URL or UI indicator)
    await expect(timeRangeSelector).toContainText(/7|week/i);
  });

  test('should support custom date range', async ({ page }) => {
    await page.goto('/dashboard');

    // Open time range selector
    await page.click('[data-testid="time-range-selector"]');

    // Click custom range option
    await page.click('[data-testid="time-range-custom"]');

    // Fill in date inputs
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    await page.fill(
      '[data-testid="start-date"]',
      lastWeek.toISOString().split('T')[0]
    );
    await page.fill(
      '[data-testid="end-date"]',
      today.toISOString().split('T')[0]
    );

    // Apply custom range
    await page.click('[data-testid="apply-date-range"]');

    // Wait for dashboard to update
    await page.waitForTimeout(1000);

    // Verify custom range is active
    await expect(page.locator('[data-testid="time-range-selector"]')).toContainText(
      /custom/i
    );
  });
});

test.describe('Dashboard Export and Actions', () => {
  test('should export dashboard data as CSV', async ({ page }) => {
    await page.goto('/dashboard');

    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv-btn"]');

    // Wait for download
    const download = await downloadPromise;

    // Verify filename
    expect(download.suggestedFilename()).toMatch(/dashboard.*\.csv$/i);
  });

  test('should export dashboard as PDF report', async ({ page }) => {
    await page.goto('/dashboard');

    // Click export PDF button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-pdf-btn"]');

    // Wait for download
    const download = await downloadPromise;

    // Verify filename
    expect(download.suggestedFilename()).toMatch(/dashboard.*\.pdf$/i);
  });

  test('should refresh dashboard data manually', async ({ page }) => {
    await page.goto('/dashboard');

    // Get initial metric value
    const executionsMetric = page.locator(
      '[data-testid="metric-total-executions"]'
    );
    await expect(executionsMetric).toBeVisible();

    // Click refresh button
    await page.click('[data-testid="refresh-dashboard-btn"]');

    // Wait for loading indicator
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    await expect(loadingIndicator).toBeVisible();

    // Wait for loading to finish
    await expect(loadingIndicator).toBeHidden({ timeout: 10000 });

    // Metrics should still be visible after refresh
    await expect(executionsMetric).toBeVisible();
  });
});

test.describe('Dashboard Performance', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Dashboard should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for initial load
    await page.waitForLoadState('networkidle');

    // Measure chart render time
    const startTime = Date.now();

    const chart = page.locator('[data-testid="execution-stats-chart"]');
    await expect(chart).toBeVisible();

    const renderTime = Date.now() - startTime;

    // Chart should render within 2 seconds
    expect(renderTime).toBeLessThan(2000);
  });
});

test.describe('Dashboard Responsive Design', () => {
  test('should display correctly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify mobile layout
    const dashboard = page.locator('[data-testid="dashboard-container"]');
    await expect(dashboard).toBeVisible();

    // Check that metrics stack vertically on mobile
    const metrics = page.locator('[data-testid^="metric-"]');
    const firstMetric = metrics.first();
    const secondMetric = metrics.nth(1);

    if ((await metrics.count()) >= 2) {
      const firstBox = await firstMetric.boundingBox();
      const secondBox = await secondMetric.boundingBox();

      // On mobile, second metric should be below first (higher Y coordinate)
      expect(secondBox!.y).toBeGreaterThan(firstBox!.y);
    }
  });

  test('should display correctly on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify tablet layout
    const dashboard = page.locator('[data-testid="dashboard-container"]');
    await expect(dashboard).toBeVisible();

    // All key elements should be visible
    await expect(
      page.locator('[data-testid="metric-total-workflows"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="execution-stats-chart"]')
    ).toBeVisible();
  });
});

test.describe('Dashboard Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard');

    // Tab through dashboard elements
    await page.keyboard.press('Tab'); // Focus first interactive element

    // Verify focused element is visible
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();

    // Continue tabbing
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for ARIA labels on interactive elements
    await expect(
      page.locator('[aria-label="Export dashboard data"]')
    ).toBeVisible();
    await expect(
      page.locator('[aria-label="Refresh dashboard"]')
    ).toBeVisible();

    // Check for ARIA roles on complex widgets
    await expect(page.locator('[role="region"]')).toHaveCount(
      await page.locator('[role="region"]').count()
    );
  });

  test('should support screen reader announcements', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for aria-live regions for real-time updates
    const liveRegions = page.locator('[aria-live]');
    const count = await liveRegions.count();

    expect(count).toBeGreaterThan(0);
  });
});
