# 📸 MoodLens AI - 사진 분위기 분석기

Google Gemini API와 Cloudinary를 연동하여 사진의 색상, 조명, 의상, 표정, 구도와 감성 분위기를 분석해 주는 AI 웹 서비스입니다.

---

## ✨ 주요 기능

1. **클라우드 이미지 업로드 (Cloudinary)**
   - 드래그 앤 드롭 및 파일 탐색기/카메라 촬영 지원
   - 20MB 이하의 JPG, PNG, WEBP, HEIC 이미지 자동 압축 및 업로드
   - 안전한 HTTPS CDN URL 생성 및 실시간 복사

2. **Google Gemini API 사진 분위기 분석 (`/api/analyze`)**
   - **보안 강화**: Gemini API 키가 클라이언트(브라우저) 코드에 노출되지 않도록 **Vercel Serverless Function** 서버 측에서 호출
   - **프라이버시 보호**: 인물의 신원이나 개인정보를 추측하지 않고, 사진에서 직접 확인할 수 있는 시각적 요소(색상, 배경, 의상, 표정, 구도, 조명)만을 바탕으로 분석
   - **결과 항목**:
     - 사진을 표현하는 **분위기 키워드 3개**
     - 각 분위기를 재미있게 표현한 **감성 퍼센트 (%)**
     - 사진에 어울리는 **AI 감성 한줄평**
     - SNS에 바로 쓸 수 있는 **해시태그 4개**
     - 사진에서 추출한 **대표 무드 컬러 팔레트 (5색)**

3. **직관적인 UX**
   - 분석 중에는 `AI가 사진을 분석하고 있습니다.` 안내 메시지와 로딩 인디케이터 제공
   - 분석 완료 시 세련된 리포트 카드 화면으로 자동 전환

---

## 🚀 Vercel 배포 및 환경 변수(`GEMINI_API_KEY`) 설정 방법

본 프로젝트는 Vercel Serverless Function을 사용하므로, Gemini API 키를 코드에 직접 작성하지 않고 Vercel의 환경 변수에 등록해야 안전하게 동작합니다.

### 1. Google Gemini API 키 발급받기
1. [Google AI Studio](https://aistudio.google.com/)에 접속하여 로그인합니다.
2. **Get API key** 버튼을 클릭하여 새 API 키를 생성하고 복사합니다.

### 2. Vercel 프로젝트에 환경 변수 등록하기
1. [Vercel 대시보드](https://vercel.com/)로 이동합니다.
2. 배포할 프로젝트를 선택합니다. (GitHub 저장소를 연결하여 배포)
3. 상단 메뉴의 **Settings** 탭을 클릭합니다.
4. 왼쪽 사이드바에서 **Environment Variables**를 클릭합니다.
5. 아래와 같이 입력하고 **Save**를 누릅니다.
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `발급받은_Gemini_API_키`
   - **Environments**: `Production`, `Preview`, `Development` 모두 체크
6. 환경 변수를 등록한 후, **Deployments** 탭에서 최신 배포를 **Redeploy** 하거나 새로 커밋/푸시하여 재배포하면 즉시 활성화됩니다!

---

## 📁 프로젝트 구조

```text
├── api/
│   └── analyze.js       # Vercel Serverless Function (Gemini API 호출 및 비전 분석)
├── .env.example         # 환경 변수 설정 템플릿
├── vercel.json          # Vercel 배포 및 라우팅 설정
├── package.json         # 프로젝트 설정
├── index.html           # 프론트엔드 UI 마크업
├── script.js            # 업로드 처리 및 Gemini API 통신 로직
├── style.css            # 반응형 디자인 및 애니메이션 스타일
└── README.md            # 프로젝트 안내 문서
```

