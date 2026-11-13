// Cloudinary 설정 정보
const CLOUDINARY_CONFIG = {
  cloudName: "lb7zbvo5",
  uploadPreset: "ai-photo",
  uploadUrl: "https://api.cloudinary.com/v1_1/lb7zbvo5/image/upload"
};

// Lucide 아이콘 초기화 함수
function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// HTML 이스케이프 헬퍼
function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

// 전역에서 접근 가능한 업로드 이미지 URL
window.uploadedImageUrl = null;
window.getUploadedImageUrl = () => window.uploadedImageUrl;

document.addEventListener("DOMContentLoaded", () => {
  initIcons();

  // 섹션 참조
  const uploadCard = document.getElementById("uploadCard");
  const analysisCard = document.getElementById("analysisCard");

  // 업로드 드롭존 및 미리보기 요소
  const dropArea = document.getElementById("dropArea");
  const fileInput = document.getElementById("fileInput");
  const uploadPrompt = document.getElementById("uploadPrompt");
  const previewContainer = document.getElementById("previewContainer");
  const previewImage = document.getElementById("previewImage");
  const fileName = document.getElementById("fileName");
  const fileSize = document.getElementById("fileSize");
  const btnRemove = document.getElementById("btnRemove");
  const btnReselect = document.getElementById("btnReselect");

  // Cloudinary 업로드 상태 요소
  const cloudinaryStatus = document.getElementById("cloudinaryStatus");
  const uploadSpinner = document.getElementById("uploadSpinner");
  const uploadSuccessIcon = document.getElementById("uploadSuccessIcon");
  const uploadErrorIcon = document.getElementById("uploadErrorIcon");
  const uploadStatusText = document.getElementById("uploadStatusText");
  const cloudinaryUrlBox = document.getElementById("cloudinaryUrlBox");
  const cloudinaryUrlInput = document.getElementById("cloudinaryUrlInput");
  const btnCopyUrl = document.getElementById("btnCopyUrl");
  const copyBtnText = document.getElementById("copyBtnText");

  // 분석 진행 중 안내 배너 및 액션 버튼 요소
  const analyzingBanner = document.getElementById("analyzingBanner");
  const btnAnalyze = document.getElementById("btnAnalyze");
  const analyzeBtnIcon = document.getElementById("analyzeBtnIcon");
  const analyzeBtnSpinner = document.getElementById("analyzeBtnSpinner");
  const analyzeBtnText = document.getElementById("analyzeBtnText");
  const actionTip = document.getElementById("actionTip");
  const errorMsg = document.getElementById("errorMsg");
  const errorText = document.getElementById("errorText");

  // 분석 결과 섹션 요소
  const analysisImage = document.getElementById("analysisImage");
  const analysisUrlText = document.getElementById("analysisUrlText");
  const btnOpenUrl = document.getElementById("btnOpenUrl");
  const btnCopyAnalysisUrl = document.getElementById("btnCopyAnalysisUrl");
  const copyAnalysisBtnText = document.getElementById("copyAnalysisBtnText");
  const btnResetAll = document.getElementById("btnResetAll");

  // AI 분석 결과 동적 요소
  const aiOneLineReview = document.getElementById("aiOneLineReview");
  const keywordsList = document.getElementById("keywordsList");
  const hashtagsList = document.getElementById("hashtagsList");
  const colorPaletteBars = document.getElementById("colorPaletteBars");

  // 토스트 요소
  const toast = document.getElementById("toast");
  const toastIcon = document.getElementById("toastIcon");
  const toastTitle = document.getElementById("toastTitle");
  const toastMessage = document.getElementById("toastMessage");
  let toastTimer = null;

  // 상태 관리 변수
  let currentFile = null;
  let isUploading = false;
  let isAnalyzing = false;
  let activeAbortController = null;

  // 최대 허용 용량 (20MB)
  const MAX_FILE_SIZE = 20 * 1024 * 1024;

  // 파일 크기 포맷터
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  // 에러 메시지 표시
  function showError(message) {
    errorText.textContent = message;
    errorMsg.classList.remove("hidden");
    initIcons();
  }

  // 에러 메시지 숨김
  function clearError() {
    errorMsg.classList.add("hidden");
  }

  // 토스트 팝업 표시
  function showToast(title, message, icon = "🎉") {
    if (toastTimer) clearTimeout(toastTimer);

    toastIcon.textContent = icon;
    toastTitle.textContent = title;
    toastMessage.textContent = message;

    toast.classList.remove("hidden", "toast-hide");

    toastTimer = setTimeout(() => {
      toast.classList.add("toast-hide");
      setTimeout(() => {
        toast.classList.add("hidden");
        toast.classList.remove("toast-hide");
      }, 300);
    }, 3500);
  }

  // 클립보드 복사 함수
  async function copyToClipboard(text, btnTextElement) {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      if (btnTextElement) {
        const originalText = btnTextElement.textContent;
        btnTextElement.textContent = "복사됨!";
        setTimeout(() => {
          btnTextElement.textContent = originalText;
        }, 2000);
      }
      showToast("복사 완료", "Cloudinary 이미지 URL이 클립보드에 복사되었습니다.", "📋");
    } catch (err) {
      showToast("복사 실패", "URL을 직접 선택하여 복사해 주세요.", "⚠️");
    }
  }

  // Cloudinary 이미지 업로드 함수
  async function uploadToCloudinary(file) {
    if (!file) return;

    if (activeAbortController) {
      activeAbortController.abort();
    }
    activeAbortController = new AbortController();

    isUploading = true;
    window.uploadedImageUrl = null;

    // UI 상태 반영 (업로드 중)
    cloudinaryStatus.classList.remove("hidden", "success", "error");
    cloudinaryStatus.classList.add("uploading");
    uploadSpinner.classList.remove("hidden");
    uploadSuccessIcon.classList.add("hidden");
    uploadErrorIcon.classList.add("hidden");
    uploadStatusText.textContent = "이미지를 업로드하고 있습니다.";
    cloudinaryUrlBox.classList.add("hidden");
    cloudinaryUrlInput.value = "";

    btnAnalyze.disabled = true;
    analyzeBtnIcon.classList.add("hidden");
    analyzeBtnSpinner.classList.remove("hidden");
    analyzeBtnText.textContent = "이미지를 업로드하고 있습니다...";
    actionTip.textContent = "⏳ 이미지를 업로드하고 있습니다. 잠시만 기다려 주세요...";
    actionTip.style.color = "#6366f1";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

    try {
      const response = await fetch(CLOUDINARY_CONFIG.uploadUrl, {
        method: "POST",
        body: formData,
        signal: activeAbortController.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `업로드 실패 (HTTP ${response.status})`);
      }

      const data = await response.json();
      const imageUrl = data.secure_url || data.url;

      if (!imageUrl) {
        throw new Error("반환된 이미지 URL을 찾을 수 없습니다.");
      }

      window.uploadedImageUrl = imageUrl;
      isUploading = false;

      // UI 상태 반영 (업로드 성공)
      cloudinaryStatus.classList.remove("uploading", "error");
      cloudinaryStatus.classList.add("success");
      uploadSpinner.classList.add("hidden");
      uploadSuccessIcon.classList.remove("hidden");
      uploadStatusText.textContent = "이미지 업로드 완료!";
      cloudinaryUrlBox.classList.remove("hidden");
      cloudinaryUrlInput.value = imageUrl;

      // 버튼 활성화
      btnAnalyze.disabled = false;
      analyzeBtnSpinner.classList.add("hidden");
      analyzeBtnIcon.classList.remove("hidden");
      analyzeBtnText.textContent = "AI로 분위기 분석하기";
      actionTip.textContent = "✨ 업로드가 완료되었습니다! 버튼을 눌러 Gemini AI 분석을 시작하세요.";
      actionTip.style.color = "#10b981";

      initIcons();
      showToast("업로드 완료!", "Cloudinary에 사진이 성공적으로 업로드되었습니다.", "☁️");

      return imageUrl;
    } catch (error) {
      if (error.name === "AbortError") {
        return null;
      }

      console.error("Cloudinary 업로드 에러:", error);
      isUploading = false;

      cloudinaryStatus.classList.remove("uploading", "success");
      cloudinaryStatus.classList.add("error");
      uploadSpinner.classList.add("hidden");
      uploadErrorIcon.classList.remove("hidden");
      uploadStatusText.textContent = "업로드 실패: 다시 시도해 주세요.";

      btnAnalyze.disabled = true;
      analyzeBtnSpinner.classList.add("hidden");
      analyzeBtnIcon.classList.remove("hidden");
      analyzeBtnText.textContent = "AI로 분위기 분석하기";
      actionTip.textContent = "⚠️ 이미지 업로드 중 문제가 발생했습니다.";
      actionTip.style.color = "#ef4444";

      showError(`Cloudinary 업로드 실패: ${error.message}`);
      initIcons();
      return null;
    }
  }

  // 이미지 파일 처리 및 미리보기 + 업로드 시작
  function handleFile(file) {
    clearError();

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("이미지 파일(JPG, PNG, WEBP 등)만 업로드할 수 있어요.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showError("파일 용량이 너무 큽니다. 20MB 이하의 이미지를 선택해 주세요.");
      return;
    }

    currentFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      fileName.textContent = file.name;
      fileSize.textContent = formatBytes(file.size);

      uploadPrompt.classList.add("hidden");
      previewContainer.classList.remove("hidden");
      dropArea.classList.add("has-image");

      initIcons();
      uploadToCloudinary(file);
    };

    reader.onerror = () => {
      showError("사진을 읽는 중 문제가 발생했습니다. 다시 시도해 주세요.");
    };

    reader.readAsDataURL(file);
  }

  // 상태 초기화 (사진 삭제)
  function resetUpload() {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }

    currentFile = null;
    isUploading = false;
    isAnalyzing = false;
    window.uploadedImageUrl = null;

    fileInput.value = "";
    previewImage.src = "";
    fileName.textContent = "";
    fileSize.textContent = "";

    previewContainer.classList.add("hidden");
    uploadPrompt.classList.remove("hidden");
    dropArea.classList.remove("has-image");

    cloudinaryStatus.classList.add("hidden");
    cloudinaryUrlBox.classList.add("hidden");
    cloudinaryUrlInput.value = "";

    analyzingBanner.classList.add("hidden");
    btnAnalyze.disabled = true;
    analyzeBtnSpinner.classList.add("hidden");
    analyzeBtnIcon.classList.remove("hidden");
    analyzeBtnText.textContent = "AI로 분위기 분석하기";
    actionTip.textContent = "👉 먼저 분석하고 싶은 사진을 선택해 주세요!";
    actionTip.style.color = "";

    clearError();
    initIcons();
  }

  // 분석 결과 렌더링 함수
  function renderAnalysisResult(data) {
    if (!data) return;

    // 분석 카드 상단 이미지 및 URL 연동
    analysisImage.src = window.uploadedImageUrl;
    analysisUrlText.value = window.uploadedImageUrl;
    btnOpenUrl.href = window.uploadedImageUrl;

    // 1. AI 한줄평 렌더링
    if (data.oneLineReview && aiOneLineReview) {
      aiOneLineReview.textContent = `"${data.oneLineReview}"`;
    }

    // 2. 분위기 키워드 TOP 3 렌더링
    if (keywordsList && Array.isArray(data.keywords)) {
      keywordsList.innerHTML = "";
      const topKeywords = data.keywords.slice(0, 3);

      topKeywords.forEach((kw, index) => {
        const item = document.createElement("div");
        item.className = "keyword-item";

        const percent = Math.min(100, Math.max(1, parseInt(kw.percent, 10) || 50));
        const rankClass = index === 0 ? "rank-1" : "";

        item.innerHTML = `
          <div class="keyword-header">
            <div class="keyword-rank-title">
              <span class="keyword-rank-badge ${rankClass}">TOP ${index + 1}</span>
              <span class="keyword-name">${escapeHtml(kw.name || "분위기")}</span>
            </div>
            <span class="keyword-percent-pill">${percent}%</span>
          </div>
          <div class="keyword-bar-track">
            <div class="keyword-bar-fill" style="width: 0%;"></div>
          </div>
          ${kw.desc ? `<p class="keyword-desc">${escapeHtml(kw.desc)}</p>` : ""}
        `;

        keywordsList.appendChild(item);

        // 부드러운 게이지 채움 애니메이션
        setTimeout(() => {
          const fill = item.querySelector(".keyword-bar-fill");
          if (fill) fill.style.width = `${percent}%`;
        }, 120 * (index + 1));
      });
    }

    // 3. 어울리는 해시태그 4개 렌더링
    if (hashtagsList && Array.isArray(data.hashtags)) {
      hashtagsList.innerHTML = "";
      const tags = data.hashtags.slice(0, 4);

      tags.forEach((tag) => {
        const pill = document.createElement("span");
        pill.className = "tag-pill";
        const cleanTag = tag.startsWith("#") ? tag : `#${tag}`;
        pill.textContent = cleanTag;
        hashtagsList.appendChild(pill);
      });
    }

    // 4. 분위기 컬러 팔레트 렌더링
    if (colorPaletteBars) {
      colorPaletteBars.innerHTML = "";
      const colors =
        Array.isArray(data.colors) && data.colors.length > 0
          ? data.colors.slice(0, 5)
          : ["#E8D5C4", "#F4A261", "#E76F51", "#2A9D8F", "#264653"];

      colors.forEach((hex) => {
        const swatch = document.createElement("div");
        swatch.className = "color-swatch";
        swatch.style.background = hex;
        swatch.title = hex;
        colorPaletteBars.appendChild(swatch);
      });
    }

    // 업로드 카드 숨기고 분석 결과 카드 표시
    uploadCard.classList.add("hidden");
    analysisCard.classList.remove("hidden");

    initIcons();

    window.scrollTo({
      top: analysisCard.offsetTop - 20,
      behavior: "smooth"
    });
  }

  // Google Gemini API 호출을 통한 사진 분석 실행
  async function analyzePhotoWithGemini() {
    if (!window.uploadedImageUrl) {
      showError("업로드된 이미지 URL이 없습니다. 사진을 먼저 업로드해 주세요.");
      return;
    }

    if (isAnalyzing || isUploading) return;

    isAnalyzing = true;
    clearError();

    // 분석 중 UI 활성화: 'AI가 사진을 분석하고 있습니다.' 노출
    analyzingBanner.classList.remove("hidden");
    btnAnalyze.disabled = true;
    analyzeBtnIcon.classList.add("hidden");
    analyzeBtnSpinner.classList.remove("hidden");
    analyzeBtnText.textContent = "AI가 사진을 분석하고 있습니다...";
    actionTip.textContent = "🎨 AI가 사진을 분석하고 있습니다. 잠시만 기다려 주세요...";
    actionTip.style.color = "#7c3aed";

    try {
      // 서버 측 Vercel Serverless Function 호출 (API Key 보호)
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageUrl: window.uploadedImageUrl
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        if (response.status === 405) {
          const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
          if (isLocal) {
            throw new Error(
              "현재 로컬 정적 서버(VS Code Live Server 등)에서 실행 중입니다. Live Server는 서버리스 함수(POST API)를 지원하지 않아 405 오류가 발생합니다. Vercel에 배포된 사이트 주소에서 테스트하시거나, 로컬에서는 Vercel CLI('npx vercel dev')를 사용해 주세요."
            );
          } else {
            throw new Error(
              "서버리스 엔드포인트에서 405 Method Not Allowed 오류가 발생했습니다. Vercel 배포가 완료되었는지 확인해 주세요."
            );
          }
        }
        throw new Error(result.error || `분석 실패 (HTTP ${response.status})`);
      }

      // 결과 화면으로 전환
      renderAnalysisResult(result.data);

      showToast(
        "분석 완료! ✨",
        "Gemini AI가 사진 분위기 분석을 완료했습니다.",
        "🎨"
      );
    } catch (error) {
      console.error("Gemini 분석 요청 실패:", error);
      showError(`AI 분석 실패: ${error.message}`);
      showToast("분석 오류", error.message, "⚠️");
    } finally {
      isAnalyzing = false;
      analyzingBanner.classList.add("hidden");
      btnAnalyze.disabled = false;
      analyzeBtnSpinner.classList.add("hidden");
      analyzeBtnIcon.classList.remove("hidden");
      analyzeBtnText.textContent = "AI로 분위기 분석하기";
      actionTip.textContent = "✨ 언제든 다시 분석할 수 있습니다.";
      actionTip.style.color = "#10b981";
      initIcons();
    }
  }

  // 전체 화면 리셋 (분석 카드에서 다시 돌아가기)
  function returnToUpload() {
    analysisCard.classList.add("hidden");
    uploadCard.classList.remove("hidden");
    resetUpload();
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  // 1. 파일 선택 이벤트 (PC 탐색기 / 모바일 앨범 및 카메라)
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      handleFile(file);
    }
  });

  // 2. 다른 사진 선택 버튼
  btnReselect.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  // 3. 삭제 버튼
  btnRemove.addEventListener("click", (e) => {
    e.stopPropagation();
    resetUpload();
    showToast("초기화 완료", "사진이 제거되었습니다.", "🗑️");
  });

  // 4. Cloudinary URL 복사 버튼 (미리보기 영역)
  btnCopyUrl.addEventListener("click", (e) => {
    e.stopPropagation();
    copyToClipboard(cloudinaryUrlInput.value, copyBtnText);
  });

  // 5. Cloudinary URL 복사 버튼 (분석 결과 영역)
  btnCopyAnalysisUrl.addEventListener("click", (e) => {
    e.stopPropagation();
    copyToClipboard(analysisUrlText.value, copyAnalysisBtnText);
  });

  // 6. 드래그 앤 드롭 이벤트
  ["dragenter", "dragover"].forEach((eventName) => {
    dropArea.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dropArea.classList.contains("has-image")) {
          dropArea.classList.add("dragover");
        }
      },
      false
    );
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove("dragover");
      },
      false
    );
  });

  dropArea.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const file = dt.files && dt.files[0];
    if (file) {
      handleFile(file);
    }
  });

  // 7. 'AI로 분석하기' 버튼 클릭 이벤트 (Gemini AI 분석 호출)
  btnAnalyze.addEventListener("click", () => {
    if (btnAnalyze.disabled || isUploading || isAnalyzing) return;
    analyzePhotoWithGemini();
  });

  // 8. 분석 화면에서 '다른 사진으로 다시 분석하기' 버튼 클릭 이벤트
  btnResetAll.addEventListener("click", () => {
    returnToUpload();
  });
});

