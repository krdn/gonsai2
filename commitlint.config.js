// commitlint 설정 - 커밋 메시지 규칙
// https://commitlint.js.org/

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 타입 규칙
    'type-enum': [
      2,
      'always',
      [
        'feat', // 새로운 기능
        'fix', // 버그 수정
        'docs', // 문서 변경
        'style', // 코드 포맷팅 (세미콜론 등)
        'refactor', // 코드 리팩토링
        'perf', // 성능 개선
        'test', // 테스트 추가/수정
        'build', // 빌드 시스템 변경
        'ci', // CI 설정 변경
        'chore', // 기타 변경
        'revert', // 커밋 되돌리기
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    // 스코프 규칙
    'scope-enum': [
      1,
      'always',
      [
        'frontend',
        'backend',
        'api',
        'ui',
        'auth',
        'db',
        'config',
        'deps',
        'docker',
        'ci',
        'docs',
        'test',
        'monitoring',
        'workflow',
        'agent',
      ],
    ],
    'scope-case': [2, 'always', 'lower-case'],

    // 제목 규칙
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 72],

    // 본문 규칙
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],

    // 푸터 규칙
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 100],

    // 헤더 규칙
    'header-max-length': [2, 'always', 100],
  },

  // 커밋 메시지 도움말
  helpUrl: 'https://www.conventionalcommits.org/',
};
