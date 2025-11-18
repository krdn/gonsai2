'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, TestTube, Link as LinkIcon, AlertCircle } from 'lucide-react';
import type { WebhookEnvironment, WebhookTestResult } from '@/types/workflow';
import type { FormSchema } from '@/types/form-field.types';
import { generateSampleData } from '@/lib/form-field-parser';

interface WebhookInfoPanelProps {
  webhookPath: string;
  baseUrl: string;
  httpMethod?: string;
  formData?: Record<string, any>;
  formSchema?: FormSchema | null;
  onEnvironmentChange?: (env: WebhookEnvironment) => void;
}

/**
 * Webhook URL 정보를 표시하고 테스트할 수 있는 패널 컴포넌트
 */
export default function WebhookInfoPanel({
  webhookPath,
  baseUrl,
  httpMethod = 'POST',
  formData,
  formSchema,
  onEnvironmentChange,
}: WebhookInfoPanelProps) {
  const [environment, setEnvironment] = useState<WebhookEnvironment>('test');

  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // 기본 폴백 샘플 데이터
  const defaultSampleData = {
    // 텍스트 필드 예시
    name: '홍길동',
    title: '테스트 제목',

    // 이메일 필드 예시
    email: 'test@example.com',

    // 다중 줄 텍스트 필드 예시
    message: '이것은 테스트 메시지입니다.\n여러 줄의 텍스트를 입력할 수 있습니다.',
    description: '상세 설명 내용',

    // 숫자 필드 예시
    age: 25,
    quantity: 10,
    price: 15000,

    // 선택 필드 예시
    category: 'general',
    status: 'active',

    // 체크박스 필드 예시
    agree: true,
    subscribe: false,
  };

  const [testPayload, setTestPayload] = useState<string>(
    JSON.stringify(defaultSampleData, null, 2)
  );

  /**
   * FormSchema 변경 시 동적 샘플 데이터 생성
   */
  useEffect(() => {
    if (formSchema) {
      const sampleData = generateSampleData(formSchema);
      setTestPayload(JSON.stringify(sampleData, null, 2));
    } else {
      // FormSchema가 없으면 기본 샘플 사용
      setTestPayload(JSON.stringify(defaultSampleData, null, 2));
    }
  }, [formSchema]);

  /**
   * Webhook URL 생성
   */
  const getWebhookUrl = (env: WebhookEnvironment): string => {
    const path = webhookPath.startsWith('/') ? webhookPath : `/${webhookPath}`;
    const prefix = env === 'test' ? '/webhook-test' : '/webhook';
    return `${baseUrl}${prefix}${path}`;
  };

  const currentUrl = getWebhookUrl(environment);

  /**
   * URL 클립보드 복사
   */
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedUrl(currentUrl);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('URL 복사 실패:', error);
    }
  };

  /**
   * Webhook 테스트 실행
   */
  const handleTestWebhook = async () => {
    if (isTesting) return;

    setIsTesting(true);
    setTestResult(null);

    const startTime = Date.now();

    try {
      // testPayload를 파싱하여 전송
      let payloadData: any;
      try {
        payloadData = JSON.parse(testPayload);
      } catch (parseError) {
        setTestResult({
          success: false,
          status: 0,
          statusText: 'JSON Parse Error',
          error: 'JSON 형식이 올바르지 않습니다.',
          timestamp: new Date().toISOString(),
          duration: 0,
        });
        setIsTesting(false);
        return;
      }

      const response = await fetch(currentUrl, {
        method: httpMethod,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadData),
      });

      const duration = Date.now() - startTime;
      let data: any;

      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      setTestResult({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
        timestamp: new Date().toISOString(),
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      setTestResult({
        success: false,
        status: 0,
        statusText: 'Network Error',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        timestamp: new Date().toISOString(),
        duration,
      });
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * 환경 토글 핸들러
   */
  const handleToggleEnvironment = (env: WebhookEnvironment) => {
    setEnvironment(env);
    setTestResult(null);
    onEnvironmentChange?.(env); // 부모 컴포넌트에 환경 변경 알림
  };

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <LinkIcon className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-semibold text-blue-900">Webhook URL 정보</h3>
      </div>

      {/* 환경 토글 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-600">환경:</span>
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => handleToggleEnvironment('test')}
            className={`px-3 py-1 text-xs font-medium rounded-l-md border transition-colors ${
              environment === 'test'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            테스트
          </button>
          <button
            type="button"
            onClick={() => handleToggleEnvironment('production')}
            className={`px-3 py-1 text-xs font-medium rounded-r-md border-t border-r border-b transition-colors ${
              environment === 'production'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            프로덕션
          </button>
        </div>
      </div>

      {/* URL 표시 및 복사 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md">
            <code className="flex-1 text-xs text-gray-800 truncate">{currentUrl}</code>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="URL 복사"
            >
              {copiedUrl === currentUrl ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* HTTP 메서드 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-600">
          메서드: <span className="font-mono font-semibold">{httpMethod}</span>
        </span>
      </div>

      {/* 테스트 JSON 입력 */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">테스트 JSON 페이로드</label>
        <textarea
          value={testPayload}
          onChange={(e) => setTestPayload(e.target.value)}
          className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={6}
          placeholder='{"key": "value"}'
        />
      </div>

      {/* 테스트 버튼 */}
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={handleTestWebhook}
          disabled={isTesting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <TestTube className="w-3.5 h-3.5" />
          {isTesting ? '테스트 중...' : 'Webhook 테스트'}
        </button>
      </div>

      {/* 테스트 결과 */}
      {testResult && (
        <div
          className={`p-3 rounded-md border ${
            testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-2 mb-2">
            {testResult.success ? (
              <Check className="w-4 h-4 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900 mb-1">
                {testResult.success ? '✅ 테스트 성공' : '❌ 테스트 실패'}
              </div>
              <div className="text-xs text-gray-700">
                <span className="font-semibold">상태:</span>{' '}
                <span className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                  {testResult.status} {testResult.statusText}
                </span>
                {testResult.duration !== undefined && (
                  <span className="ml-2 text-gray-500">({testResult.duration}ms)</span>
                )}
              </div>
            </div>
          </div>

          {/* 에러 메시지 */}
          {testResult.error && (
            <div className="mt-2 p-2 bg-white rounded text-xs text-red-700 font-mono">
              {testResult.error}
            </div>
          )}

          {/* 응답 데이터 */}
          {testResult.data && (
            <details className="mt-2">
              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                응답 데이터 보기
              </summary>
              <div className="mt-2 p-2 bg-white rounded text-xs font-mono overflow-auto max-h-40">
                <pre>{JSON.stringify(testResult.data, null, 2)}</pre>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
