#!/usr/bin/env ts-node

/**
 * n8n Fix Generator Script
 *
 * 분석된 오류를 기반으로 Claude API를 호출하여:
 * - 수정 코드 생성
 * - 워크플로우 패치
 * - 설정 조정
 */

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// Types
// ============================================================================

interface AnalysisResult {
  summary: {
    total_errors: number;
    unique_patterns: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    analysis_timestamp: string;
  };
  categorized_errors: CategorizedError[];
  priority_fixes: PriorityFix[];
  recommendations: string[];
}

interface CategorizedError {
  pattern: string;
  category: {
    category: string;
    subcategory: string;
    severity: string;
    description: string;
  };
  frequency: number;
  affected_workflows: string[];
  affected_nodes: string[];
  impact_score: number;
  first_seen: string;
  last_seen: string;
}

interface PriorityFix {
  rank: number;
  error_pattern: string;
  category: string;
  severity: string;
  frequency: number;
  impact_score: number;
  fix_type: 'workflow' | 'code' | 'configuration' | 'infrastructure';
  estimated_effort: 'low' | 'medium' | 'high';
  automated_fix_available: boolean;
  recommendation: string;
}

interface GeneratedFix {
  fix_id: string;
  error_pattern: string;
  fix_type: string;
  description: string;
  changes: Change[];
  test_plan: string[];
  rollback_plan: string;
  estimated_impact: string;
}

interface Change {
  type: 'workflow' | 'code' | 'configuration';
  target: string;
  action: 'create' | 'update' | 'delete';
  content: string;
  backup_path?: string;
}

interface FixGenerationResult {
  generated_at: string;
  total_fixes: number;
  successful_fixes: number;
  failed_fixes: number;
  fixes: GeneratedFix[];
  errors: string[];
}

// ============================================================================
// Configuration
// ============================================================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

// ============================================================================
// Claude API Integration
// ============================================================================

async function generateFixWithClaude(
  fix: PriorityFix,
  context: string
): Promise<GeneratedFix | null> {
  if (!ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set');
    return null;
  }

  console.log(`\n🤖 Generating fix for: ${fix.error_pattern}`);

  const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
  });

  const prompt = `You are an expert n8n workflow automation engineer. Analyze the following error and generate a fix.

## Error Information
- Pattern: ${fix.error_pattern}
- Category: ${fix.category}
- Severity: ${fix.severity}
- Frequency: ${fix.frequency}
- Fix Type: ${fix.fix_type}
- Recommendation: ${fix.recommendation}

## Context
${context}

## Task
Generate a detailed fix for this error. Provide:

1. **Description**: Clear explanation of what the fix does
2. **Changes**: List of specific changes to make (workflow JSON patches, code changes, or configuration updates)
3. **Test Plan**: Steps to verify the fix works
4. **Rollback Plan**: How to revert if something goes wrong
5. **Impact Assessment**: What workflows/systems will be affected

Format your response as JSON:
{
  "description": "...",
  "changes": [
    {
      "type": "workflow|code|configuration",
      "target": "workflow name or file path",
      "action": "create|update|delete",
      "content": "actual content or patch"
    }
  ],
  "test_plan": ["step 1", "step 2", ...],
  "rollback_plan": "...",
  "estimated_impact": "..."
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // 응답 파싱
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // JSON 추출 (코드 블록에서)
    const jsonMatch =
      responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('❌ Failed to extract JSON from Claude response');
      return null;
    }

    const fixData = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    const generatedFix: GeneratedFix = {
      fix_id: `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      error_pattern: fix.error_pattern,
      fix_type: fix.fix_type,
      description: fixData.description,
      changes: fixData.changes,
      test_plan: fixData.test_plan,
      rollback_plan: fixData.rollback_plan,
      estimated_impact: fixData.estimated_impact,
    };

    console.log(`✅ Fix generated successfully`);
    console.log(`   Description: ${generatedFix.description}`);
    console.log(`   Changes: ${generatedFix.changes.length}`);

    return generatedFix;
  } catch (error) {
    console.error('❌ Error calling Claude API:', error);
    return null;
  }
}

// ============================================================================
// n8n Workflow Patching
// ============================================================================

async function fetchWorkflow(workflowId: string): Promise<any> {
  if (!N8N_API_KEY) {
    throw new Error('N8N_API_KEY not set');
  }

  const response = await fetch(`${N8N_URL}/api/v1/workflows/${workflowId}`, {
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workflow: ${response.statusText}`);
  }

  return response.json();
}

async function updateWorkflow(workflowId: string, workflow: any): Promise<void> {
  if (!N8N_API_KEY) {
    throw new Error('N8N_API_KEY not set');
  }

  const response = await fetch(`${N8N_URL}/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': N8N_API_KEY,
    },
    body: JSON.stringify(workflow),
  });

  if (!response.ok) {
    throw new Error(`Failed to update workflow: ${response.statusText}`);
  }
}

async function applyWorkflowFix(change: Change, backupDir: string): Promise<void> {
  console.log(`  📝 Applying workflow fix: ${change.target}`);

  // 워크플로우 ID 추출 (이름 또는 ID)
  const workflowId = change.target;

  try {
    // 현재 워크플로우 백업
    const originalWorkflow = await fetchWorkflow(workflowId);
    const backupPath = path.join(backupDir, `workflow_${workflowId}_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(originalWorkflow, null, 2));
    console.log(`  💾 Backup created: ${backupPath}`);

    // 패치 적용
    const patchedWorkflow = JSON.parse(change.content);

    // 워크플로우 업데이트
    await updateWorkflow(workflowId, patchedWorkflow);

    console.log(`  ✅ Workflow updated successfully`);
  } catch (error) {
    console.error(`  ❌ Failed to apply workflow fix:`, error);
    throw error;
  }
}

// ============================================================================
// Configuration Changes
// ============================================================================

async function applyConfigurationFix(change: Change, backupDir: string): Promise<void> {
  console.log(`  ⚙️  Applying configuration fix: ${change.target}`);

  const configPath = path.resolve(process.cwd(), change.target);

  try {
    // 백업 생성
    if (fs.existsSync(configPath)) {
      const backupPath = path.join(backupDir, `config_${path.basename(configPath)}_${Date.now()}`);
      fs.copyFileSync(configPath, backupPath);
      console.log(`  💾 Backup created: ${backupPath}`);
    }

    // 설정 파일 업데이트
    if (change.action === 'create' || change.action === 'update') {
      fs.writeFileSync(configPath, change.content);
      console.log(`  ✅ Configuration updated: ${configPath}`);
    } else if (change.action === 'delete') {
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
        console.log(`  ✅ Configuration deleted: ${configPath}`);
      }
    }
  } catch (error) {
    console.error(`  ❌ Failed to apply configuration fix:`, error);
    throw error;
  }
}

// ============================================================================
// Code Changes
// ============================================================================

async function applyCodeFix(change: Change, backupDir: string): Promise<void> {
  console.log(`  💻 Applying code fix: ${change.target}`);

  const codePath = path.resolve(process.cwd(), change.target);

  try {
    // 백업 생성
    if (fs.existsSync(codePath)) {
      const backupPath = path.join(backupDir, `code_${path.basename(codePath)}_${Date.now()}`);
      fs.copyFileSync(codePath, backupPath);
      console.log(`  💾 Backup created: ${backupPath}`);
    }

    // 코드 파일 업데이트
    if (change.action === 'create' || change.action === 'update') {
      const dir = path.dirname(codePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(codePath, change.content);
      console.log(`  ✅ Code updated: ${codePath}`);
    } else if (change.action === 'delete') {
      if (fs.existsSync(codePath)) {
        fs.unlinkSync(codePath);
        console.log(`  ✅ Code deleted: ${codePath}`);
      }
    }
  } catch (error) {
    console.error(`  ❌ Failed to apply code fix:`, error);
    throw error;
  }
}

// ============================================================================
// Apply Generated Fixes
// ============================================================================

async function applyFix(fix: GeneratedFix, backupDir: string): Promise<boolean> {
  console.log(`\n🔧 Applying fix: ${fix.fix_id}`);
  console.log(`   ${fix.description}`);

  try {
    for (const change of fix.changes) {
      switch (change.type) {
        case 'workflow':
          await applyWorkflowFix(change, backupDir);
          break;
        case 'configuration':
          await applyConfigurationFix(change, backupDir);
          break;
        case 'code':
          await applyCodeFix(change, backupDir);
          break;
        default:
          console.warn(`  ⚠️  Unknown change type: ${change.type}`);
      }
    }

    console.log(`✅ Fix applied successfully: ${fix.fix_id}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to apply fix ${fix.fix_id}:`, error);
    return false;
  }
}

// ============================================================================
// Main Fix Generation
// ============================================================================

async function generateFixes(analysisPath: string): Promise<FixGenerationResult> {
  console.log('🔧 Starting fix generation...');

  // 분석 결과 읽기
  const analysis: AnalysisResult = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));

  if (analysis.priority_fixes.length === 0) {
    console.log('✅ No fixes needed');
    return {
      generated_at: new Date().toISOString(),
      total_fixes: 0,
      successful_fixes: 0,
      failed_fixes: 0,
      fixes: [],
      errors: [],
    };
  }

  // 백업 디렉토리 생성
  const scriptDir = path.dirname(analysisPath);
  const backupDir = path.join(scriptDir, '..', 'backups', Date.now().toString());
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📂 Backup directory: ${backupDir}`);

  const fixes: GeneratedFix[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let failCount = 0;

  // 자동 수정 가능한 항목만 처리 (최대 5개)
  const autoFixable = analysis.priority_fixes.filter((f) => f.automated_fix_available).slice(0, 5);

  console.log(`\n📊 Processing ${autoFixable.length} auto-fixable errors...`);

  // 컨텍스트 생성
  const context = `
Total Errors: ${analysis.summary.total_errors}
Critical: ${analysis.summary.critical_count}
High: ${analysis.summary.high_count}

Affected Workflows: ${[...new Set(analysis.categorized_errors.flatMap((e) => e.affected_workflows))].join(', ')}
  `.trim();

  for (const priorityFix of autoFixable) {
    try {
      // Claude API로 수정 생성
      const generatedFix = await generateFixWithClaude(priorityFix, context);

      if (generatedFix) {
        fixes.push(generatedFix);

        // 수정 적용
        const applied = await applyFix(generatedFix, backupDir);

        if (applied) {
          successCount++;
        } else {
          failCount++;
          errors.push(`Failed to apply fix for: ${priorityFix.error_pattern}`);
        }
      } else {
        failCount++;
        errors.push(`Failed to generate fix for: ${priorityFix.error_pattern}`);
      }
    } catch (error) {
      failCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Error processing ${priorityFix.error_pattern}: ${errorMsg}`);
      console.error(`❌ Error:`, error);
    }

    // API rate limiting 방지를 위한 대기
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const result: FixGenerationResult = {
    generated_at: new Date().toISOString(),
    total_fixes: autoFixable.length,
    successful_fixes: successCount,
    failed_fixes: failCount,
    fixes,
    errors,
  };

  return result;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: fix-generator.ts <analysis-result-path>');
    process.exit(1);
  }

  const analysisPath = args[0];

  if (!fs.existsSync(analysisPath)) {
    console.error(`Analysis result file not found: ${analysisPath}`);
    process.exit(1);
  }

  try {
    const result = await generateFixes(analysisPath);

    // 결과 출력
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 Fix Generation Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Fixes: ${result.total_fixes}`);
    console.log(`Successful: ${result.successful_fixes}`);
    console.log(`Failed: ${result.failed_fixes}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((err) => console.log(`  - ${err}`));
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 결과를 파일로 저장
    const outputPath = path.join(path.dirname(analysisPath), 'fixes.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`✅ Fix generation result saved to: ${outputPath}`);

    process.exit(result.failed_fixes > 0 ? 1 : 0);
  } catch (error) {
    console.error('Error during fix generation:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main();
}

export { generateFixes, FixGenerationResult };
