'use client';

import React from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">워크플로우 관리 도움말</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Overview */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 개요</h3>
            <p className="text-gray-700">
              이 페이지에서는 n8n 워크플로우를 조회하고 실행할 수 있습니다. 좌측 메뉴의 Tags에서
              특정 태그를 선택하여 워크플로우를 필터링하거나, 워크플로우 카드의 태그를 클릭하여
              필터링할 수 있습니다.
            </p>
          </section>

          {/* Features */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 주요 기능</h3>
            <div className="space-y-3">
              <FeatureItem number={1} title="워크플로우 목록 조회">
                n8n에 등록된 모든 워크플로우를 카드 형태로 표시합니다.
              </FeatureItem>
              <FeatureItem number={2} title="태그별 필터링">
                좌측 메뉴의 Tags에서 태그를 선택하거나, 워크플로우 카드의 태그를 클릭하여
                필터링합니다.
              </FeatureItem>
              <FeatureItem number={3} title="워크플로우 실행">
                "실행" 버튼을 클릭하여 워크플로우를 즉시 실행할 수 있습니다.
              </FeatureItem>
              <FeatureItem number={4} title="n8n에서 열기">
                워크플로우를 n8n UI에서 직접 편집할 수 있습니다.
              </FeatureItem>
            </div>
          </section>

          {/* API Info */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">🔌 사용된 API</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <ApiEndpoint
                endpoint="GET /api/workflows"
                description="모든 워크플로우 조회 (태그 정보 포함)"
              />
              <ApiEndpoint endpoint="GET /api/tags" description="모든 태그 조회" />
              <ApiEndpoint
                endpoint="POST /api/workflows/:id/execute"
                description="워크플로우 실행"
              />
            </div>
          </section>

          {/* Tips */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 팁</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <TipItem>좌측 메뉴의 Tags를 확장하면 모든 태그 목록을 볼 수 있습니다.</TipItem>
              <TipItem>
                워크플로우 카드의 태그 배지를 클릭하면 해당 태그로 즉시 필터링됩니다.
              </TipItem>
              <TipItem>비활성화된 워크플로우는 n8n에서 활성화해야 실행할 수 있습니다.</TipItem>
              <TipItem>새로고침 버튼을 클릭하여 최신 워크플로우 목록을 가져올 수 있습니다.</TipItem>
              <TipItem>
                n8n에서 워크플로우에 태그를 추가/제거한 후 새로고침하면 변경사항이 반영됩니다.
              </TipItem>
            </ul>
          </section>

          {/* Troubleshooting */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">🔧 문제 해결</h3>
            <div className="space-y-3">
              <TroubleshootItem title="워크플로우 조회 실패" variant="error">
                백엔드 서버가 실행 중인지 확인하고, n8n API 키가 올바른지 확인하세요.
                <code className="block mt-1 bg-white px-2 py-1 rounded text-xs">
                  백엔드: http://192.168.0.50:3000
                </code>
              </TroubleshootItem>
              <TroubleshootItem title="워크플로우 실행 실패" variant="warning">
                워크플로우가 활성화되어 있는지 확인하고, n8n 서버가 정상 작동 중인지 확인하세요.
              </TroubleshootItem>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// 하위 컴포넌트들
function FeatureItem({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs font-semibold text-blue-600">{number}</span>
      </div>
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{children}</p>
      </div>
    </div>
  );
}

function ApiEndpoint({ endpoint, description }: { endpoint: string; description: string }) {
  return (
    <div>
      <code className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200">
        {endpoint}
      </code>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </div>
  );
}

function TipItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-blue-600 mt-1">•</span>
      <span>{children}</span>
    </li>
  );
}

function TroubleshootItem({
  title,
  variant,
  children,
}: {
  title: string;
  variant: 'error' | 'warning';
  children: React.ReactNode;
}) {
  const colors = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      title: 'text-red-900',
      text: 'text-red-700',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      title: 'text-yellow-900',
      text: 'text-yellow-700',
    },
  };

  const color = colors[variant];

  return (
    <div className={`${color.bg} border ${color.border} rounded-lg p-3`}>
      <h4 className={`font-medium ${color.title} mb-1`}>{title}</h4>
      <p className={`text-sm ${color.text}`}>{children}</p>
    </div>
  );
}
