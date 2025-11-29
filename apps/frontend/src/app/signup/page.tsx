'use client';

// Next.js 15 정적 생성 비활성화
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Workflow, ArrowRight, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import type { OrganizationType, AIExperienceLevel, AIInterest, AIUsagePurpose } from '@/types/auth';

// 옵션 상수 정의
const ORGANIZATION_TYPES: { value: OrganizationType; label: string }[] = [
  { value: 'school', label: '학교/교육기관' },
  { value: 'company', label: '회사/기업' },
  { value: 'other', label: '기타' },
];

const AI_EXPERIENCE_LEVELS: { value: AIExperienceLevel; label: string; description: string }[] = [
  { value: 'beginner', label: '입문', description: 'AI에 대해 처음 접합니다' },
  {
    value: 'elementary',
    label: '초급',
    description: 'ChatGPT 등 기본적인 AI 도구를 사용해 봤습니다',
  },
  { value: 'intermediate', label: '중급', description: 'AI 도구를 업무나 프로젝트에 활용합니다' },
  { value: 'advanced', label: '고급', description: 'AI 모델을 직접 개발하거나 커스터마이징합니다' },
];

const AI_INTERESTS: { value: AIInterest; label: string }[] = [
  { value: 'chatbot', label: '챗봇/대화형 AI' },
  { value: 'automation', label: '업무 자동화' },
  { value: 'data_analysis', label: '데이터 분석' },
  { value: 'image_generation', label: '이미지 생성' },
  { value: 'text_generation', label: '텍스트 생성' },
  { value: 'voice_recognition', label: '음성 인식' },
  { value: 'recommendation', label: '추천 시스템' },
  { value: 'other', label: '기타' },
];

const AI_USAGE_PURPOSES: { value: AIUsagePurpose; label: string }[] = [
  { value: 'personal_learning', label: '개인 학습/자기계발' },
  { value: 'work_productivity', label: '업무 생산성 향상' },
  { value: 'business_automation', label: '비즈니스 자동화' },
  { value: 'research', label: '연구/학술' },
  { value: 'development', label: '개발/프로그래밍' },
  { value: 'other', label: '기타' },
];

export default function SignupPage() {
  const { signup, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 새로운 필드 상태
  const [organizationType, setOrganizationType] = useState<OrganizationType | ''>('');
  const [organizationName, setOrganizationName] = useState('');
  const [aiExperienceLevel, setAiExperienceLevel] = useState<AIExperienceLevel | ''>('');
  const [aiInterests, setAiInterests] = useState<AIInterest[]>([]);
  const [aiUsagePurpose, setAiUsagePurpose] = useState<AIUsagePurpose | ''>('');

  // AI 관심 분야 토글 함수
  const toggleAiInterest = (interest: AIInterest) => {
    setAiInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return '비밀번호는 최소 8자 이상이어야 합니다.';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return '비밀번호는 최소 1개의 소문자를 포함해야 합니다.';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return '비밀번호는 최소 1개의 대문자를 포함해야 합니다.';
    }
    if (!/(?=.*\d)/.test(password)) {
      return '비밀번호는 최소 1개의 숫자를 포함해야 합니다.';
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return '비밀번호는 최소 1개의 특수문자(@$!%*?&)를 포함해야 합니다.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 클라이언트 측 비밀번호 검증
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      await signup({
        email,
        password,
        name,
        organizationType: organizationType || undefined,
        organizationName: organizationName || undefined,
        aiExperienceLevel: aiExperienceLevel || undefined,
        aiInterests: aiInterests.length > 0 ? aiInterests : undefined,
        aiUsagePurpose: aiUsagePurpose || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 py-8">
      <div className="w-full max-w-lg">
        {/* 로고 및 제목 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Workflow className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gonsai2 시작하기</h1>
          <p className="text-gray-600">AI 워크플로우 자동화의 새로운 시작</p>
        </div>

        {/* 회원가입 폼 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 이름 입력 */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                이름
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                required
                minLength={2}
                maxLength={50}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            {/* 이메일 입력 */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="대문자, 소문자, 숫자, 특수문자 포함 8자 이상"
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  최소 8자 이상
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  대문자, 소문자, 숫자, 특수문자(@$!%*?&) 각 1개 이상 포함
                </p>
              </div>
            </div>

            {/* 구분선 */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">추가 정보 (선택사항)</span>
              </div>
            </div>

            {/* 소속 타입 선택 */}
            <div>
              <label
                htmlFor="organizationType"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                소속
              </label>
              <div className="relative">
                <select
                  id="organizationType"
                  value={organizationType}
                  onChange={(e) => setOrganizationType(e.target.value as OrganizationType | '')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none bg-white"
                >
                  <option value="">선택하세요</option>
                  {ORGANIZATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* 소속명 입력 */}
            {organizationType && (
              <div>
                <label
                  htmlFor="organizationName"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  소속명
                </label>
                <input
                  id="organizationName"
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder={
                    organizationType === 'school'
                      ? '예: 서울대학교'
                      : organizationType === 'company'
                        ? '예: 삼성전자'
                        : '소속명을 입력하세요'
                  }
                  maxLength={100}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            {/* AI 활용 경험 수준 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                AI 활용 경험 수준
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AI_EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() =>
                      setAiExperienceLevel(aiExperienceLevel === level.value ? '' : level.value)
                    }
                    className={`p-3 text-left rounded-lg border transition-all ${
                      aiExperienceLevel === level.value
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900">{level.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI 관심 분야 (복수 선택) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                AI 관심 분야 <span className="font-normal text-gray-500">(복수 선택 가능)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {AI_INTERESTS.map((interest) => (
                  <button
                    key={interest.value}
                    type="button"
                    onClick={() => toggleAiInterest(interest.value)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                      aiInterests.includes(interest.value)
                        ? 'border-purple-500 bg-purple-100 text-purple-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {interest.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI 활용 목적 */}
            <div>
              <label
                htmlFor="aiUsagePurpose"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                AI 활용 목적
              </label>
              <div className="relative">
                <select
                  id="aiUsagePurpose"
                  value={aiUsagePurpose}
                  onChange={(e) => setAiUsagePurpose(e.target.value as AIUsagePurpose | '')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none bg-white"
                >
                  <option value="">선택하세요</option>
                  {AI_USAGE_PURPOSES.map((purpose) => (
                    <option key={purpose.value} value={purpose.value}>
                      {purpose.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* 회원가입 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  가입 처리 중...
                </>
              ) : (
                <>
                  회원가입
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* 로그인 링크 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link
                href="/login"
                className="text-purple-600 font-semibold hover:text-purple-700 transition-colors"
              >
                로그인
              </Link>
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2025 Gonsai2. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
