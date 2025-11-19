# GitHub Wiki 배포 방법

이 디렉토리(`wiki_content`)에 생성된 파일들을 GitHub Wiki에 배포하는 방법입니다.

## 1. GitHub Wiki 저장소 클론

GitHub 저장소의 Wiki는 별도의 Git 저장소로 관리됩니다.
프로젝트 저장소 URL 뒤에 `.wiki.git`을 붙이면 Wiki 저장소 주소가 됩니다.

```bash
# 예시: https://github.com/username/gonsai2.wiki.git
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.wiki.git my-wiki
```

## 2. 파일 복사

생성된 위키 콘텐츠를 클론한 디렉토리로 복사합니다.

```bash
cp -r wiki_content/* my-wiki/
```

## 3. 변경 사항 커밋 및 푸시

```bash
cd my-wiki
git add .
git commit -m "docs: update user manual"
git push origin master
```

## 4. 확인

GitHub 저장소의 **Wiki** 탭에서 배포된 문서를 확인하세요.
