'use client';

// Next.js 15 정적 생성 비활성화
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  User,
  OrganizationType,
  AIExperienceLevel,
  AIInterest,
  AIUsagePurpose,
  PreferredNotificationChannel,
  PreferredLanguage,
} from '@/types/auth';
import { useRouter } from 'next/navigation';
import {
  HelpCircle,
  X,
  User as UserIcon,
  Building,
  Phone,
  Brain,
  Shield,
  Settings,
  Bell,
  Globe,
  Lock,
} from 'lucide-react';

// 라벨 매핑
const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  school: '학교/교육기관',
  company: '회사/기업',
  other: '기타',
};

const AI_EXPERIENCE_LABELS: Record<AIExperienceLevel, string> = {
  beginner: '입문 (AI가 처음이에요)',
  elementary: '초급 (기본적인 사용 경험)',
  intermediate: '중급 (다양한 AI 도구 활용)',
  advanced: '고급 (AI 개발/연구 경험)',
};

const AI_INTEREST_LABELS: Record<AIInterest, string> = {
  chatbot: '챗봇/대화형 AI',
  automation: '업무 자동화',
  data_analysis: '데이터 분석',
  image_generation: '이미지 생성',
  text_generation: '텍스트 생성',
  voice_recognition: '음성 인식',
  recommendation: '추천 시스템',
  other: '기타',
};

const AI_PURPOSE_LABELS: Record<AIUsagePurpose, string> = {
  personal_learning: '개인 학습/자기개발',
  work_productivity: '업무 생산성 향상',
  business_automation: '비즈니스 자동화',
  research: '연구/학술',
  development: '개발/프로그래밍',
  other: '기타',
};

const NOTIFICATION_CHANNEL_LABELS: Record<PreferredNotificationChannel, string> = {
  email: '이메일',
  telegram: 'Telegram',
  kakao: 'KakaoTalk',
};

const LANGUAGE_LABELS: Record<PreferredLanguage, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
};

const TIMEZONES: { value: string; label: string }[] = [
  { value: 'Asia/Seoul', label: '한국 (UTC+9)' },
  { value: 'Asia/Tokyo', label: '일본 (UTC+9)' },
  { value: 'Asia/Shanghai', label: '중국 (UTC+8)' },
  { value: 'America/New_York', label: '미국 동부 (UTC-5)' },
  { value: 'America/Los_Angeles', label: '미국 서부 (UTC-8)' },
  { value: 'Europe/London', label: '영국 (UTC+0)' },
  { value: 'Europe/Paris', label: '프랑스 (UTC+1)' },
];

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'basic' | 'additional' | 'security'>('basic');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    // 기본 정보
    name: '',
    email: '',
    avatar: '',
    // 소속 정보
    organizationType: '' as OrganizationType | '',
    organizationName: '',
    // AI 정보
    aiExperienceLevel: '' as AIExperienceLevel | '',
    aiInterests: [] as AIInterest[],
    aiUsagePurpose: '' as AIUsagePurpose | '',
    // 연락처 정보
    phoneNumber: '',
    telegramId: '',
    kakaoTalkId: '',
    // 사용자 환경설정
    preferredNotificationChannel: '' as PreferredNotificationChannel | '',
    timezone: 'Asia/Seoul',
    preferredLanguage: 'ko' as PreferredLanguage | '',
    // 비밀번호
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 사용자 정보 로드
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar || '',
        organizationType: user.organizationType || '',
        organizationName: user.organizationName || '',
        aiExperienceLevel: user.aiExperienceLevel || '',
        aiInterests: user.aiInterests || [],
        aiUsagePurpose: user.aiUsagePurpose || '',
        phoneNumber: user.phoneNumber || '',
        telegramId: user.telegramId || '',
        kakaoTalkId: user.kakaoTalkId || '',
        preferredNotificationChannel: user.preferredNotificationChannel || '',
        timezone: user.timezone || 'Asia/Seoul',
        preferredLanguage: user.preferredLanguage || 'ko',
      }));
    }
  }, [user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInterestToggle = (interest: AIInterest) => {
    setFormData((prev) => ({
      ...prev,
      aiInterests: prev.aiInterests.includes(interest)
        ? prev.aiInterests.filter((i) => i !== interest)
        : [...prev.aiInterests, interest],
    }));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('이미지 크기는 2MB 이하여야 합니다.');
      return;
    }

    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // Base64로 변환
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        avatar: base64,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 비밀번호 변경 시 확인
    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setError('새 비밀번호가 일치하지 않습니다.');
        return;
      }
      if (!formData.currentPassword) {
        setError('현재 비밀번호를 입력해주세요.');
        return;
      }
      if (formData.newPassword.length < 6) {
        setError('새 비밀번호는 최소 6자 이상이어야 합니다.');
        return;
      }
    }

    try {
      setIsLoading(true);

      // 업데이트할 데이터 준비
      const updateData: Record<string, unknown> = {};

      // 기본 정보
      if (formData.name !== user?.name) updateData.name = formData.name;
      if (formData.email !== user?.email) updateData.email = formData.email;
      if (formData.avatar !== (user?.avatar || '')) updateData.avatar = formData.avatar;

      // 소속 정보
      if (formData.organizationType !== (user?.organizationType || '')) {
        updateData.organizationType = formData.organizationType || null;
      }
      if (formData.organizationName !== (user?.organizationName || '')) {
        updateData.organizationName = formData.organizationName;
      }

      // AI 정보
      if (formData.aiExperienceLevel !== (user?.aiExperienceLevel || '')) {
        updateData.aiExperienceLevel = formData.aiExperienceLevel || null;
      }
      if (JSON.stringify(formData.aiInterests) !== JSON.stringify(user?.aiInterests || [])) {
        updateData.aiInterests = formData.aiInterests;
      }
      if (formData.aiUsagePurpose !== (user?.aiUsagePurpose || '')) {
        updateData.aiUsagePurpose = formData.aiUsagePurpose || null;
      }

      // 연락처 정보
      if (formData.phoneNumber !== (user?.phoneNumber || '')) {
        updateData.phoneNumber = formData.phoneNumber;
      }
      if (formData.telegramId !== (user?.telegramId || '')) {
        updateData.telegramId = formData.telegramId;
      }
      if (formData.kakaoTalkId !== (user?.kakaoTalkId || '')) {
        updateData.kakaoTalkId = formData.kakaoTalkId;
      }

      // 사용자 환경설정
      if (formData.preferredNotificationChannel !== (user?.preferredNotificationChannel || '')) {
        updateData.preferredNotificationChannel = formData.preferredNotificationChannel || null;
      }
      if (formData.timezone !== (user?.timezone || 'Asia/Seoul')) {
        updateData.timezone = formData.timezone;
      }
      if (formData.preferredLanguage !== (user?.preferredLanguage || 'ko')) {
        updateData.preferredLanguage = formData.preferredLanguage || null;
      }

      // 비밀번호
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      // 변경사항이 없으면 에러
      if (Object.keys(updateData).length === 0) {
        setError('변경된 정보가 없습니다.');
        return;
      }

      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '프로필 업데이트에 실패했습니다.');
      }

      const data = await response.json();

      // 사용자 정보 업데이트
      updateUser(data.user);

      // 성공 메시지 및 편집 모드 종료
      setSuccess('프로필이 성공적으로 업데이트되었습니다.');
      setIsEditing(false);

      // 비밀번호 필드 초기화
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로필 업데이트에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    // 원래 값으로 복원
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar || '',
        organizationType: user.organizationType || '',
        organizationName: user.organizationName || '',
        aiExperienceLevel: user.aiExperienceLevel || '',
        aiInterests: user.aiInterests || [],
        aiUsagePurpose: user.aiUsagePurpose || '',
        phoneNumber: user.phoneNumber || '',
        telegramId: user.telegramId || '',
        kakaoTalkId: user.kakaoTalkId || '',
        preferredNotificationChannel: user.preferredNotificationChannel || '',
        timezone: user.timezone || 'Asia/Seoul',
        preferredLanguage: user.preferredLanguage || 'ko',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">프로필 설정</h1>
          <p className="mt-1 text-sm text-gray-500">계정 정보를 확인하고 수정할 수 있습니다.</p>
        </div>
        <button
          onClick={() => setIsHelpModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          title="도움말"
        >
          <HelpCircle className="w-4 h-4" />
          도움말
        </button>
      </div>

      {/* 성공/에러 메시지 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        {/* 탭 네비게이션 */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              기본 정보
            </button>
            <button
              onClick={() => setActiveTab('additional')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'additional'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              추가 정보
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'security'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              보안
            </button>
          </nav>
        </div>

        {/* 탭 콘텐츠 */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6">
            {/* 기본 정보 탭 */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {/* 아바타 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    프로필 이미지
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      {formData.avatar ? (
                        <img
                          src={formData.avatar}
                          alt="프로필"
                          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-2xl text-gray-500">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <div className="flex flex-col space-y-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleAvatarChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                          이미지 변경
                        </button>
                        {formData.avatar && (
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, avatar: '' }))}
                            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700"
                          >
                            이미지 삭제
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">JPG, PNG 형식, 최대 2MB</p>
                </div>

                {/* 이름 */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    required
                  />
                </div>

                {/* 이메일 */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    이메일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    required
                  />
                </div>

                {/* 소속 타입 */}
                <div>
                  <label
                    htmlFor="organizationType"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    소속 구분
                  </label>
                  <select
                    id="organizationType"
                    name="organizationType"
                    value={formData.organizationType}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="">선택하세요</option>
                    {Object.entries(ORGANIZATION_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 소속명 */}
                <div>
                  <label
                    htmlFor="organizationName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    소속명
                  </label>
                  <input
                    type="text"
                    id="organizationName"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="예: OO대학교, OO회사"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {/* 구분선 - 연락처 */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">연락처 정보</h3>
                </div>

                {/* 휴대폰 번호 */}
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    휴대폰 번호
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="010-1234-5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {/* Telegram / KakaoTalk */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="telegramId"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Telegram 아이디
                    </label>
                    <input
                      type="text"
                      id="telegramId"
                      name="telegramId"
                      value={formData.telegramId}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="@username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="kakaoTalkId"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      KakaoTalk 아이디
                    </label>
                    <input
                      type="text"
                      id="kakaoTalkId"
                      name="kakaoTalkId"
                      value={formData.kakaoTalkId}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="카카오톡 ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 추가 정보 탭 */}
            {activeTab === 'additional' && (
              <div className="space-y-6">
                {/* AI 활용 경험 */}
                <div>
                  <label
                    htmlFor="aiExperienceLevel"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    AI 활용 경험 수준
                  </label>
                  <select
                    id="aiExperienceLevel"
                    name="aiExperienceLevel"
                    value={formData.aiExperienceLevel}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="">선택하세요</option>
                    {Object.entries(AI_EXPERIENCE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* AI 관심 분야 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI 관심 분야 <span className="text-xs text-gray-500">(복수 선택 가능)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(AI_INTEREST_LABELS).map(([value, label]) => (
                      <label
                        key={value}
                        className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${
                          formData.aiInterests.includes(value as AIInterest)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.aiInterests.includes(value as AIInterest)}
                          onChange={() => isEditing && handleInterestToggle(value as AIInterest)}
                          disabled={!isEditing}
                          className="sr-only"
                        />
                        <span
                          className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${
                            formData.aiInterests.includes(value as AIInterest)
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {formData.aiInterests.includes(value as AIInterest) && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </span>
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* AI 활용 목적 */}
                <div>
                  <label
                    htmlFor="aiUsagePurpose"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    AI 활용 목적
                  </label>
                  <select
                    id="aiUsagePurpose"
                    name="aiUsagePurpose"
                    value={formData.aiUsagePurpose}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="">선택하세요</option>
                    {Object.entries(AI_PURPOSE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* AI 프로필 정보 안내 */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>왜 AI 관련 정보를 수집하나요?</strong>
                    <br />
                    입력하신 정보를 바탕으로 맞춤형 AI 워크플로우를 추천하고, 더 나은 학습 경험을
                    제공해 드립니다.
                  </p>
                </div>

                {/* 구분선 - 환경설정 */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">환경설정</h3>
                </div>

                {/* 선호 알림 채널 */}
                <div>
                  <label
                    htmlFor="preferredNotificationChannel"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    선호 알림 채널
                  </label>
                  <select
                    id="preferredNotificationChannel"
                    name="preferredNotificationChannel"
                    value={formData.preferredNotificationChannel}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="">선택하세요</option>
                    {Object.entries(NOTIFICATION_CHANNEL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 타임존 / 선호 언어 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="timezone"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      타임존
                    </label>
                    <select
                      id="timezone"
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="preferredLanguage"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      선호 언어
                    </label>
                    <select
                      id="preferredLanguage"
                      name="preferredLanguage"
                      value={formData.preferredLanguage}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 보안 탭 */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">비밀번호 변경</h3>
                  <p className="text-sm text-gray-500">
                    비밀번호를 변경하려면 현재 비밀번호와 새 비밀번호를 입력하세요.
                  </p>
                </div>

                {/* 현재 비밀번호 */}
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    현재 비밀번호
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="현재 비밀번호를 입력하세요"
                  />
                </div>

                {/* 새 비밀번호 */}
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="최소 6자 이상"
                    minLength={6}
                  />
                </div>

                {/* 비밀번호 확인 */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    비밀번호 확인
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="새 비밀번호를 다시 입력하세요"
                  />
                </div>

                {/* 보안 팁 */}
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>안전한 비밀번호 팁:</strong>
                    <br />• 최소 6자 이상 사용
                    <br />• 영문, 숫자, 특수문자 조합 권장
                    <br />• 다른 사이트와 동일한 비밀번호 사용 지양
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 버튼 영역 */}
          <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                수정하기
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  disabled={isLoading}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? '저장 중...' : '저장하기'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* 계정 정보 */}
      <div className="mt-6 bg-white rounded-lg shadow-md px-6 py-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4">계정 정보</h2>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">사용자 ID</dt>
            <dd className="text-sm text-gray-900 font-mono">{user._id || user.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">역할</dt>
            <dd className="text-sm text-gray-900">
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  user.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {user.role === 'admin' ? '관리자' : '일반 사용자'}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">가입일</dt>
            <dd className="text-sm text-gray-900">
              {new Date(user.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>
          {user.updatedAt && (
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">마지막 업데이트</dt>
              <dd className="text-sm text-gray-900">
                {new Date(user.updatedAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* 현재 프로필 요약 */}
      <div className="mt-6 bg-white rounded-lg shadow-md px-6 py-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4">프로필 요약</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {user.organizationType && (
            <div>
              <dt className="text-sm text-gray-500">소속</dt>
              <dd className="text-sm text-gray-900">
                {ORGANIZATION_TYPE_LABELS[user.organizationType]}
                {user.organizationName && ` - ${user.organizationName}`}
              </dd>
            </div>
          )}
          {user.aiExperienceLevel && (
            <div>
              <dt className="text-sm text-gray-500">AI 경험 수준</dt>
              <dd className="text-sm text-gray-900">
                {AI_EXPERIENCE_LABELS[user.aiExperienceLevel]}
              </dd>
            </div>
          )}
          {user.aiUsagePurpose && (
            <div>
              <dt className="text-sm text-gray-500">AI 활용 목적</dt>
              <dd className="text-sm text-gray-900">{AI_PURPOSE_LABELS[user.aiUsagePurpose]}</dd>
            </div>
          )}
          {user.aiInterests && user.aiInterests.length > 0 && (
            <div className="md:col-span-2">
              <dt className="text-sm text-gray-500 mb-1">AI 관심 분야</dt>
              <dd className="flex flex-wrap gap-2">
                {user.aiInterests.map((interest) => (
                  <span
                    key={interest}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {AI_INTEREST_LABELS[interest]}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {(user.phoneNumber || user.telegramId || user.kakaoTalkId) && (
            <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
              <dt className="text-sm text-gray-500 mb-2">연락처</dt>
              <dd className="flex flex-wrap gap-4 text-sm text-gray-900">
                {user.phoneNumber && <span>📱 {user.phoneNumber}</span>}
                {user.telegramId && <span>💬 Telegram: {user.telegramId}</span>}
                {user.kakaoTalkId && <span>💬 KakaoTalk: {user.kakaoTalkId}</span>}
              </dd>
            </div>
          )}
          {(user.preferredNotificationChannel || user.timezone || user.preferredLanguage) && (
            <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
              <dt className="text-sm text-gray-500 mb-2">환경설정</dt>
              <dd className="flex flex-wrap gap-4 text-sm text-gray-900">
                {user.preferredNotificationChannel && (
                  <span>
                    🔔 알림: {NOTIFICATION_CHANNEL_LABELS[user.preferredNotificationChannel]}
                  </span>
                )}
                {user.timezone && (
                  <span>
                    🌍 타임존:{' '}
                    {TIMEZONES.find((tz) => tz.value === user.timezone)?.label || user.timezone}
                  </span>
                )}
                {user.preferredLanguage && (
                  <span>🌐 언어: {LANGUAGE_LABELS[user.preferredLanguage]}</span>
                )}
              </dd>
            </div>
          )}
          {!user.organizationType &&
            !user.aiExperienceLevel &&
            !user.aiUsagePurpose &&
            (!user.aiInterests || user.aiInterests.length === 0) &&
            !user.phoneNumber &&
            !user.telegramId &&
            !user.kakaoTalkId && (
              <div className="md:col-span-2 text-center py-4">
                <p className="text-sm text-gray-500">
                  추가 정보가 입력되지 않았습니다.
                  <br />
                  <button
                    onClick={() => {
                      setActiveTab('additional');
                      setIsEditing(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    지금 입력하기
                  </button>
                </p>
              </div>
            )}
        </dl>
      </div>

      {/* 도움말 모달 */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">프로필 설정 도움말</h3>
              </div>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* 개요 */}
              <section>
                <h4 className="text-md font-semibold text-gray-800 mb-2">개요</h4>
                <p className="text-sm text-gray-600">
                  프로필 설정 페이지에서는 개인 정보, AI 관련 설정, 보안 설정을 관리할 수 있습니다.
                  수정하려면 &apos;수정하기&apos; 버튼을 클릭한 후 정보를 변경하세요.
                </p>
              </section>

              {/* 탭 설명 */}
              <section>
                <h4 className="text-md font-semibold text-gray-800 mb-2">탭 구성</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <UserIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-700">기본 정보</p>
                      <p className="text-sm text-gray-600">
                        프로필 이미지, 이름, 이메일, 소속 정보, 연락처를 관리합니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <Brain className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-700">추가 정보</p>
                      <p className="text-sm text-gray-600">
                        AI 활용 경험, 관심 분야, 활용 목적 및 환경설정(알림, 타임존, 언어)을
                        관리합니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <Lock className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-700">보안</p>
                      <p className="text-sm text-gray-600">
                        비밀번호를 변경합니다. 현재 비밀번호 확인 후 새 비밀번호를 설정할 수
                        있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 기본 정보 설명 */}
              <section>
                <h4 className="text-md font-semibold text-gray-800 mb-2">기본 정보 항목</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                    <UserIcon className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">프로필 이미지 (2MB 이하)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                    <UserIcon className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">이름 (필수)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                    <Globe className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">이메일 (필수)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                    <Building className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">소속 구분/소속명</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                    <Phone className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">휴대폰 번호</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                    <Bell className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Telegram / KakaoTalk ID</span>
                  </div>
                </div>
              </section>

              {/* AI 정보 설명 */}
              <section>
                <h4 className="text-md font-semibold text-gray-800 mb-2">AI 관련 정보</h4>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>왜 AI 관련 정보를 입력하나요?</strong>
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                    <li>맞춤형 AI 워크플로우 추천</li>
                    <li>경험 수준에 맞는 가이드 제공</li>
                    <li>관심 분야 기반 콘텐츠 큐레이션</li>
                  </ul>
                </div>
              </section>

              {/* 환경설정 설명 */}
              <section>
                <h4 className="text-md font-semibold text-gray-800 mb-2">환경설정</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                    <Bell className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">
                      선호 알림 채널: 이메일, Telegram, KakaoTalk
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">
                      타임존: 알림 및 스케줄 기준 시간대
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                    <Settings className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-600">선호 언어: 인터페이스 언어 설정</span>
                  </div>
                </div>
              </section>

              {/* 주의사항 */}
              <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-md font-semibold text-yellow-800 mb-2">주의사항</h4>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>이름과 이메일은 필수 항목입니다.</li>
                  <li>프로필 이미지는 JPG, PNG 형식만 지원하며 최대 2MB입니다.</li>
                  <li>비밀번호 변경 시 현재 비밀번호를 먼저 입력해야 합니다.</li>
                  <li>새 비밀번호는 최소 6자 이상이어야 합니다.</li>
                  <li>변경사항은 &apos;저장하기&apos; 버튼을 클릭해야 저장됩니다.</li>
                </ul>
              </section>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
