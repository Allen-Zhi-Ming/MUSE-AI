import React, { useState, useRef, useEffect } from "react";
import { Btn } from "../Common";

interface CoverBannerProps {
  state: any;
  dispatch: any;
  parentHub: string;
  isMobile: boolean;
  theme: any;
}

const PRESET_COVERS = [
  { name: "奶黃奶油", val: "linear-gradient(135deg, #FEF3C7, #FDE68A)" },
  { name: "柔粉莫蘭", val: "linear-gradient(135deg, #FBCFE8, #FDA4AF)" },
  { name: "冰藍之境", val: "linear-gradient(135deg, #DBEAFE, #93C5FD)" },
  { name: "薄荷微風", val: "linear-gradient(135deg, #D1FAE5, #6EE7B7)" },
  { name: "丁香晚霞", val: "linear-gradient(135deg, #E9D5FF, #C084FC)" },
  { name: "秋木暖褐", val: "linear-gradient(135deg, #EDECE4, #C3B59F)" },
  { name: "翡翠冷翠", val: "linear-gradient(135deg, #E0F2FE, #7DD3FC)" },
  { name: "日落熔金", val: "linear-gradient(135deg, #FFEDD5, #FDBA74)" }
];

export function CoverBanner({ state, dispatch, parentHub, isMobile, theme: T }: CoverBannerProps) {
  // Canvas and Crop State
  const [avatarHover, setAvatarHover] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState<"avatar" | "cover">("avatar");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "avatar" | "cover") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCropTarget(target);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  useEffect(() => {
    if (!cropModalOpen || !imageSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      const cropSize = cropTarget === "avatar" ? 150 : 280;
      const cropAreaHeight = cropTarget === "avatar" ? 150 : 120;

      const scale = Math.max(cropSize / img.width, cropAreaHeight / img.height) * cropZoom;
      const w = img.width * scale;
      const h = img.height * scale;

      const x = cx - w / 2 + cropOffset.x;
      const y = cy - h / 2 + cropOffset.y;

      ctx.drawImage(img, x, y, w, h);

      // 半透明背景遮罩
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      
      if (cropTarget === "avatar") {
        ctx.arc(cx, cy, cropSize / 2, 0, Math.PI * 2, true);
      } else {
        ctx.rect(cx - cropSize / 2, cy - cropAreaHeight / 2, cropSize, cropAreaHeight);
      }
      ctx.fill("evenodd");

      // 輔助框線
      ctx.strokeStyle = "#C5A059";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (cropTarget === "avatar") {
        ctx.arc(cx, cy, cropSize / 2, 0, Math.PI * 2);
      } else {
        ctx.rect(cx - cropSize / 2, cy - cropAreaHeight / 2, cropSize, cropAreaHeight);
      }
      ctx.stroke();
      ctx.restore();
    };
    img.src = imageSrc;
  }, [cropModalOpen, imageSrc, cropZoom, cropOffset, cropTarget]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setCropOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - cropOffset.x, y: touch.clientY - cropOffset.y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setCropOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setCropZoom(prev => Math.min(Math.max(prev + delta, 1), 3));
  };

  const handleCropSave = () => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      const cropWidth = cropTarget === "avatar" ? 200 : 800;
      const cropHeight = cropTarget === "avatar" ? 200 : 300;

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = cropWidth;
      exportCanvas.height = cropHeight;
      const exportCtx = exportCanvas.getContext("2d");
      if (!exportCtx) return;

      const canvasWidth = 360;
      const canvasHeight = 240;
      const cx = canvasWidth / 2;
      const cy = canvasHeight / 2;

      const cropSize = cropTarget === "avatar" ? 150 : 280;
      const cropAreaHeight = cropTarget === "avatar" ? 150 : 120;

      const scale = Math.max(cropSize / img.width, cropAreaHeight / img.height) * cropZoom;
      const w = img.width * scale;
      const h = img.height * scale;

      const imgX = cx - w / 2 + cropOffset.x;
      const imgY = cy - h / 2 + cropOffset.y;

      const cropX = cx - cropSize / 2;
      const cropY = cy - cropAreaHeight / 2;

      const relX = cropX - imgX;
      const relY = cropY - imgY;

      const origCropX = relX / scale;
      const origCropY = relY / scale;
      const origCropW = cropSize / scale;
      const origCropH = cropAreaHeight / scale;

      exportCtx.drawImage(
        img,
        origCropX,
        origCropY,
        origCropW,
        origCropH,
        0,
        0,
        cropWidth,
        cropHeight
      );

      const base64 = exportCanvas.toDataURL("image/jpeg", 0.9);
      
      if (cropTarget === "avatar") {
        dispatch({
          type: "UPDATE_PROFILE",
          profile: { avatar: base64 }
        });
      } else {
        dispatch({
          type: "UPDATE_PROFILE",
          profile: { cover: base64, coverType: "image" }
        });
      }

      setCropModalOpen(false);
    };
    img.src = imageSrc;
  };

  // Only show cover banner for workspace and persona
  if (parentHub !== "workspace_hub" && parentHub !== "my_persona") return null;
  if (state.hideHomeCover) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {/* Cover Banner */}
      <div style={{ 
        background: (state.userProfile.coverType === "image" && state.userProfile.cover) ? `url(${state.userProfile.cover})` : (state.userProfile.coverColor || "linear-gradient(135deg, #FEF3C7, #FDE68A)"),
        backgroundSize: "cover",
        backgroundPosition: "center",
        height: isMobile ? 100 : 130, 
        position: "relative", 
        overflow: "hidden",
        transition: "background 0.3s ease"
      }}>
        {/* Hidden File Inputs */}
        <input type="file" ref={avatarInputRef} onChange={(e) => handleFileChange(e, "avatar")} accept="image/*" style={{ display: "none" }} />
        <input type="file" ref={coverInputRef} onChange={(e) => handleFileChange(e, "cover")} accept="image/*" style={{ display: "none" }} />

        {/* 封面自訂面板 */}
        <div style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 2,
          background: "rgba(255, 255, 255, 0.65)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          borderRadius: 12,
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          transform: isMobile ? "scale(0.85)" : "none",
          transformOrigin: "top right"
        }}>
          <button
            onClick={() => coverInputRef.current?.click()}
            style={{ border: "none", background: "rgba(255, 255, 255, 0.6)", padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, color: T.textMid, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.6)"; e.currentTarget.style.transform = "none"; }}
          >
            🌄 上傳封面
          </button>
          
          <div style={{ width: 1, height: 14, background: "rgba(0,0,0,0.1)" }} />
          
          <div style={{ display: "flex", gap: 4 }}>
            {PRESET_COVERS.map(colorObj => {
              const isSelected = state.userProfile.coverType === "color" && state.userProfile.coverColor === colorObj.val;
              return (
                <button
                  key={colorObj.name}
                  onClick={() => dispatch({ type: "UPDATE_PROFILE", profile: { coverType: "color", coverColor: colorObj.val } })}
                  title={colorObj.name}
                  style={{ width: 14, height: 14, borderRadius: "50%", background: colorObj.val, border: isSelected ? `2px solid ${T.text}` : "1.5px solid rgba(255, 255, 255, 0.85)", cursor: "pointer", padding: 0, boxShadow: isSelected ? "0 0 0 2px rgba(255,255,255,0.95), 0 3px 8px rgba(0,0,0,0.25)" : "0 1px 3px rgba(0,0,0,0.08)", transform: isSelected ? "scale(1.15)" : "none", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.25)"}
                  onMouseLeave={e => e.currentTarget.style.transform = isSelected ? "scale(1.15)" : "none"}
                />
              );
            })}
          </div>
        </div>

        {state.userProfile.coverType !== "image" && (
          <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.2)", filter: "blur(40px)" }} />
        )}
      </div>

      {/* Profile info */}
      <div style={{
        padding: isMobile ? "0 16px 12px 16px" : "0 24px 14px 24px",
        background: "linear-gradient(180deg, #FAF8F5 0%, #FFFDFB 100%)",
        display: "flex",
        alignItems: "flex-end",
        gap: 16,
        position: "relative",
        borderBottom: `0.5px solid rgba(220, 215, 206, 0.4)`
      }}>
        <div 
          onClick={() => avatarInputRef.current?.click()}
          onMouseEnter={() => setAvatarHover(true)}
          onMouseLeave={() => setAvatarHover(false)}
          style={{ 
            width: isMobile ? 64 : 80, height: isMobile ? 64 : 80, 
            borderRadius: "50%", background: state.userProfile.avatar.startsWith("data:image/") ? "#fff" : "linear-gradient(135deg, #C5A059, #8A6E3E)", 
            border: "3px solid #FAF9F6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", 
            fontSize: isMobile ? 22 : 28, fontWeight: 700, boxShadow: "0 8px 20px rgba(138, 110, 62, 0.12)", 
            zIndex: 1, marginTop: isMobile ? -32 : -40, position: "relative", cursor: "pointer", overflow: "hidden"
          }}
        >
          {state.userProfile.avatar.startsWith("data:image/") ? (
            <img src={state.userProfile.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            state.userProfile.avatar
          )}
          
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", opacity: avatarHover ? 1 : 0, transition: "opacity 0.2s ease", zIndex: 2 }}>
            <span style={{ fontSize: isMobile ? 14 : 18, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>📷</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 4 }}>
          <h2 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: T.text, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            {state.userProfile.name}
            <span style={{ fontSize: 9.5, fontWeight: 500, color: "#92400E", background: "#FEF3C7", padding: "1.5px 6px", borderRadius: 10 }}>個人</span>
          </h2>
          <p style={{ fontSize: isMobile ? 11 : 12, color: T.textGhost, margin: 0 }}>{state.userProfile.bio}</p>
        </div>
      </div>

      {/* Embedded Global Canvas Crop Modal */}
      {cropModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                ✂️ 裁剪您的{cropTarget === "avatar" ? "個人頭像" : "背景封面"}
              </div>
              <button onClick={() => setCropModalOpen(false)} style={{ border: "none", background: "transparent", fontSize: 16, cursor: "pointer", color: T.textGhost }}>✕</button>
            </div>
            
            <div style={{ fontSize: 11, color: T.textGhost, lineHeight: 1.4 }}>
              請在下方畫布上按住滑鼠左鍵「拖曳」相片調整位置，並使用「縮放拉桿」調整裁剪比例。
            </div>

            <div style={{ background: "#FAF9F6", borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", position: "relative", height: 240 }}>
              <canvas
                ref={canvasRef}
                width={360}
                height={240}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleCanvasWheel}
                style={{ cursor: isDragging ? "grabbing" : "grab", display: "block" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textMid }}>
                <span>🔍 縮放比例</span>
                <span>{Math.round(cropZoom * 100)}%</span>
              </div>
              <input type="range" min="1" max="3" step="0.05" value={cropZoom} onChange={(e) => setCropZoom(parseFloat(e.target.value))} style={{ width: "100%", accentColor: T.gold, cursor: "pointer" }} />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={() => setCropModalOpen(false)} style={{ border: "none", background: "transparent", fontSize: 12, color: T.textGhost, cursor: "pointer", padding: "6px 12px" }}>取消</button>
              <Btn onClick={handleCropSave} gold style={{ padding: "6px 20px", fontSize: 11 }}>✨ 保存裁剪</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
